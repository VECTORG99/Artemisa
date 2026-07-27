export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  checks: {
    memory: { status: string; used_mb: number; limit_mb: number; percent: number };
    disk: { status: string };
  };
  version: string;
}

const MAX_MEMORY_PERCENT = 90;
const startTime = Date.now();

/**
 * Deep health check for the Creator backend (#584).
 * The Creator is stateless: there is no database, LLM provider or MCP pool to
 * probe, so health only reports process-level signals.
 */
export function deepHealthCheck(): HealthStatus {
  const mem = process.memoryUsage();
  const usedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const limitMb = Math.round(mem.heapTotal / 1024 / 1024);
  const percent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  const checks: HealthStatus['checks'] = {
    memory: {
      status: percent > MAX_MEMORY_PERCENT ? 'warning' : 'ok',
      used_mb: usedMb,
      limit_mb: limitMb,
      percent,
    },
    disk: { status: 'ok' },
  };

  const status = checks.memory.status === 'warning' ? 'degraded' : 'healthy';

  return {
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || '0.0.0',
  };
}
