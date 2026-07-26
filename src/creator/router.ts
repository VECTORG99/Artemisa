import express from 'express';
import rateLimit from 'express-rate-limit';
import { CATALOG_VERSION, getCreatorCatalog } from './catalog.js';
import { CreatorInputError } from './domain.js';
import { creatorTutorial, evaluateDecisionTree, getWorkflowDefinition, WORKFLOW_VERSION } from './decisionTree.js';
import { generateAgentBundle } from './generator.js';
import { getSkillsCatalog } from './skillsCatalog.js';
import { getMcpCatalog } from './mcpCatalog.js';
import { sendWithEtag } from './etag.js';
import {
  generateAgentBundle as generateAgentBundleProtocol,
  getAgentProtocol,
  getAgentStart,
  getStartupDocument,
  processAgentAnswer,
} from './agentProtocol.js';

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

function deriveBaseUrl(req: express.Request): string {
  const forwardedHost = req.get('X-Forwarded-Host');
  if (forwardedHost) {
    const proto = req.get('X-Forwarded-Proto') || 'https';
    return `${proto}://${forwardedHost}/api/v1/creator`;
  }
  const origin = req.get('Origin');
  if (origin) return `${origin}/api/v1/creator`;
  const host = req.get('host') || 'localhost';
  return `${req.protocol}://${host}/api/v1/creator`;
}

creatorPublicRouter.use(versionHeaders);
creatorProtectedRouter.use(versionHeaders);
creatorPublicRouter.use('/agent', agentLimiter);

creatorPublicRouter.get('/catalog', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const environment = typeof req.query.environment === 'string' ? req.query.environment : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : undefined;
  const payload = getCreatorCatalog({ category, environment, q });
  if (sendWithEtag(req, res, payload)) return;
  res.json(payload);
});

creatorPublicRouter.get('/workflow', (req, res) => {
  const payload = getWorkflowDefinition();
  if (sendWithEtag(req, res, payload)) return;
  res.json(payload);
});

creatorPublicRouter.get('/tutorial', (req, res) => {
  if (sendWithEtag(req, res, creatorTutorial)) return;
  res.json(creatorTutorial);
});

creatorPublicRouter.get('/skills', (req, res) => {
  const focus = typeof req.query.focus === 'string' ? req.query.focus.slice(0, 50) : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : undefined;
  const payload = getSkillsCatalog({ focus, q });
  if (sendWithEtag(req, res, payload)) return;
  res.json(payload);
});

creatorPublicRouter.get('/mcps', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.slice(0, 50) : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : undefined;
  const payload = getMcpCatalog({ category, q });
  if (sendWithEtag(req, res, payload)) return;
  res.json(payload);
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

creatorPublicRouter.post('/agent/answer', (req, res) => {
  const result = processAgentAnswer(req.body);
  if (result.issues.length > 0 && result.next_question === undefined) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

creatorPublicRouter.post('/agent/generate', (req, res, next) => {
  try {
    res.json(generateAgentBundleProtocol(req.body));
  } catch (error: unknown) {
    next(error);
  }
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
