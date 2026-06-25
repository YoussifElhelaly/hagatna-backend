import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

interface ValidateSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Zod validation middleware.
 * Validates body, query, and/or params against provided schemas.
 * On failure, throws a ZodError which is caught by the global error handler.
 *
 * @example
 * router.post('/register', validate({ body: RegisterSchema }), register);
 */
export const validate = (schemas: ValidateSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query;
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  };
};
