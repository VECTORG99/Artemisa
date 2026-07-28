import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { CATALOG_VERSION, getCreatorCatalog } from './catalog.js';
import { CreatorInputError } from './domain.js';
import { creatorTutorial, evaluateDecisionTree, getWorkflowDefinition, WORKFLOW_VERSION } from './decisionTree.js';
import { generateAgentBundle } from './generator.js';
import { getSkillsCatalog } from './skillsCatalog.js';
import { getMcpCatalog } from './mcpCatalog.js';
import { getModelsCatalog } from './modelsCatalog.js';
import { sendWithEtag } from './etag.js';
import {
  generateAgentBundle as generateAgentBundleProtocol,
  getAgentProtocol,
  getAgentStart,
  getStartupDocument,
  processAgentAnswer,
} from './agentProtocol.js';
import { listDocumentationFiles } from './docs-catalog.js';

interface CreatorRequestBody {
  answers?: unknown;
  workflowVersion?: unknown;
  catalogVersion?: unknown;
}

export const creatorPublicRouter = express.Router();
export const creatorProtectedRouter = express.Router();

function parseBody(body: unknown): CreatorRequestBody {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new CreatorInputError('El body debe ser un objeto JSON.', [
      { path: 'body', message: 'Se esperaba un objeto.' },
    ]);
  }
  const value = body as Record<string, unknown>;
  const allowed = new Set(['answers', 'workflowVersion', 'catalogVersion']);
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new CreatorInputError(
      'El body contiene propiedades desconocidas.',
      unknownKeys.map((key) => ({ path: `body.${key}`, message: 'Propiedad no permitida.' })),
    );
  }
  return value;
}

function assertVersions(body: CreatorRequestBody): void {
  if (body.workflowVersion !== undefined && body.workflowVersion !== WORKFLOW_VERSION) {
    throw new CreatorInputError(
      'La versión del workflow cambió; vuelve a cargar el flujo.',
      [{ path: 'workflowVersion', message: `Versión esperada: ${WORKFLOW_VERSION}.` }],
      409,
    );
  }
  if (body.catalogVersion !== undefined && body.catalogVersion !== CATALOG_VERSION) {
    throw new CreatorInputError(
      'La versión del catálogo cambió; vuelve a cargar las opciones.',
      [{ path: 'catalogVersion', message: `Versión esperada: ${CATALOG_VERSION}.` }],
      409,
    );
  }
}

/** Bounded string query param; undefined when absent or repeated. */
function queryParam(req: express.Request, key: string, maxLength: number): string | undefined {
  const value = req.query[key];
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

/** Send a static catalog payload, short-circuiting to 304 when the client's ETag still matches. */
function sendCatalog(req: express.Request, res: express.Response, payload: unknown): void {
  if (sendWithEtag(req, res, payload)) return;
  res.json(payload);
}

function versionHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.set('X-Creator-Workflow-Version', WORKFLOW_VERSION);
  res.set('X-Creator-Catalog-Version', CATALOG_VERSION);
  next();
}

// #324: Creator error handler with application/problem+json content-type
function creatorErrorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof CreatorInputError) {
    res.status(err.statusCode).type('application/problem+json').json({
      type: 'about:blank',
      title: err.message,
      status: err.statusCode,
      issues: err.issues,
    });
    return;
  }
  next(err);
}

const agentLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_AGENT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { type: 'rate-limit', title: 'Too many requests', status: 429 },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

/** Hosts where plain HTTP is legitimate (local development). */
function isLocalHost(host: string): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0';
}

/**
 * Base URL advertised to agents in `/agent` and `/startup`.
 *
 * Behind a TLS-terminating proxy (DigitalOcean App Platform) `req.protocol` is
 * `http`, so the onboarding prompt used to hand agents `http://` URLs that
 * answer 301 to `https://` — an insecure first hop and a redirect for every
 * step (issue #719). `X-Forwarded-Proto` wins whenever the proxy sends it, and
 * any non-local host defaults to `https`; only local hosts keep `req.protocol`.
 */
export function deriveBaseUrl(req: express.Request): string {
  const forwardedHost = req.get('X-Forwarded-Host');
  if (!forwardedHost) {
    const origin = req.get('Origin');
    if (origin) return `${origin}/api/v1/creator`;
  }
  const host = forwardedHost || req.get('host') || 'localhost';
  // The header can carry a proxy chain ("https, http"); the client-facing
  // protocol is the first entry.
  const forwardedProto = (req.get('X-Forwarded-Proto') || '').split(',')[0]?.trim().toLowerCase();
  const proto = forwardedProto || (isLocalHost(host) ? req.protocol : 'https');
  return `${proto}://${host}/api/v1/creator`;
}

creatorPublicRouter.use(versionHeaders);
creatorProtectedRouter.use(versionHeaders);
creatorPublicRouter.use('/agent', agentLimiter);

creatorPublicRouter.get('/catalog', (req, res) => {
  sendCatalog(
    req,
    res,
    getCreatorCatalog({
      category: queryParam(req, 'category', 50),
      environment: queryParam(req, 'environment', 50),
      q: queryParam(req, 'q', 100),
    }),
  );
});

creatorPublicRouter.get('/workflow', (req, res) => {
  sendCatalog(req, res, getWorkflowDefinition());
});

creatorPublicRouter.get('/tutorial', (req, res) => {
  sendCatalog(req, res, creatorTutorial);
});

creatorPublicRouter.get('/skills', (req, res) => {
  sendCatalog(req, res, getSkillsCatalog({ focus: queryParam(req, 'focus', 50), q: queryParam(req, 'q', 100) }));
});

creatorPublicRouter.get('/mcps', (req, res) => {
  sendCatalog(req, res, getMcpCatalog({ category: queryParam(req, 'category', 50), q: queryParam(req, 'q', 100) }));
});

creatorPublicRouter.get('/models', (req, res) => {
  sendCatalog(
    req,
    res,
    getModelsCatalog({
      provider: queryParam(req, 'provider', 50),
      tier: queryParam(req, 'tier', 20),
      q: queryParam(req, 'q', 100),
    }),
  );
});

creatorProtectedRouter.post('/evaluate', (req, res, next) => {
  try {
    const body = parseBody(req.body);
    assertVersions(body);
    const evaluation = evaluateDecisionTree(body.answers);
    // #333: compact mode omits visibleQuestions and answers
    if (req.query.compact === 'true') {
      const { visibleQuestions: _vq, answers: _ans, answeredQuestionIds: _aq, ...compact } = evaluation;
      res.json(compact);
    } else {
      res.json(evaluation);
    }
  } catch (error: unknown) {
    next(error);
  }
});

function previewHandler(req: express.Request, res: express.Response, next: express.NextFunction): void {
  try {
    const body = parseBody(req.body);
    assertVersions(body);
    res.json(generateAgentBundle(body.answers));
  } catch (error: unknown) {
    next(error);
  }
}

creatorProtectedRouter.post('/preview', previewHandler);
creatorProtectedRouter.post('/generate', previewHandler);

// Agent protocol endpoints (public, machine-friendly)
creatorPublicRouter.get('/agent', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(getAgentProtocol(deriveBaseUrl(req)));
});

creatorPublicRouter.get('/agent/start', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(getAgentStart());
});

creatorPublicRouter.post('/agent/answer', (req, res, next) => {
  try {
    const body = parseBody(req.body);
    const result = processAgentAnswer(body);
    if (result.issues.length > 0 && result.next_question === undefined) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error: unknown) {
    next(error);
  }
});

creatorPublicRouter.post('/agent/generate', (req, res, next) => {
  try {
    res.json(generateAgentBundleProtocol(req.body));
  } catch (error: unknown) {
    next(error);
  }
});

/**
 * GET /api/v1/creator/docs — Returns a catalog of official documentation
 * files with metadata (title, description, category, size). Allows AI agents
 * to discover and consume the project's documentation programmatically.
 * Deterministic: same repo state, same output.
 */
creatorPublicRouter.get('/docs', (_req, res) => {
  const docs = listDocumentationFiles();
  res.json({
    version: '1.0.0',
    count: docs.length,
    documents: docs,
  });
});

/**
 * GET /api/v1/creator/docs/content — Serve a single documentation file as
 * plain markdown. The path must be a relative .md file inside the repo root.
 * Supports offline/self-hosted deployments and avoids hardcoded GitHub URLs.
 */
creatorPublicRouter.get('/docs/content', (req, res, next) => {
  const docPath = req.query.path;
  if (typeof docPath !== 'string' || !docPath.endsWith('.md')) {
    return next(
      new CreatorInputError('Ruta de documento inválida.', [
        { path: 'path', message: 'Se requiere un path relativo terminado en .md.' },
      ]),
    );
  }
  if (docPath.includes('..') || path.isAbsolute(docPath)) {
    return next(
      new CreatorInputError('Ruta de documento no permitida.', [
        { path: 'path', message: 'Solo se permiten rutas relativas dentro del repositorio.' },
      ]),
    );
  }

  const filePath = path.resolve(process.cwd(), docPath);
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        res.status(404).type('application/problem+json').json({
          type: 'about:blank',
          title: 'Documento no encontrado',
          status: 404,
          detail: docPath,
        });
        return;
      }
      next(err);
      return;
    }
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(content);
  });
});

creatorPublicRouter.get('/startup', (req, res) => {
  const baseUrl = deriveBaseUrl(req);
  const accept = req.get('Accept') || '';
  const doc = getStartupDocument(baseUrl);

  if (accept.includes('application/json')) {
    res.json({ content: doc, mediaType: 'text/markdown' });
  } else {
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(doc);
  }
});

// Attach error handler after all routes
creatorPublicRouter.use(creatorErrorHandler);
creatorProtectedRouter.use(creatorErrorHandler);
