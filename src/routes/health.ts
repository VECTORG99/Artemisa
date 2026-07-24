import { Router } from 'express';
import type { Store } from '../engine/Store.js';
import { deepHealthCheck } from '../health.js';

export function createHealthRouter(store: Store | null): Router {
  const router = Router();

  /**
   * GET /api/health — Deep health check.
   * Returns 200 if healthy/degraded, 503 if unhealthy.
   * Used by Docker HEALTHCHECK and orchestrators.
   */
  router.get('/health', (_req, res) => {
    const result = deepHealthCheck(store);
    const statusCode = result.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(result);
  });

  /**
   * GET /api/health/live — Liveness probe.
   * Always returns 200 if the process is running.
   * Used by container orchestrators for restart decisions.
   */
  router.get('/health/live', (_req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/health/ready — Readiness probe.
   * Returns 200 only if all dependencies are available.
   * Used by load balancers to decide if instance can accept traffic.
   */
  router.get('/health/ready', (_req, res) => {
    const result = deepHealthCheck(store);
    const ready = result.status !== 'unhealthy';
    res.status(ready ? 200 : 503).json({
      ready,
      ...result,
    });
  });

  return router;
}

// Legacy export for backward compatibility during transition
export const healthRouter = Router();
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'Huascar Backend Online' });
});
