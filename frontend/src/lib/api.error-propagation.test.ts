import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, creator } from './api';

function respond(body: string, status = 200, contentType = 'application/json') {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

describe('request error propagation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects when a successful response carries a body that is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respond('<html>proxy error</html>', 200, 'text/html'))),
    );

    await expect(creator.getCatalog()).rejects.toThrow(ApiError);
    await expect(creator.getCatalog()).rejects.toThrow(/Invalid JSON response/);
  });

  it('rejects when a successful response has an empty body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respond('', 200))),
    );

    await expect(creator.getWorkflow()).rejects.toThrow(/Invalid JSON response/);
  });

  it('keeps the status when an error response body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respond('502 Bad Gateway', 502, 'text/plain'))),
    );

    const error = await creator.getTutorial().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).problem).toBeNull();
  });

  it('does not memoize a failed evaluation: retrying the same answers refetches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(JSON.stringify({ title: 'boom' }), 500))
      .mockResolvedValueOnce(respond(JSON.stringify({ workflowVersion: '1.0.0' })));
    vi.stubGlobal('fetch', fetchMock);

    const answers = { agent_name: 'retry-me' };
    const versions = { workflowVersion: '1.0.0', catalogVersion: '1.0.0' };

    await expect(creator.evaluate(answers, versions)).rejects.toBeInstanceOf(ApiError);
    await expect(creator.evaluate(answers, versions)).resolves.toEqual({ workflowVersion: '1.0.0' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
