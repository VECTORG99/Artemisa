import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { developmentAnswers } from './creatorFixture.mjs';

const { evaluateDecisionTree } = await import('../src/creator/decisionTree.js');

function evaluateWithPurpose(purpose) {
  const answers = { ...developmentAnswers, purpose };
  return evaluateDecisionTree(answers);
}

describe('purpose-specific recommendations', () => {
  it('research produces at least 2 recommendations', () => {
    const evaluation = evaluateWithPurpose('research');
    const purposeRecs = evaluation.recommendations.filter((r) => r.id.startsWith('research-'));
    assert.ok(purposeRecs.length >= 2, `Expected >=2, got ${purposeRecs.length}`);
    const ids = purposeRecs.map((r) => r.id);
    assert.ok(ids.includes('research-reproducibility'));
    assert.ok(ids.includes('research-rag-domain'));
  });

  it('research recommendations have evidence and alternatives', () => {
    const evaluation = evaluateWithPurpose('research');
    const recs = evaluation.recommendations.filter((r) => r.id.startsWith('research-'));
    for (const rec of recs) {
      assert.ok(rec.evidence.length > 0, `${rec.id} must have evidence`);
      assert.ok(rec.benefits.length > 0, `${rec.id} must have benefits`);
      assert.ok(rec.tradeoffs.length > 0, `${rec.id} must have tradeoffs`);
      assert.ok(rec.alternatives.length > 0, `${rec.id} must have alternatives`);
    }
  });

  it('documentation produces at least 2 recommendations', () => {
    const evaluation = evaluateWithPurpose('documentation');
    const purposeRecs = evaluation.recommendations.filter((r) => r.id.startsWith('docs-'));
    assert.ok(purposeRecs.length >= 2, `Expected >=2, got ${purposeRecs.length}`);
    const ids = purposeRecs.map((r) => r.id);
    assert.ok(ids.includes('docs-style-guide'));
    assert.ok(ids.includes('docs-versioned-with-code'));
  });

  it('custom produces at least 1 warning', () => {
    const evaluation = evaluateWithPurpose('custom');
    const purposeRecs = evaluation.recommendations.filter((r) => r.id.startsWith('custom-'));
    assert.ok(purposeRecs.length >= 1, `Expected >=1, got ${purposeRecs.length}`);
    assert.equal(purposeRecs[0].severity, 'warning');
    assert.equal(purposeRecs[0].id, 'custom-purpose-review');
  });

  it('pr-review purpose does not fire research/docs/custom recs', () => {
    const evaluation = evaluateWithPurpose('pr-review');
    const unexpected = evaluation.recommendations.filter(
      (r) => r.id.startsWith('research-') || r.id.startsWith('docs-') || r.id.startsWith('custom-'),
    );
    assert.equal(unexpected.length, 0);
  });
});
