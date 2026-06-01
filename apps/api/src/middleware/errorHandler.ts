import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ConflictError, HttpError, NotFoundError, ValidationError } from '../lib/problems.js';
import { logger } from '../lib/logger.js';

const PROBLEM_JSON = 'application/problem+json';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const instance = req.originalUrl;

  // 1) Our typed HttpError family
  if (err instanceof HttpError) {
    res.status(err.status).type(PROBLEM_JSON).json(err.toProblem(instance));
    return;
  }

  // 2) Zod validation
  if (err instanceof ZodError) {
    const e = new ValidationError(
      err.errors.map((it) => ({ path: it.path.join('.'), message: it.message })),
    );
    res.status(e.status).type(PROBLEM_JSON).json(e.toProblem(instance));
    return;
  }

  // 3) Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const e = new ConflictError(
        `Unique constraint violated on ${
          Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(', ') : 'field'
        }`,
      );
      res.status(e.status).type(PROBLEM_JSON).json(e.toProblem(instance));
      return;
    }
    if (err.code === 'P2025') {
      const e = new NotFoundError('Resource');
      res.status(e.status).type(PROBLEM_JSON).json(e.toProblem(instance));
      return;
    }
    if (err.code === 'P2003') {
      const e = new ConflictError('Foreign key constraint violated');
      res.status(e.status).type(PROBLEM_JSON).json(e.toProblem(instance));
      return;
    }
  }

  // 4) Unknown
  logger.error({ err, requestId: req.id, path: req.originalUrl }, 'Unhandled error');
  res.status(500).type(PROBLEM_JSON).json({
    type: 'https://babyapp.example.com/problems/internal',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance,
  });
};
