import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const errorCodeStatusMap: Record<string, number> = {
  E001: 429,
  E010: 401,
  E011: 500,
  E012: 400,
};

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    level: 'error',
    message: err.message || 'Unknown error',
    timestamp,
    service: 'backend',
    code: process.env.NODE_ENV === 'production' ? 500 : (err as any).statusCode || 500,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
  console.log(logEntry);

  if (err instanceof AppError) {
    const statusCode = err.statusCode ?? errorCodeStatusMap[err.code] ?? 500;

    const body: {
      success: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
        stack?: string;
      };
    } = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    if (config.nodeEnv !== 'production') {
      body.error.stack = err.stack;
    }

    res.status(statusCode).json(body);
    return;
  }

  const body: {
    success: false;
    error: {
      code: string;
      message: string;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      code: 'E999',
      message: 'Internal server error',
    },
  };

  if (config.nodeEnv !== 'production') {
    body.error.message = err.message;
    body.error.stack = err.stack;
  }

  res.status(500).json(body);
}
