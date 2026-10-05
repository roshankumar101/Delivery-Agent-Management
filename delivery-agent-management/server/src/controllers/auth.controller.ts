import type { RequestHandler } from 'express';
import { getCurrentUser, login } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/apiResponse';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const loginController: RequestHandler = async (request, response) => {
  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  const email = body.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !body.password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A valid email and password are required.');
  }

  const result = await login(email, body.password);
  sendSuccess(response, 'Login successful.', result);
};

export const currentUserController: RequestHandler = async (request, response) => {
  const auth = request.auth;
  if (!auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  const user = await getCurrentUser(auth.userId);
  sendSuccess(response, 'Current user retrieved.', user);
};
