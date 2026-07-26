import crypto from 'crypto';
import type express from 'express';

/**
 * Deterministic ETag for a serializable response payload (#405).
 *
 * Express' built-in `etag` setting only hashes the raw response body bytes
 * after serialization, which works but pays the JSON.stringify cost every
 * time. For the Creator's static endpoints (catalog, workflow, tutorial,
 * skills, mcps) the payload is identical across requests within a deploy,
 * so we hash a stable JSON serialization up-front and short-circuit to
 * 304 Not Modified when the client still holds a valid copy.
 *
 * The hash is truncated to 16 hex chars (64 bits) — more than enough to
 * avoid collisions across the handful of distinct payloads served here.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ':' + stableStringify(v))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

export function etagFor(payload: unknown): string {
  return `"${crypto.createHash('md5').update(stableStringify(payload)).digest('hex').slice(0, 16)}"`;
}

/**
 * Set `ETag` and `Cache-Control` on the response and, if the client sent a
 * matching `If-None-Match`, respond with 304 Not Modified and return true.
 * The caller must NOT send a body afterwards when this returns true.
 */
export function sendWithEtag(
  req: express.Request,
  res: express.Response,
  payload: unknown,
  cacheControl = 'public, max-age=300, stale-while-revalidate=3600',
): boolean {
  const tag = etagFor(payload);
  res.set('ETag', tag);
  res.set('Cache-Control', cacheControl);
  if (req.get('If-None-Match') === tag) {
    res.status(304).end();
    return true;
  }
  return false;
}
