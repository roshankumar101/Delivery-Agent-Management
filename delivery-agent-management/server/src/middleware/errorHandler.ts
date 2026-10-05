import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { sendFailure } from '../utils/apiResponse';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    sendFailure(response, error.message, error.code, error.statusCode);
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    sendFailure(response, 'Request body contains invalid JSON.', 'INVALID_JSON', 400);
    return;
  }

  console.error('Unhandled request error', {
    method: request.method,
    path: request.path,
    error,
  });
  sendFailure(response, 'An unexpected server error occurred.', 'INTERNAL_SERVER_ERROR', 500);
};
