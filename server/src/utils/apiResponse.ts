import type { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  error: {
    code: string;
  };
}

export function sendSuccess<T>(
  response: Response,
  message: string,
  data: T,
  statusCode = 200,
): void {
  response.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies ApiSuccess<T>);
}

export function sendFailure(
  response: Response,
  message: string,
  code: string,
  statusCode: number,
): void {
  response.status(statusCode).json({
    success: false,
    message,
    error: { code },
  } satisfies ApiFailure);
}
