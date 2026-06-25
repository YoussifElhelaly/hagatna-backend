import { Response } from 'express';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  extra?: Record<string, unknown>;
}

export const sendSuccess = <T>({
  res,
  statusCode = 200,
  message,
  data,
  meta,
  extra,
}: ApiResponseOptions<T>): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta && { meta }),
    ...(extra && { ...extra }),
  });
};

export const sendCreated = <T>(res: Response, message: string, data?: T): Response => {
  return sendSuccess({ res, statusCode: 201, message, data });
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
