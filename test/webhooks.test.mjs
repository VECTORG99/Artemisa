import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('webhooks', () => {
  let emitWebhook;
  let originalFetch;
  let originalWebhookUrls;
  let fetchCalls;

  before(async () => {
    const mod = await import('../src/webhooks.js');
    emitWebhook = mod.emitWebhook;
  });

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    originalWebhookUrls = process.env.WEBHOOK_URLS;
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

  it('does nothing when WEBHOOK_URLS is unset', async () => {
    delete process.env.WEBHOOK_URLS;
    await emitWebhook({
      type: 'execution.started',
      timestamp: new Date().toISOString(),
      data: { role: 'test', task: 'task' },
    });
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('does nothing when WEBHOOK_URLS is empty string', async () => {
    process.env.WEBHOOK_URLS = '';
    await emitWebhook({
      type: 'execution.started',
      timestamp: new Date().toISOString(),
      data: { role: 'test', task: 'task' },
    });
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('sends a POST request to a single configured URL', async () => {
    process.env.WEBHOOK_URLS = 'https://example.com/hook';
    await emitWebhook({
      type: 'execution.completed',
      timestamp: '2026-01-01T00:00:00.000Z',
      data: { role: 'test', task: 'task', duration_ms: 100 },
    });

    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].url, 'https://example.com/hook');
    assert.strictEqual(fetchCalls[0].init.method, 'POST');
    assert.strictEqual(fetchCalls[0].init.headers['Content-Type'], 'application/json');
    assert.strictEqual(fetchCalls[0].init.headers['X-Webhook-Event'], 'execution.completed');

    const body = JSON.parse(fetchCalls[0].init.body);
    assert.strictEqual(body.type, 'execution.completed');
    assert.strictEqual(body.data.duration_ms, 100);
  });

  it('sends to multiple comma-separated URLs', async () => {
    process.env.WEBHOOK_URLS = 'https://a.example.com/hook, https://b.example.com/hook';
    await emitWebhook({
      type: 'execution.started',
      timestamp: new Date().toISOString(),
      data: { role: 'test', task: 'task' },
    });

    assert.strictEqual(fetchCalls.length, 2);
    assert.strictEqual(fetchCalls[0].url, 'https://a.example.com/hook');
    assert.strictEqual(fetchCalls[1].url, 'https://b.example.com/hook');
  });

  it('blocks SSRF-vulnerable URLs at send time and does not call fetch', async () => {
    process.env.WEBHOOK_URLS = 'http://169.254.169.254/latest/meta-data,http://localhost:8080/hook';
    await emitWebhook({
      type: 'execution.failed',
      timestamp: new Date().toISOString(),
      data: { role: 'test', task: 'task', error: 'boom' },
    });

    assert.strictEqual(fetchCalls.length, 0);
  });

  it('continues delivering to safe URLs even if another URL is blocked', async () => {
    process.env.WEBHOOK_URLS = 'http://127.0.0.1/hook,https://good.example.com/hook';
    await emitWebhook({
      type: 'execution.started',
      timestamp: new Date().toISOString(),
      data: { role: 'test', task: 'task' },
    });

    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].url, 'https://good.example.com/hook');
  });

  it('does not throw when fetch rejects (fire-and-forget)', async () => {
    process.env.WEBHOOK_URLS = 'https://example.com/hook';
    globalThis.fetch = async () => {
      throw new Error('network error');
    };

    await assert.doesNotReject(() =>
      emitWebhook({
        type: 'execution.failed',
        timestamp: new Date().toISOString(),
        data: { role: 'test', task: 'task', error: 'boom' },
      }),
    );
  });
});
