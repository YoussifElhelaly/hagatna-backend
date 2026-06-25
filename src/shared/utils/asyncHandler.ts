import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to the global error handler — no try/catch needed in controllers.
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
