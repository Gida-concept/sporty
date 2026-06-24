import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { createSession } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validator.js';

const router: Router = Router();
const loginLimiter = createRateLimiter({
  windowMs: 3600000,
  max: 10,
  message: 'Too many login attempts',
});

const loginSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

router.post('/login', loginLimiter, validate(loginSchema), (req: Request, res: Response) => {
  const { token } = req.body;
  const sessionToken = createSession(token);

  if (!sessionToken) {
    res.status(401).json({
      success: false,
      error: {
        code: 'E010',
        message: 'Admin authentication failure: invalid token',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      authenticated: true,
      session_token: sessionToken,
      expires_in: 86400,
      message: 'Authentication successful',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
