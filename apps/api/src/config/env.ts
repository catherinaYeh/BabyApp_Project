import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Runtime connection (Supabase transaction pooler, port 6543).
  DATABASE_URL: z.string().url(),
  // Direct/session connection (port 5432) used by Prisma Migrate. Optional at
  // app runtime (the server only needs DATABASE_URL), but REQUIRED whenever you
  // run `prisma migrate`/`db push` against Supabase — see schema.prisma.
  DIRECT_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
