import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { generateAgentBundle } from '../src/creator/generator.ts';
import { developmentAnswers, productionAnswers } from './creatorFixture.mjs';

// Generated huascar/*.json artifacts are loaded by the runtime against these
// schemas. src/kiro/hooks.ts fails closed on an invalid security policy, so a
// generator/schema mismatch silently blocks every tool instead of erroring
// loudly — that regression shipped once (issue #379) precisely because nothing
// validated generator output against the runtime's own schemas.
const ARTIFACT_SCHEMAS = {
  'huascar/security-policy.json': 'security-policy.schema.json',
  'huascar/mcps.json': 'mcps.schema.json',
  'huascar/steering.json': 'steering.schema.json',
  'huascar/rag.json': 'rag.schema.json',
};

function readSchema(schemaFile) {
  return JSON.parse(fs.readFileSync(path.resolve('src/kiro/schemas', schemaFile), 'utf8'));
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

/** Minimal JSON Schema validator, mirroring test/kiro-schema.test.mjs. */
function validate(schema, value, at = '$') {
  const errors = [];
  const actual = typeOf(value);

  if (schema.type && actual !== schema.type) return [`${at} expected ${schema.type}, got ${actual}`];
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at} must be one of ${schema.enum.join(', ')}`);
  if (schema.type !== 'object' && schema.type !== 'array') return errors;

  if (schema.type === 'array') {
    value.forEach((item, index) => errors.push(...validate(schema.items ?? {}, item, `${at}[${index}]`)));
    return errors;
  }

  for (const key of schema.required ?? []) {
    if (!Object.hasOwn(value, key)) errors.push(`${at}.${key} is required`);
  }

  for (const [key, child] of Object.entries(value)) {
    const childSchema =
      schema.properties?.[key] ??
      (schema.additionalProperties && schema.additionalProperties !== true ? schema.additionalProperties : null);
    if (!childSchema) {
      if (schema.additionalProperties === false) errors.push(`${at}.${key} is not allowed`);
      continue;
    }
    errors.push(...validate(childSchema, child, `${at}.${key}`));
  }

  return errors;
}

function artifactsByPath(bundle) {
  return new Map(bundle.artifacts.map((artifact) => [artifact.path, artifact]));
}

describe('Generated artifacts validate against runtime Kiro schemas (#379)', () => {
  for (const [label, answers] of [
    ['development answers', developmentAnswers],
    ['production answers', productionAnswers],
  ]) {
    it(`produces schema-valid huascar/*.json for ${label}`, () => {
      const bundle = generateAgentBundle(answers);
      const artifacts = artifactsByPath(bundle);

      let validated = 0;
      for (const [artifactPath, schemaFile] of Object.entries(ARTIFACT_SCHEMAS)) {
        const artifact = artifacts.get(artifactPath);
        if (!artifact) continue; // artifact is conditional on the answers
        const parsed = JSON.parse(artifact.content);
        assert.deepEqual(
          validate(readSchema(schemaFile), parsed),
          [],
          `${artifactPath} does not satisfy ${schemaFile}`,
        );
        validated++;
      }

      assert.ok(validated > 0, 'expected at least one huascar/*.json artifact to validate');
    });
  }

  it('derives a non-empty tool allowlist from capabilities', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const policy = JSON.parse(artifactsByPath(bundle).get('huascar/security-policy.json').content);

    assert.equal(policy.mode, 'allowlist');
    assert.ok(policy.allowed_tools.length > 0, 'expected capabilities to grant at least one tool');
    // developmentAnswers includes read-repository, so read tools must be present.
    assert.ok(policy.allowed_tools.includes('read_file'));
    // Nothing should be granted that no selected capability asked for.
    assert.ok(!policy.allowed_tools.includes('delete_file'));
  });

  it('allowlists test commands only when run-tests capability is selected', () => {
    const withTests = JSON.parse(
      artifactsByPath(generateAgentBundle(developmentAnswers)).get('huascar/security-policy.json').content,
    );
    const binaries = withTests.allowed_commands.entries.map((entry) => entry.binary);
    assert.ok(binaries.includes('npm'), 'run-tests + TypeScript stack should allowlist npm');

    const withoutTests = JSON.parse(
      artifactsByPath(
        generateAgentBundle({
          ...developmentAnswers,
          capabilities: ['read-repository'],
        }),
      ).get('huascar/security-policy.json').content,
    );
    const readOnlyBinaries = withoutTests.allowed_commands.entries.map((entry) => entry.binary);
    assert.ok(!readOnlyBinaries.includes('npm'), 'read-only agent must not allowlist npm');
    assert.ok(readOnlyBinaries.includes('git'), 'read-repository should still allow read-only git');
  });
});
