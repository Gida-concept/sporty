import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

interface AdminSession {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessions = new Map<string, AdminSession>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  cleanupExpiredSessions();
}, CLEANUP_INTERVAL_MS);

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
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
  const session = sessions.get(token);

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      sessions.delete(token);
    }
    res.status(401).json({
      success: false,
      error: {
        code: 'E011',
        message: 'Session expired or invalid. Please login again.',
      },
    });
    return;
  }

  next();
}

export function createSession(password: string): string | null {
  if (password !== config.adminToken) {
    return null;
  }

  const now = new Date();
  const token = crypto.randomUUID();

  sessions.set(token, {
    token,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });

  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}
