import { describe, it } from 'node:test';
import assert from 'node:assert';

import { generateTextWithFallback, parseProviderChain } from '../src/engine/LlmProvider.js';

describe('LlmProvider', () => {
  it('uses Chat Completions API (not Responses API) for the local provider', async () => {
    // Third-party OpenAI-compatible endpoints (NVIDIA NIM, OpenRouter, Ollama, vLLM)
    // implement Chat Completions, not the Responses API. getConfiguredModels() must
    // build the local model via `.chat(modelId)`, not the default callable form,
    // or requests 404 against those providers.
    const { getConfiguredModels } = await import('../src/engine/LlmProvider.js');
    const { config } = await import('../src/config.js');
    // config.llm.providerChain is read once at module load from
    // process.env.LLM_PROVIDER_CHAIN; mutating process.env afterwards has no
    // effect, so mutate the already-loaded config object directly instead.
    const previousChain = config.llm.providerChain;
    config.llm.providerChain = 'local';
    try {
      const [configured] = getConfiguredModels();
      assert.strictEqual(configured.provider, 'local');
      assert.strictEqual(configured.model.constructor.name, '_OpenAIChatLanguageModel');
    } finally {
      config.llm.providerChain = previousChain;
    }
  });

  it('tries the second model when the first throws', async () => {
    const calls = [];
    const models = [
      { provider: 'openai', modelId: 'first', model: { id: 'first' } },
      { provider: 'local', modelId: 'second', model: { id: 'second' } },
    ];

    const result = await generateTextWithFallback({ prompt: 'test' }, models, async options => {
      calls.push(options.model.id);
      if (calls.length === 1) throw new Error('boom');
      return { text: 'ok' };
    });

    assert.strictEqual(result.text, 'ok');
    assert.deepStrictEqual(calls, ['first', 'second']);
  });

  it('falls back to openai when the chain has no valid provider', () => {
    assert.deepStrictEqual(parseProviderChain('bogus'), ['openai']);
  });

  it('does not fallback after a tool executes', async () => {
    const calls = [];
    const models = [
      { provider: 'openai', modelId: 'first', model: { id: 'first' } },
      { provider: 'local', modelId: 'second', model: { id: 'second' } },
    ];

    await assert.rejects(
      () => generateTextWithFallback({ prompt: 'test' }, models, async options => {
        calls.push(options.model.id);
        throw new Error('after-tool-failure');
      }, () => false),
      /after-tool-failure/
    );
    assert.deepStrictEqual(calls, ['first']);
  });

  it('retries retryable errors before succeeding', async () => {
    let calls = 0;
    const models = [{ provider: 'openai', modelId: 'first', model: { id: 'first' } }];

    const result = await generateTextWithFallback({ prompt: 'test' }, models, async () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error('busy'), { status: 503 });
      return { text: 'ok' };
    }, undefined, { sleep: async () => {}, random: () => 0 });

    assert.strictEqual(result.text, 'ok');
    assert.strictEqual(calls, 3);
  });

  it('does not retry non-retryable 401 errors', async () => {
    let calls = 0;
    const models = [{ provider: 'openai', modelId: 'first', model: { id: 'first' } }];

    await assert.rejects(
      () => generateTextWithFallback({ prompt: 'test' }, models, async () => {
        calls++;
        throw Object.assign(new Error('unauthorized'), { status: 401 });
      }, undefined, { sleep: async () => {} }),
      /unauthorized/
    );
    assert.strictEqual(calls, 1);
  });

  it('respects Retry-After on retryable errors', async () => {
    const delays = [];
    let calls = 0;
    const models = [{ provider: 'openai', modelId: 'first', model: { id: 'first' } }];

    await generateTextWithFallback({ prompt: 'test' }, models, async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error('rate limited'), { status: 429, headers: { 'retry-after': '2' } });
      return { text: 'ok' };
    }, undefined, { sleep: async ms => delays.push(ms), random: () => 0 });

    assert.deepStrictEqual(delays, [2000]);
  });

  it('caps excessive Retry-After delays', async () => {
    const delays = [];
    let calls = 0;
    const models = [{ provider: 'openai', modelId: 'first', model: { id: 'first' } }];

    await generateTextWithFallback({ prompt: 'test' }, models, async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error('rate limited'), { status: 429, headers: { 'retry-after': '999' } });
      return { text: 'ok' };
    }, undefined, { maxDelayMs: 3000, sleep: async ms => delays.push(ms), random: () => 0 });

    assert.deepStrictEqual(delays, [3000]);
  });

});
