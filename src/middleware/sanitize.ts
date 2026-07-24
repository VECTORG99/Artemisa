/**
 * Middleware to sanitize parsed JSON request bodies.
 * Recursively strips prototype pollution keys (__proto__, constructor, prototype)
 * from request bodies before they reach route handlers (#266).
 */
import type { RequestHandler } from 'express';
import { logger } from '../logger.js';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively strip dangerous keys from an object.
 * Returns the sanitized object (mutates in place for performance).
 */
export function stripDangerousKeys(obj: unknown, depth = 0): unknown {
  if (depth > 20 || obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = stripDangerousKeys(obj[i], depth + 1);
    }
    return obj;
  }

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete (obj as Record<string, unknown>)[key];
    } else {
      (obj as Record<string, unknown>)[key] = stripDangerousKeys((obj as Record<string, unknown>)[key], depth + 1);
    }
  }
  return obj;
}

/**
 * Express middleware that sanitizes req.body to prevent prototype pollution.
 * Should be applied AFTER json() parsing and BEFORE route handlers.
 */
export const sanitizeRequestBody: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const before = JSON.stringify(req.body).length;
    stripDangerousKeys(req.body);
    const after = JSON.stringify(req.body).length;
    if (after < before) {
      logger.warn(
        { method: req.method, path: req.path },
        '[SECURITY] Stripped dangerous keys (__proto__/constructor/prototype) from request body',
      );
    }
  }
  next();
};
