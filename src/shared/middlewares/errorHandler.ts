import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ApiError } from '@shared/utils/ApiError';
import { logger } from '@shared/utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'File is too large. Images must be under 5 MB, documents under 10 MB',
  LIMIT_FILE_COUNT: 'Too many files uploaded',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
  LIMIT_PART_COUNT: 'Too many parts in the upload',
};

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

  // ─── Multer Upload Errors ──────────────────────────────────────────────────
  if (err instanceof MulterError) {
    const message = MULTER_MESSAGES[err.code] ?? `Upload error: ${err.message}`;
    res.status(400).json({
      success: false,
      message,
      ...(err.field && { errors: [{ field: err.field, message }] }),
    });
    return;
  }

  // ─── Prisma Known Errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error(`Prisma error code: ${err.code}`, { meta: err.meta });

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
    if (err.code === 'P2003') {
      const field = (err.meta?.field_name as string) ?? 'foreign key';
      res.status(400).json({
        success: false,
        message: `Related record not found (${field})`,
      });
      return;
    }
    if (err.code === 'P2014') {
      res.status(400).json({
        success: false,
        message: 'Required relation violation',
      });
      return;
    }
    // Catch-all for other Prisma known errors
    res.status(400).json({
      success: false,
      message: `Database error: ${err.code}`,
    });
    return;
  }

  // ─── Prisma Unknown/Rust Errors ────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    logger.error('PrismaClientUnknownRequestError', { stack: err.stack });
  }
  if (err instanceof Prisma.PrismaClientRustPanicError) {
    logger.error('PrismaClientRustPanicError — possible DB corruption or connection issue', { stack: err.stack });
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('PrismaClientInitializationError — failed to connect to database', { stack: err.stack });
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
