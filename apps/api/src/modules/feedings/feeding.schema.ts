import { z } from 'zod';

const ReactionEnum = z.enum(['NONE', 'MILD', 'SEVERE']);

export const feedingCreateSchema = z.object({
  foodId: z.string().uuid('foodId must be a UUID'),
  fedAt: z.string().datetime({ offset: true, message: 'fedAt must be ISO 8601 with offset' }),
  amountMl: z.number().int().min(1, 'amountMl must be ≥ 1').max(1000, 'amountMl must be ≤ 1000'),
  reaction: ReactionEnum.default('NONE'),
  note: z.string().trim().max(500).optional(),
});

export const feedingUpdateSchema = z.object({
  fedAt: z.string().datetime({ offset: true }).optional(),
  amountMl: z.number().int().min(1).max(1000).optional(),
  reaction: ReactionEnum.optional(),
  note: z.string().trim().max(500).optional(),
});

export const feedingParamsSchema = z.object({
  babyId: z.string().uuid('babyId must be a UUID'),
  feedingId: z.string().uuid('feedingId must be a UUID').optional(),
});

export const babyOnlyParamSchema = z.object({
  babyId: z.string().uuid('babyId must be a UUID'),
});

export const feedingListQuerySchema = z
  .object({
    view: z.enum(['week', 'month']).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    foodId: z.string().uuid().optional(),
    reaction: ReactionEnum.optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => !(q.view && (q.from || q.to)), {
    message: 'view cannot be combined with from/to',
    path: ['view'],
  });

export type FeedingCreateInput = z.infer<typeof feedingCreateSchema>;
export type FeedingUpdateInput = z.infer<typeof feedingUpdateSchema>;
export type FeedingListQuery = z.infer<typeof feedingListQuerySchema>;
