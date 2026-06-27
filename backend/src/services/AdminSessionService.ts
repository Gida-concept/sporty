import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';

export interface SessionData {
  id: string;
  token: string;
  username: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

const SESSION_TTL_MS = config.adminSessionTtlMs;

export class AdminSessionService {
  /**
   * Create a new session with a cryptographically secure random token.
   * Cleans up any existing sessions for the same username.
   */
  static async create(username: string, role: string = 'admin'): Promise<SessionData> {
    const token = generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    // Clean up old sessions for this username to prevent accumulation
    await prisma.adminSession.deleteMany({
      where: { username },
    }).catch(() => {
      // Non-critical cleanup — ignore failures
    });

    const session = await prisma.adminSession.create({
      data: {
        token,
        username,
        role,
        createdAt: now,
        expiresAt,
      },
    });

    return session;
  }

  /**
   * Validate a bearer token. Returns the session data if valid,
   * or null if the token is expired or not found.
   *
   * Expired sessions are cleaned up on read to prevent table bloat.
   */
  static async validate(token: string): Promise<SessionData | null> {
    try {
      const session = await prisma.adminSession.findUnique({
        where: { token },
      });

      if (!session) return null;

      if (session.expiresAt < new Date()) {
        // Clean up expired session
        await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
        return null;
      }

      return session;
    } catch {
      // Database unreachable: fail closed (deny access)
      return null;
    }
  }

  /**
   * Delete a session (used for logout).
   * Uses deleteMany so it's safe even if the token doesn't exist.
   */
  static async delete(token: string): Promise<void> {
    try {
      await prisma.adminSession.deleteMany({
        where: { token },
      });
    } catch {
      // Ignore deletion failures — session may already be gone
    }
  }

  /**
   * Remove all expired sessions from the database.
   * Returns the count of deleted sessions.
   * Designed to be called by a periodic maintenance cron job.
   */
  static async cleanup(): Promise<number> {
    const result = await prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}

/**
 * Generate a cryptographically secure 64-character hex token.
 * Uses Node.js built-in crypto module (no external dependencies).
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
