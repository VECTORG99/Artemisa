import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCreatorCatalog } from '../src/creator/catalog.js';
import { creatorQuestions, evaluateDecisionTree, WORKFLOW_VERSION } from '../src/creator/decisionTree.js';
import { CREATOR_PRESETS } from '../frontend/src/features/creator/presets/presets.ts';
import {
  SHORT_FLOW_QUESTION_IDS,
  buildShortFlowDefaults,
} from '../frontend/src/features/creator/presets/short-flow.ts';

/**
 * Contract test between the frontend's hardcoded Creator data (Presets and
 * Auto-corto modes) and the backend decision tree.
 *
 * The frontend ships complete answer sets as plain data. Nothing else
 * guarantees they stay valid: renaming a question id, flipping a
 * `required` flag or adding a `visibleWhen` branch in
 * src/creator/decisionTree.ts silently breaks the UI without breaking any
 * backend test. This file is that guard.
 */

const questionsById = new Map(creatorQuestions.map((question) => [question.id, question]));

/** Environment values the decision tree branches on. */
const ENVIRONMENTS = ['development', 'production', 'both'];

/** First catalog item id usable for a catalog-backed question. */
function firstCatalogId(question) {
  for (const category of question.catalogCategories ?? []) {
    const item = getCreatorCatalog({ category }).items[0];
    if (item) return item.id;
  }
  throw new Error(`No catalog item available for question "${question.id}".`);
}

/**
 * Derives a valid answer from the question definition itself, so the test
 * survives option/catalog renames. Only `overrides` are hardcoded.
 */
function minimalAnswerFor(question) {
  switch (question.type) {
    case 'text':
      return `test-${question.id}`.slice(0, 120);
    case 'textarea':
      return `Valor de prueba para ${question.id}.`;
    case 'boolean':
      return false;
    case 'select': {
      const first = question.options?.[0];
      assert.ok(first, `Question "${question.id}" is a select without options.`);
      return first.id;
    }
    case 'multiselect': {
      const first = question.options?.[0];
      assert.ok(first, `Question "${question.id}" is a multiselect without options.`);
      return [first.id];
    }
    case 'catalog-select':
      return firstCatalogId(question);
    case 'catalog-multiselect':
      return [firstCatalogId(question)];
    default:
      throw new Error(`Unsupported question type "${question.type}" for id "${question.id}".`);
  }
}

/** Answers for the Auto-corto subset only, with `overrides` taking precedence. */
function buildShortFlowAnswers(overrides = {}) {
  const answers = {};
  for (const id of SHORT_FLOW_QUESTION_IDS) {
    const question = questionsById.get(id);
    assert.ok(question, `Auto-corto references unknown question id "${id}".`);
    answers[id] = id in overrides ? overrides[id] : minimalAnswerFor(question);
  }
  return answers;
}

/** Recursively collects every string value present in an answers object. */
function answerStrings(answers) {
  const values = [];
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === 'string') values.push([key, value]);
    else if (Array.isArray(value)) for (const item of value) values.push([key, item]);
  }
  return values;
}

function describeIssues(evaluation) {
  return evaluation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' | ');
}

describe('Creator presets contract', () => {
  it('exposes presets for the current workflow version', () => {
    assert.equal(WORKFLOW_VERSION, '1.0.0');
    assert.ok(CREATOR_PRESETS.length > 0, 'CREATOR_PRESETS must not be empty.');
  });

  // Assertion 1: each preset is a complete, valid answer set as shipped.
  it('every preset evaluates as complete without issues', () => {
    for (const preset of CREATOR_PRESETS) {
      const evaluation = evaluateDecisionTree(preset.answers);
      assert.equal(
        evaluation.issues.length,
        0,
        `Preset "${preset.id}" produced invalid answers -> ${describeIssues(evaluation)}`,
      );
      assert.equal(
        evaluation.progress.complete,
        true,
        `Preset "${preset.id}" is incomplete; blocked by question "${evaluation.nextQuestion?.id ?? 'unknown'}" ` +
          `(${evaluation.progress.answered}/${evaluation.progress.total} answered). ` +
          `Add that answer to frontend/src/features/creator/presets/presets.ts.`,
      );
    }
  });

  // Assertion 2: no typos or ids left behind by a backend rename.
  it('every preset answer key is a real question id', () => {
    for (const preset of CREATOR_PRESETS) {
      for (const key of Object.keys(preset.answers)) {
        assert.ok(
          questionsById.has(key),
          `Preset "${preset.id}" answers unknown question id "${key}"; it is not in creatorQuestions.`,
        );
      }
    }
  });

  // Assertion 3: ids and names are used as React keys and user-facing labels.
  it('preset ids and names are unique', () => {
    const ids = CREATOR_PRESETS.map((preset) => preset.id);
    const names = CREATOR_PRESETS.map((preset) => preset.name);
    assert.equal(new Set(ids).size, ids.length, `Duplicated preset id in [${ids.join(', ')}].`);
    assert.equal(new Set(names).size, names.length, `Duplicated preset name in [${names.join(', ')}].`);
  });

  /**
   * Assertion 4: presets must work out of the box, so they only use
   * catalog-backed values. A `custom:<slug>` answer is accepted by the
   * backend but emits an "adapter pendiente" warning, which is not
   * acceptable for a curated, ready-to-copy configuration. If a preset ever
   * legitimately needs one, relax this to assert the evaluation still has
   * no issues and document the reason here.
   */
  it('presets never rely on custom: values', () => {
    for (const preset of CREATOR_PRESETS) {
      for (const [key, value] of answerStrings(preset.answers)) {
        assert.ok(
          !value.startsWith('custom:'),
          `Preset "${preset.id}" uses custom value "${value}" for "${key}"; presets must be adapter-backed.`,
        );
      }
    }
  });

  // Assertion 5: Auto-corto asks a fixed subset, so those questions must
  // always be reachable and meaningful (required, never behind a branch).
  it('short-flow question ids are real, required and unconditionally visible', () => {
    const initiallyVisible = new Set(evaluateDecisionTree({}).visibleQuestions.map((question) => question.id));
    for (const id of SHORT_FLOW_QUESTION_IDS) {
      const question = questionsById.get(id);
      assert.ok(question, `SHORT_FLOW_QUESTION_IDS contains unknown question id "${id}".`);
      assert.equal(question.required, true, `Auto-corto question "${id}" is no longer required: true.`);
      assert.equal(
        question.visibleWhen,
        undefined,
        `Auto-corto question "${id}" gained a visibleWhen condition; Auto-corto could no longer reach it.`,
      );
      assert.ok(initiallyVisible.has(id), `Auto-corto question "${id}" is not visible with empty answers.`);
    }
  });

  // Assertion 6: the curated subset plus its defaults must complete the tree
  // for every environment branch. Values come from creatorQuestions except
  // `environment`, which is the branch under test.
  for (const environment of ENVIRONMENTS) {
    it(`short-flow defaults complete the tree for environment=${environment}`, () => {
      const collected = buildShortFlowAnswers({ environment });
      // Merge order documented in short-flow.ts and used by
      // frontend/src/app/agents/new/page.tsx: defaults first, user answers last.
      const withDefaults = { ...buildShortFlowDefaults(collected), ...collected };
      const evaluation = evaluateDecisionTree(withDefaults);
      assert.equal(
        evaluation.issues.length,
        0,
        `Auto-corto (environment=${environment}) produced invalid answers -> ${describeIssues(evaluation)}`,
      );
      assert.equal(
        evaluation.progress.complete,
        true,
        `Auto-corto (environment=${environment}) is incomplete; blocked by question ` +
          `"${evaluation.nextQuestion?.id ?? 'unknown'}" (${evaluation.progress.answered}/${evaluation.progress.total} answered). ` +
          `Add a default in buildShortFlowDefaults() or the id to SHORT_FLOW_QUESTION_IDS.`,
      );
    });
  }

  // Assertion 7: defaults must never silently replace a user's answer.
  it('short-flow defaults never override an answer the user provided', () => {
    const collected = buildShortFlowAnswers({ environment: 'both' });
    const defaults = buildShortFlowDefaults(collected);
    const defaultKeys = Object.keys(defaults);
    assert.ok(defaultKeys.length > 0, 'buildShortFlowDefaults returned no defaults.');

    // Pick a default key and answer it explicitly with a different valid value.
    const targetId = 'project_stage';
    assert.ok(defaultKeys.includes(targetId), `buildShortFlowDefaults no longer defaults "${targetId}".`);
    const targetQuestion = questionsById.get(targetId);
    assert.ok(targetQuestion, `Question "${targetId}" no longer exists.`);
    const userValue = targetQuestion.options?.find((option) => option.id !== defaults[targetId])?.id;
    assert.ok(userValue, `Question "${targetId}" has no alternative option to test the merge order.`);

    const answered = { ...collected, [targetId]: userValue };
    const withDefaults = { ...buildShortFlowDefaults(answered), ...answered };
    assert.equal(
      withDefaults[targetId],
      userValue,
      `Merge order broken: default "${defaults[targetId]}" overrode the user's "${userValue}" for "${targetId}".`,
    );

    // Every remaining default key must still be filled by the defaults.
    for (const key of defaultKeys) {
      if (key === targetId) continue;
      assert.notEqual(withDefaults[key], undefined, `Default key "${key}" was lost during the merge.`);
    }

    const evaluation = evaluateDecisionTree(withDefaults);
    assert.equal(evaluation.issues.length, 0, `Merged answers are invalid -> ${describeIssues(evaluation)}`);
    assert.equal(evaluation.answers[targetId], userValue, `Backend did not keep the user's "${targetId}" answer.`);
  });
});
