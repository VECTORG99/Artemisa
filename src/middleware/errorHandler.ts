import type { ErrorRequestHandler } from 'express';
import { formatError } from '../errors.js';
import { logger } from '../logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const formatted = formatError(err);
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  // Always log full error with stack (server-side only)
  logger.error({ err, method: req.method, path: req.path, code: formatted.code }, formatted.message);
  if (res.headersSent) {
    // The response is already on the wire, so the error cannot be reported to
    // the client; delegate to Express so the connection is torn down instead of
    // leaving the request hanging.
    next(err);
    return;
  }
  // Never include stack traces in response — only operational details
  const safeDetails = isProduction ? undefined : formatted.details;
  // Unexpected failures carry implementation details in their message, so in
  // production the client only learns the status; the log keeps the detail.
  const message = isProduction && !formatted.isOperational ? 'Internal server error' : formatted.message;
  res.status(formatted.statusCode).json({
    error: {
      code: formatted.code,
      message,
      ...(safeDetails === undefined ? {} : { details: safeDetails }),
    },
  });
};
