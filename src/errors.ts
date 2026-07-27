export const ErrorCodes = {
  API_VALIDATION_ERROR: 'API_VALIDATION_ERROR',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  CREATOR_INPUT_ERROR: 'CREATOR_INPUT_ERROR',
  CREATOR_GENERATION_FAILED: 'CREATOR_GENERATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly statusCode = 500,
    readonly details?: unknown,
    readonly isOperational = true,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ApiError extends AppError {}
export class CreatorError extends AppError {}

export function formatError(error: unknown) {
  if (error instanceof AppError)
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      isOperational: error.isOperational,
    };
  if (error instanceof Error)
    return { code: ErrorCodes.INTERNAL_ERROR, message: error.message, statusCode: 500, isOperational: false };
  return { code: ErrorCodes.INTERNAL_ERROR, message: String(error), statusCode: 500, isOperational: false };
}
