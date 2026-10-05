import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../services/auth.service';

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHENTICATED', 'A bearer access token is required.'));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError(401, 'UNAUTHENTICATED', 'A bearer access token is required.'));
    return;
  }

  try {
    request.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};
