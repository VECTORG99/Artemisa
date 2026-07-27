import { config } from './config.js';
import { logger } from './logger.js';
import { app } from './app.js';

// Production startup security warnings
if (process.env.NODE_ENV === 'production' && !process.env.BYPASS_SECRET) {
  logger.warn('[SECURITY] BYPASS_SECRET not configured in production — admin bypass disabled');
}
if (process.env.NODE_ENV === 'production' && !process.env.HUASCAR_API_KEYS) {
  logger.warn('[SECURITY] HUASCAR_API_KEYS not configured — API authentication disabled');
}

const server = app.listen(config.server.port, config.server.host, () => {
  logger.info({ host: config.server.host, port: config.server.port }, 'Huascar Backend running');
});

let shuttingDown = false;

/**
 * Graceful shutdown (#584): the Creator is stateless, so shutdown only stops
 * accepting connections and drains the ones already open.
 */
async function gracefulShutdown(signal: string, exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'graceful shutdown started');

  const timeout = setTimeout(() => {
    logger.error({ signal }, 'shutdown timeout, forcing exit');
    process.exit(1);
  }, 15_000);
  timeout.unref();

  // Stop accepting new connections and let in-flight requests finish
  await new Promise<void>((resolve) => server.close(() => resolve()));

  clearTimeout(timeout);
  process.exit(exitCode);
}

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  void gracefulShutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandled rejection');
  void gracefulShutdown('unhandledRejection', 1);
});
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM', 0));
process.on('SIGINT', () => void gracefulShutdown('SIGINT', 0));
