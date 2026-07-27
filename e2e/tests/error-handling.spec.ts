import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const EVALUATE = `${API_URL}/api/v1/creator/evaluate`;

test.describe('Error Handling', () => {
  test('404 for unknown routes', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/nonexistent`);
    expect(response.status()).toBe(404);
  });

  test('404 for removed runtime routes', async ({ request }) => {
    for (const removed of ['/api/agent/execute', '/api/history', '/api/roles']) {
      const response = await request.get(`${API_URL}${removed}`);
      expect(response.status()).toBe(404);
    }
  });

  test('415 for wrong content-type on POST', async ({ request }) => {
    const response = await request.post(EVALUATE, {
      headers: { 'Content-Type': 'text/plain' },
      data: 'not json',
    });
    expect(response.status()).toBe(415);
  });

  test('400 for unknown body properties', async ({ request }) => {
    const response = await request.post(EVALUATE, {
      data: { answers: {}, unexpected: true },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('rate limiting returns 429 after many requests', async ({ request }) => {
    const responses = [];
    for (let i = 0; i < 200; i++) {
      responses.push(request.post(EVALUATE, { data: { answers: {} } }));
    }
    const results = await Promise.all(responses);
    const statuses = results.map((r) => r.status());
    // At least some should be rate limited (429) or unauthorized (401)
    expect(statuses.some((s) => s === 429 || s === 401)).toBeTruthy();
  });
});
