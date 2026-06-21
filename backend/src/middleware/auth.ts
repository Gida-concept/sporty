import type { Request, Response, NextFunction } from 'express';
import { config } from '@/config/index.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'E010',
        message: 'Missing or invalid authorization header. Expected: Bearer <token>',
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  if (token !== config.webhookSecret) {
    res.status(401).json({
      success: false,
      error: {
        code: 'E010',
        message: 'Invalid authentication token.',
      },
    });
    return;
  }

  next();
}
