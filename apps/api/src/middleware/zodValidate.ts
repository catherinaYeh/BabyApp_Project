import type { RequestHandler } from 'express';
import { z, type ZodSchema } from 'zod';

type Schemas = {
  params?: ZodSchema;
  query?: ZodSchema;
  body?: ZodSchema;
};

/**
 * Validates req.{params,query,body} against the supplied schemas.
 * On success, replaces each section with the parsed (and typed) value so downstream
 * handlers see coerced types (e.g. integer query params as numbers).
 */
export const zodValidate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };

export { z };
