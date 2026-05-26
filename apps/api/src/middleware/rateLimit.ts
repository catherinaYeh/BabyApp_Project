import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: env.NODE_ENV === 'test' ? 10_000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://babyapp.example.com/problems/rate-limited',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Rate limit exceeded; please retry later.',
  },
});
