import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { config } from './config.js';
import { createStore, Store } from './engine/Store.js';
import { creatorProtectedRouter, creatorPublicRouter } from './creator/router.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { enforceJsonContentType, validatePathParams } from './middleware/validation.js';
import { sanitizeRequestBody } from './middleware/sanitize.js';
import { createHealthRouter } from './routes/health.js';
import { hooksRouter } from './routes/hooks.js';
import { createMetricsState, metricsMiddleware, metricsRouter } from './routes/metrics.js';
import { openApiRouter } from './routes/openapi.js';
import { createDebugState, debugMiddleware, debugRouter } from './routes/debug.js';
import { logger } from './logger.js';
import { commitApprovals } from './services/approvals.js';

/**
 * #410: Lazy-mount a router whose module is heavy (engine, MCP pool, RAG).
 * The module is imported on first request to its path and the constructed
 * router is memoized, so the Creator-only cold start never pays for the
 * runtime engine. The first runtime request pays the import cost once.
 */
function lazyRoute(loader: () => Promise<express.Router>): express.RequestHandler {
  let cached: express.Router | null = null;
  return (req, res, next) => {
    if (cached) {
      cached(req, res, next);
      return;
    }
    loader()
      .then((router) => {
        cached = router;
        router(req, res, next);
      })
      .catch(next);
  };
}

export const app = express();
export const store: Store = createStore();
export const metricsState = createMetricsState();
export const debugState = createDebugState();

// Security headers (XSS, clickjacking, MIME sniffing protection)
app.use(
  helmet({
    contentSecurityPolicy: false, // API server, not serving HTML
    crossOriginEmbedderPolicy: false,
  }),
);

// Strict Content-Type enforcement for mutation requests (#249 — handles charset params)
app.use(enforceJsonContentType);

// HTTP compression (#404) — gzip/brotli for JSON responses (catalog ~34KB,
// workflow ~52KB compress ~70-85%). threshold=1KB skips tiny responses.
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Don't compress if the client explicitly opts out.
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  }),
);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin ONLY for server-to-server/curl (non-browser)
      // Block 'null' origin explicitly (file://, sandboxed iframes)
      if (origin === 'null') {
        logger.warn({ origin }, '[CORS] Blocked null origin request');
        callback(new Error('null origin not allowed'));
        return;
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin }, '[CORS] Blocked request from origin');
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400, // Preflight cache 24h — reduces OPTIONS requests
  }),
);
app.use(express.json({ limit: '128kb' }));

// Sanitize request bodies: strip __proto__, constructor, prototype keys (#266)
app.use(sanitizeRequestBody);

// Path parameter validation for all routes (#278)
app.use(validatePathParams);

// --- Rate Limiting ---
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GLOBAL || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_EXECUTE || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Execution rate limit exceeded. Max 5 requests per minute.' },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// The Creator re-evaluates the whole decision tree on every step. Auto-largo
// walks 32 questions, so a single completed agent costs ~35 requests; at 30/min
// a normal user was rate limited mid-flow. These calls are pure CPU (no I/O, no
// LLM) and already capped at 128 KB per body, so a higher ceiling is safe.
const creatorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_CREATOR || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Creator API rate limit exceeded' },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

app.use(globalLimiter);
export { executeLimiter, creatorLimiter };

// Global request timeout — applies to ALL routes including creator public
app.use((_req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) res.status(503).json({ error: 'Request timeout' });
  }, config.server.requestTimeoutMs);
  const done = () => clearTimeout(timer);
  res.on('finish', done);
  res.on('close', done);
  next();
});

app.use('/api/v1/creator', creatorLimiter, creatorPublicRouter);

app.use(metricsMiddleware(metricsState));
if (debugState.enabled) app.use(debugMiddleware(debugState));
app.use('/api', metricsRouter(metricsState));
app.use('/api', createHealthRouter(store));
app.use(
  '/api',
  lazyRoute(() => import('./routes/mcpStatus.js').then((m) => m.mcpStatusRouter)),
);
app.use('/api', openApiRouter);
app.use(
  '/api',
  lazyRoute(() => import('./routes/tools.js').then((m) => m.toolsRouter())),
);

app.use('/api', (req, res, next) => {
  // Health and metrics are already handled above
  if (req.path === '/health' || req.path.startsWith('/health/') || req.path === '/metrics') return next();
  requireAuth(req, res, next);
});

app.use(
  '/api',
  lazyRoute(() => import('./routes/history.js').then((m) => m.historyRouter(store))),
);
app.use('/api/v1/creator', creatorProtectedRouter);
app.use(
  '/api',
  lazyRoute(() => import('./routes/rag.js').then((m) => m.ragRouter(store))),
);
app.use(
  '/api',
  lazyRoute(() => import('./routes/roles.js').then((m) => m.rolesRouter())),
);
app.use(
  '/api',
  lazyRoute(() => import('./routes/agents.js').then((m) => m.agentsRouter(store))),
);
// Apply stricter rate limit to agent execution endpoint BEFORE the router
app.use('/api/agent/execute', executeLimiter);
app.use(
  '/api',
  lazyRoute(() => import('./routes/agent.js').then((m) => m.agentRouter(store))),
);
app.use(
  '/api',
  lazyRoute(async () => {
    const { createConfigsRouter } = await import('./routes/configs.js');
    const { ConfigStore } = await import('./engine/ConfigStore.js');
    return createConfigsRouter(new ConfigStore(store.getDatabase()));
  }),
);
app.use('/api', hooksRouter(commitApprovals));
app.use(
  '/api',
  lazyRoute(async () => {
    const { memoryRouter } = await import('./routes/memory.js');
    const { ExecutionContext } = await import('./engine/ExecutionContext.js');
    return memoryRouter(new ExecutionContext(store));
  }),
);
app.use(
  '/api',
  lazyRoute(() => import('./routes/pipeline.js').then((m) => m.pipelineRouter(store))),
);
if (debugState.enabled) app.use('/api', debugRouter(debugState));

app.use(notFound);
app.use(errorHandler);
