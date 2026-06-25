import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ApiError } from '@shared/utils/ApiError';
import { logger } from '@shared/utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  logger.error(`${req.method} ${req.path} → ${err.message}`, { stack: err.stack });

  // ─── Zod Validation Error ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // ─── Prisma Known Errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') ?? 'field';
      res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }
  }

  // ─── Operational API Errors ────────────────────────────────────────────────
  if (err instanceof ApiError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // ─── Unknown Errors ────────────────────────────────────────────────────────
  // Sentry already captured via setupExpressErrorHandler — add extra context here
  Sentry.withScope((scope) => {
    scope.setTag('endpoint', `${req.method} ${req.route?.path ?? req.path}`);
    scope.setTag('module', req.path.split('/')[3] ?? 'unknown'); // e.g. "orders", "payments"
    scope.setExtra('query', req.query);
    scope.setExtra('params', req.params);
    // Omit sensitive fields from body
    const { password, otp, token, ...safeBody } = (req.body ?? {}) as Record<string, unknown>;
    void password; void otp; void token;
    scope.setExtra('body', safeBody);
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
