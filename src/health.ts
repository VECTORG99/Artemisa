import fs from 'node:fs';
import os from 'node:os';

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

function readMemoryMb(file: string): number | undefined {
  try {
    const text = fs.readFileSync(file, 'utf8').trim();
    if (text === 'max') return undefined;
    const bytes = Number(text);
    if (!Number.isFinite(bytes) || bytes <= 0) return undefined;
    return Math.floor(bytes / 1024 / 1024);
  } catch {
    return undefined;
  }
}

function getMemoryLimitMb(): number {
  const cgroupLimit =
    readMemoryMb('/sys/fs/cgroup/memory.max') ?? readMemoryMb('/sys/fs/cgroup/memory/memory.limit_in_bytes');
  const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
  if (!cgroupLimit || cgroupLimit > totalMb) return totalMb;
  return cgroupLimit;
}

/**
 * Deep health check for the Creator backend (#584).
 * The Creator is stateless: there is no database, LLM provider or MCP pool to
 * probe, so health only reports process-level signals.
 *
 * Memory is measured against the real container limit (cgroup v1/v2) or the
 * host total memory, not the V8 heap total. This avoids false "degraded"
 * reports when the heap is nearly full but the process is far from the
 * container limit.
 */
export function deepHealthCheck(): HealthStatus {
  const usedMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const limitMb = getMemoryLimitMb();
  const percent = limitMb === 0 ? 0 : Math.min(100, Math.round((usedMb / limitMb) * 100));

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
