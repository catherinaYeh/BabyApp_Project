import { z } from 'zod';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const todayLocal = (): Date => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be ISO date (YYYY-MM-DD)')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d <= todayLocal();
  }, 'birthDate must not be in the future');

export const babyCreateSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(30, 'name must be ≤ 30 characters'),
  birthDate: birthDateSchema,
  avatarColor: z.string().regex(HEX_COLOR, 'avatarColor must match #RRGGBB').optional(),
});

export const babyUpdateSchema = babyCreateSchema.partial();

export const babyIdParamSchema = z.object({
  babyId: z.string().uuid('babyId must be a UUID'),
});

export const babyListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type BabyCreateInput = z.infer<typeof babyCreateSchema>;
export type BabyUpdateInput = z.infer<typeof babyUpdateSchema>;
export type BabyListQuery = z.infer<typeof babyListQuerySchema>;
