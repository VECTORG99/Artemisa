import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getWorkflowDefinition } from '../src/creator/decisionTree.js';
import {
  localizeQuestion,
  TRANSLATED_QUESTION_IDS,
  TRANSLATED_SECTIONS,
} from '../frontend/src/features/creator/lib/localize-workflow.js';

// Issue #737: the decision tree is defined in Spanish in the backend and the
// frontend translates it by question id. That mapping only stays correct if it
// is checked against the real contract — a question added to the tree without a
// translation would silently render in Spanish for English users.

const workflow = getWorkflowDefinition();

describe('creator workflow English translations (issue #737)', () => {
  it('covers every question of the tree, with no extra ids', () => {
    assert.deepEqual([...TRANSLATED_QUESTION_IDS].sort(), workflow.questions.map((question) => question.id).sort());
  });

  it('covers every section name of the tree', () => {
    const sections = [...new Set(workflow.questions.map((question) => question.section))].sort();
    assert.deepEqual([...TRANSLATED_SECTIONS].sort(), sections);
  });

  it('translates prompt and description of every question', () => {
    for (const question of workflow.questions) {
      const localized = localizeQuestion(question, 'en');
      assert.notEqual(localized.prompt, question.prompt, `${question.id}: prompt not translated`);
      if (question.description) {
        assert.notEqual(localized.description, question.description, `${question.id}: description not translated`);
      }
      assert.ok(localized.description && localized.description.length > 0, `${question.id}: empty description`);
    }
  });

  it('translates the placeholder when the question has one', () => {
    for (const question of workflow.questions.filter((item) => item.placeholder)) {
      const localized = localizeQuestion(question, 'en');
      assert.notEqual(localized.placeholder, question.placeholder, `${question.id}: placeholder not translated`);
    }
  });

  it('leaves the Spanish contract untouched', () => {
    for (const question of workflow.questions) {
      assert.equal(localizeQuestion(question, 'es'), question);
    }
  });
});
