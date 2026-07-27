import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../logger.js';

/**
 * Authentication middleware for the Artemisa API.
 *
 * Supports Bearer token auth via Authorization header or X-API-Key header.
 * API keys are configured via ARTEMISA_API_KEYS env var (comma-separated).
 *
 * When AUTH_REQUIRED=false (default for development), auth is optional.
 * When AUTH_REQUIRED=true (production), all protected routes require a valid key.
 */

const AUTH_REQUIRED = process.env.AUTH_REQUIRED !== 'false';

// Load API keys from environment — comma-separated list
const API_KEYS = (process.env.ARTEMISA_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

// Startup warning: if auth is required but no keys configured, log clearly
if (AUTH_REQUIRED && API_KEYS.length === 0) {
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProduction) {
    logger.fatal(
      'AUTH_REQUIRED=true but no ARTEMISA_API_KEYS configured — cannot start in production without API keys',
    );
    process.exit(1);
  } else {
    logger.warn(
      'AUTH_REQUIRED is enabled but no ARTEMISA_API_KEYS configured — set AUTH_REQUIRED=false for local development or configure keys',
    );
  }
}

/** Timing-safe token comparison — constant-time regardless of key lengths.
 * Uses HMAC-SHA256 to normalize to fixed-length digests before comparison,
 * preventing key length oracle attacks via timing differences.
 * Returns the key index (tenant identifier) or -1 if invalid. */
function findValidKeyIndex(provided: string): number {
  const providedHash = crypto.createHmac('sha256', 'artemisa-auth').update(provided).digest();
  let foundIndex = -1;
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i]!;
    const keyHash = crypto.createHmac('sha256', 'artemisa-auth').update(key).digest();
    if (crypto.timingSafeEqual(providedHash, keyHash)) {
      foundIndex = i;
    }
  }
  return foundIndex;
}

/** Derive a stable tenant ID from an API key (first 8 chars of SHA-256 hash). */
function deriveTenantId(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
}

// Pre-compute tenant IDs for all configured keys
const TENANT_IDS = API_KEYS.map(deriveTenantId);

function extractToken(req: Request): string | null {
  // Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.length > 0) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Middleware that requires authentication on protected routes.
 * Public routes (health) should be mounted BEFORE this middleware.
 * On success, sets req.tenantId for downstream isolation.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If auth is not required (development mode), set default tenant and pass through
  if (!AUTH_REQUIRED) {
    (req as TenantRequest).tenantId = 'dev';
    next();
    return;
  }

  // Fail closed: production auth misconfiguration must not allow protected requests.
  if (API_KEYS.length === 0) {
    logger.error('AUTH_REQUIRED=true but no ARTEMISA_API_KEYS configured');
    res.status(500).json({ error: 'Authentication misconfigured', code: 'AUTH_MISCONFIGURED' });
    return;
  }

  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_MISSING',
      hint: 'Provide an API key via Authorization: Bearer <key> or X-API-Key header',
    });
    return;
  }

  const keyIndex = findValidKeyIndex(token);
  if (keyIndex < 0) {
    res.status(403).json({
      error: 'Invalid API key',
      code: 'AUTH_INVALID',
    });
    return;
  }

  // Set tenant context for downstream isolation
  (req as TenantRequest).tenantId = TENANT_IDS[keyIndex];
  next();
}

/** Extended request type with tenant identity. */
export interface TenantRequest extends Request {
  tenantId?: string;
}

/** Helper to extract tenant ID from a request (returns 'anonymous' if not set). */
export function getTenantId(req: Request): string {
  return (req as TenantRequest).tenantId || 'anonymous';
}
