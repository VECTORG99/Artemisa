import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, CreatorError, ErrorCodes, formatError } from '../src/errors.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFound } from '../src/middleware/notFound.js';

function createResponse({ headersSent = false } = {}) {
  return {
    headersSent,
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function handle(error, { headersSent = false, nodeEnv } = {}) {
  const previous = process.env.NODE_ENV;
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  const res = createResponse({ headersSent });
  try {
    errorHandler(error, { method: 'POST', path: '/api/v1/creator/generate' }, res, () => {});
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  return res;
}

describe('formatError (src/errors.ts)', () => {
  it('preserves code, status and details of ApiError', () => {
    const error = new ApiError(ErrorCodes.API_VALIDATION_ERROR, 'bad input', 400, { field: 'name' });

    assert.deepEqual(formatError(error), {
      code: ErrorCodes.API_VALIDATION_ERROR,
      message: 'bad input',
      statusCode: 400,
      details: { field: 'name' },
      isOperational: true,
    });
  });

  it('defaults ApiError to status 500 and operational true', () => {
    const formatted = formatError(new ApiError(ErrorCodes.INTERNAL_ERROR, 'boom'));

    assert.equal(formatted.statusCode, 500);
    assert.equal(formatted.isOperational, true);
    assert.equal(formatted.details, undefined);
  });

  it('keeps the concrete subclass name on the error', () => {
    assert.equal(new ApiError(ErrorCodes.API_RATE_LIMITED, 'slow down', 429).name, 'ApiError');
    assert.equal(new CreatorError(ErrorCodes.CREATOR_GENERATION_FAILED, 'no bundle').name, 'CreatorError');
  });

  it('maps a plain Error to a non-operational internal error', () => {
    assert.deepEqual(formatError(new Error('unexpected')), {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'unexpected',
      statusCode: 500,
      isOperational: false,
    });
  });

  it('stringifies non-Error throwables', () => {
    assert.deepEqual(formatError('just a string'), {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'just a string',
      statusCode: 500,
      isOperational: false,
    });
    assert.equal(formatError(undefined).message, 'undefined');
  });
});

describe('errorHandler (src/middleware/errorHandler.ts)', () => {
  it('responds with the error status, code and message', () => {
    const res = handle(new ApiError(ErrorCodes.API_VALIDATION_ERROR, 'bad input', 400), { nodeEnv: 'test' });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: { code: ErrorCodes.API_VALIDATION_ERROR, message: 'bad input' } });
  });

  it('includes details outside production', () => {
    const error = new CreatorError(ErrorCodes.CREATOR_INPUT_ERROR, 'invalid answers', 422, [{ path: 'answers' }]);

    const res = handle(error, { nodeEnv: 'development' });

    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.body.error.details, [{ path: 'answers' }]);
  });

  for (const nodeEnv of ['production', 'Production', 'PRODUCTION']) {
    it(`omits details when NODE_ENV is "${nodeEnv}"`, () => {
      const error = new CreatorError(ErrorCodes.CREATOR_INPUT_ERROR, 'invalid answers', 422, { secret: 'internal' });

      const res = handle(error, { nodeEnv });

      assert.deepEqual(res.body, { error: { code: ErrorCodes.CREATOR_INPUT_ERROR, message: 'invalid answers' } });
    });
  }

  it('never leaks a stack trace for unexpected errors', () => {
    const res = handle(new TypeError('cannot read property of undefined'), { nodeEnv: 'development' });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, ErrorCodes.INTERNAL_ERROR);
    assert.equal('stack' in res.body.error, false);
    assert.doesNotMatch(JSON.stringify(res.body), /at .*errorHandler/);
  });

  it('does not write a body when headers were already sent', () => {
    const res = handle(new Error('too late'), { headersSent: true, nodeEnv: 'test' });

    assert.equal(res.statusCode, undefined);
    assert.equal(res.body, undefined);
  });
});

describe('notFound (src/middleware/notFound.ts)', () => {
  it('forwards a 404 ApiError naming method and path', () => {
    let forwarded;
    notFound({ method: 'GET', path: '/api/v1/nope' }, createResponse(), (error) => {
      forwarded = error;
    });

    assert.ok(forwarded instanceof ApiError);
    assert.equal(formatError(forwarded).statusCode, 404);
    assert.equal(forwarded.code, ErrorCodes.API_VALIDATION_ERROR);
    assert.equal(forwarded.message, 'Route not found: GET /api/v1/nope');
  });
});
