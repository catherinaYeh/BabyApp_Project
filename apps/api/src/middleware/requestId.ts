import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  req.id = incoming && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
