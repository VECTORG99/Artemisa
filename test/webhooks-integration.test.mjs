import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('HuascarEngine webhook integration', () => {
  let HuascarEngine;
  let originalFetch;
  let originalWebhookUrls;
  let fetchCalls;

  before(async () => {
    process.env.LLM_MOCK_MODE = 'true';
    delete process.env.OPENAI_API_KEY;
    const mod = await import('../src/engine/HuascarEngine.js');
    HuascarEngine = mod.HuascarEngine;
  });

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    originalWebhookUrls = process.env.WEBHOOK_URLS;
    process.env.WEBHOOK_URLS = 'https://example.com/webhook';
    globalThis.fetch = async (url, init) => {
      fetchCalls.push({ url, init });
      return { ok: true, status: 200, json: async () => ({}) };
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWebhookUrls === undefined) {
      delete process.env.WEBHOOK_URLS;
    } else {
      process.env.WEBHOOK_URLS = originalWebhookUrls;
    }
  });

  it('emits execution.started and execution.completed on successful run', async () => {
    const engine = new HuascarEngine('PR_REVIEWER');
    const result = await engine.executeTask('test task');

    assert.strictEqual(result.status, 'success');

    // Webhooks are fire-and-forget; give pending microtasks a chance to flush.
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.strictEqual(fetchCalls.length, 2);

    const startedEvent = JSON.parse(fetchCalls[0].init.body);
    assert.strictEqual(startedEvent.type, 'execution.started');
    assert.strictEqual(startedEvent.data.role, 'Senior Code Reviewer');
    assert.strictEqual(startedEvent.data.task, 'test task');
    assert.strictEqual(fetchCalls[0].init.headers['X-Webhook-Event'], 'execution.started');

    const completedEvent = JSON.parse(fetchCalls[1].init.body);
    assert.strictEqual(completedEvent.type, 'execution.completed');
    assert.strictEqual(completedEvent.data.role, 'Senior Code Reviewer');
    assert.ok(typeof completedEvent.data.duration_ms === 'number');
    assert.ok(completedEvent.data.duration_ms >= 0);
  });

  it('emits execution.failed when the run throws', async () => {
    const { config } = await import('../src/config.js');
    const previousMock = config.llm.mockMode;
    const previousHasLlmProvider = config.hasLlmProvider;
    config.llm.mockMode = false;
    config.hasLlmProvider = true;

    const engine = new HuascarEngine('PR_REVIEWER');
    engine.connectMcpServers = async () => {};
    engine.loadRagSources = async () => {};
    engine.rag.getContext = async () => '';
    engine.runReActLoop = async () => {
      throw new Error('boom');
    };

    const result = await engine.executeTask('failing task');
    assert.strictEqual(result.status, 'blocked');
    assert.match(result.error, /boom/);

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.strictEqual(fetchCalls.length, 2);

    const startedEvent = JSON.parse(fetchCalls[0].init.body);
    assert.strictEqual(startedEvent.type, 'execution.started');

    const failedEvent = JSON.parse(fetchCalls[1].init.body);
    assert.strictEqual(failedEvent.type, 'execution.failed');
    assert.match(failedEvent.data.error, /boom/);
    assert.ok(typeof failedEvent.data.duration_ms === 'number');

    config.llm.mockMode = previousMock;
    config.hasLlmProvider = previousHasLlmProvider;
  });

  it('does not call fetch when WEBHOOK_URLS is unset', async () => {
    delete process.env.WEBHOOK_URLS;

    const engine = new HuascarEngine('PR_REVIEWER');
    const result = await engine.executeTask('test task');
    assert.strictEqual(result.status, 'success');

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.strictEqual(fetchCalls.length, 0);
  });

  it('does not throw or affect execution result when webhook delivery fails', async () => {
    globalThis.fetch = async () => {
      throw new Error('network unreachable');
    };

    const engine = new HuascarEngine('PR_REVIEWER');
    const result = await engine.executeTask('test task');

    assert.strictEqual(result.status, 'success');
  });
});
