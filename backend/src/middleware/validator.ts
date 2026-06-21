import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: z.ZodSchema, target?: ValidationTarget) {
  const t = target ?? 'body';

  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[t]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'E012',
          message: 'Validation failed',
          details: result.error.issues,
        },
      });
      return;
    }

    next();
  };
}
