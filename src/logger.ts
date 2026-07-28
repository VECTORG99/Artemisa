import pino from 'pino';
import crypto from 'crypto';

const production = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Credentials must never reach the log stream, even when a whole request,
  // header bag or config object is logged by accident.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers["x-metrics-token"]',
      'headers.authorization',
      'headers["x-api-key"]',
      'headers["x-metrics-token"]',
      'authorization',
      'apiKey',
      'api_key',
      'token',
      'secret',
      'password',
      'ARTEMISA_API_KEYS',
      'BYPASS_SECRET',
      'METRICS_SECRET',
      '*.authorization',
      '*.apiKey',
      '*.api_key',
      '*.token',
      '*.secret',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
  transport: production
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
});

/**
 * Create a child logger with a correlation ID.
 * If no reqId is provided, generates one automatically.
 */
export function requestLogger(reqId?: string) {
  return logger.child({ reqId: reqId || crypto.randomUUID().slice(0, 8) });
}
