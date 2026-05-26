// jest setup
process.env.NODE_ENV ??= 'test';
process.env.LOG_LEVEL ??= 'fatal';
process.env.PORT ??= '3001';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.DATABASE_URL ??=
  'postgresql://baby:baby_dev@localhost:5432/baby_weaning_test?schema=public';
