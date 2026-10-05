import type { RequestHandler } from 'express';
import { sendSuccess } from '../utils/apiResponse';

export const getHealth: RequestHandler = (_request, response) => {
  sendSuccess(response, 'Server is running.', { status: 'ok' });
};
