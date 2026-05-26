import { z } from 'zod';

const FoodCategoryEnum = z.enum([
  'VEGETABLE',
  'MUSHROOM',
  'FRUIT',
  'SEAFOOD',
  'MEAT',
  'EGG',
  'DAIRY',
  'GRAIN',
  'NUT',
  'OTHER',
]);

export const trialListQuerySchema = z.object({
  status: z.enum(['UNTRIED', 'TRYING', 'UNLOCKED', 'ALLERGIC']).optional(),
  category: FoodCategoryEnum.optional(),
});

export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type TrialListQuery = z.infer<typeof trialListQuerySchema>;
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;
