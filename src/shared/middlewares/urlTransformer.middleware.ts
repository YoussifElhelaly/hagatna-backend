import { Request, Response, NextFunction } from 'express';
import { traverseAndTransform } from '../utils/urlTransformer';

export const urlTransformerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  
  if (req.body) {
    traverseAndTransform(req.body, 'toRelative', origin);
  }
  if (req.query) {
    traverseAndTransform(req.query, 'toRelative', origin);
  }
  
  next();
};
