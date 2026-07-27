import { afterEach, describe, expect, it, vi } from 'vitest';

import { creator } from './api';

// `creator.evaluate` posts to /evaluate. The dedup logic (#409) must:
//  - reuse the in-flight promise for identical args (no duplicate fetch)
//  - reuse the last result for identical args after completion (back nav)
//  - fire a new request for different args
function mockFetchSequential(responses: unknown[]) {
  const calls: unknown[][] = [];
  let i = 0;
  const fn = vi.fn((...args: unknown[]) => {
    calls.push(args);
    const body = responses[i] ?? responses[responses.length - 1];
    i += 1;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return { fn, calls };
}

describe('creator.evaluate dedup + memo (#409)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reuses the in-flight promise for identical args (single fetch)', async () => {
    const { fn, calls } = mockFetchSequential([{ workflowVersion: '1.0.0' }]);
    vi.stubGlobal('fetch', fn);

    const a = creator.evaluate({ agent_name: 'x' }, { workflowVersion: '1.0.0', catalogVersion: '1.0.0' });
    const b = creator.evaluate({ agent_name: 'x' }, { workflowVersion: '1.0.0', catalogVersion: '1.0.0' });
    const [ra, rb] = await Promise.all([a, b]);

    expect(ra).toBe(rb);
    expect(calls.length).toBe(1);
  });

  it('reuses the last result for identical args after completion (no new fetch)', async () => {
    const { fn, calls } = mockFetchSequential([{ workflowVersion: '1.0.0' }]);
    vi.stubGlobal('fetch', fn);

    const versions = { workflowVersion: '1.0.0', catalogVersion: '1.0.0' };
    await creator.evaluate({ agent_name: 'y' }, versions);
    await creator.evaluate({ agent_name: 'y' }, versions);

    expect(calls.length).toBe(1);
  });

  it('fires separate requests for different answers', async () => {
    const { fn, calls } = mockFetchSequential([{ n: 1 }, { n: 2 }]);
    vi.stubGlobal('fetch', fn);

    const versions = { workflowVersion: '1.0.0', catalogVersion: '1.0.0' };
    await creator.evaluate({ agent_name: 'a' }, versions);
    await creator.evaluate({ agent_name: 'b' }, versions);

    expect(calls.length).toBe(2);
  });
});
