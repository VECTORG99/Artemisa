import { Router } from 'express';

const json = { type: 'object', additionalProperties: true };

/**
 * OpenAPI document for the Creator API (#584).
 * The runtime endpoints (agent execution, agents CRUD, history, roles, RAG,
 * hooks) were removed with the runtime itself and are no longer documented.
 */
const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Huascar API',
    version: '0.1.0',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Backend health check',
        responses: { '200': { description: 'Service status', content: { 'application/json': { schema: json } } } },
      },
    },
    '/api/metrics': {
      get: {
        summary: 'HTTP request metrics',
        parameters: [{ name: 'x-metrics-token', in: 'header', required: false, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Metrics snapshot', content: { 'application/json': { schema: json } } },
          '401': { description: 'Invalid metrics token' },
        },
      },
    },
    '/api/openapi.json': {
      get: {
        summary: 'OpenAPI 3.1 document',
        responses: { '200': { description: 'OpenAPI document', content: { 'application/json': { schema: json } } } },
      },
    },
    '/api/v1/creator/catalog': {
      get: {
        summary: 'Creator catalog',
        parameters: [
          { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'environment', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Catalog options', content: { 'application/json': { schema: json } } } },
      },
    },
    '/api/v1/creator/workflow': {
      get: {
        summary: 'Creator workflow definition',
        responses: { '200': { description: 'Workflow definition', content: { 'application/json': { schema: json } } } },
      },
    },
    '/api/v1/creator/tutorial': {
      get: {
        summary: 'Creator tutorial',
        responses: { '200': { description: 'Tutorial content', content: { 'application/json': { schema: json } } } },
      },
    },
    '/api/v1/creator/evaluate': {
      post: {
        summary: 'Evaluate creator answers',
        requestBody: { required: true, content: { 'application/json': { schema: json } } },
        responses: { '200': { description: 'Evaluation result', content: { 'application/json': { schema: json } } } },
      },
    },
    '/api/v1/creator/preview': {
      post: {
        summary: 'Preview generated agent bundle',
        requestBody: { required: true, content: { 'application/json': { schema: json } } },
        responses: {
          '200': { description: 'Generated bundle preview', content: { 'application/json': { schema: json } } },
        },
      },
    },
    '/api/v1/creator/generate': {
      post: {
        summary: 'Generate agent bundle',
        requestBody: { required: true, content: { 'application/json': { schema: json } } },
        responses: { '200': { description: 'Generated bundle', content: { 'application/json': { schema: json } } } },
      },
    },
  },
} as const;

export const openApiRouter = Router();

openApiRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});
