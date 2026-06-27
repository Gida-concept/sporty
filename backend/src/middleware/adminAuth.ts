import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { AdminSessionService } from '../services/AdminSessionService.js';

/**
 * Express middleware that validates the Bearer token from the Authorization header
 * against the AdminSession database table.
 *
 * Async middleware: if the database is unreachable, the request is denied (fail closed).
 *
 * Usage: router.get('/path', adminAuth, handler)
 */
export async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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
    const session = await AdminSessionService.validate(token);

    if (!session) {
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
  } catch (err) {
    // Database error or unexpected failure — fail closed
    res.status(500).json({
      success: false,
      error: {
        code: 'E999',
        message: 'Authentication service unavailable. Please try again later.',
      },
    });
  }
}

/**
 * Verify a password against the configured ADMIN_TOKEN and create a new
 * database-backed session if it matches.
 *
 * Returns the session token string on success, or null on failure.
 */
export async function createSession(password: string): Promise<string | null> {
  if (password !== config.adminToken) {
    return null;
  }

  try {
    const session = await AdminSessionService.create('admin', 'admin');
    return session.token;
  } catch {
    return null;
  }
}

/**
 * Delete a session from the database (logout).
 * Safe to call even if the token doesn't exist.
 */
export async function destroySession(token: string): Promise<void> {
  await AdminSessionService.delete(token);
}

/**
 * Remove all expired sessions from the database.
 * Returns the count of deleted sessions.
 * Designed to be called by a periodic maintenance cron job or on server startup.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  return AdminSessionService.cleanup();
}
