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

const AllergyRiskEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const foodCreateSchema = z.object({
  name: z.string().trim().min(1).max(30),
  category: FoodCategoryEnum,
  allergyRisk: AllergyRiskEnum,
});

export const foodUpdateSchema = foodCreateSchema.partial();

export const foodIdParamSchema = z.object({
  foodId: z.string().uuid('foodId must be a UUID'),
});

export const foodListQuerySchema = z.object({
  category: FoodCategoryEnum.optional(),
  allergyRisk: AllergyRiskEnum.optional(),
  search: z.string().trim().min(1).max(30).optional(),
  sort: z.enum(['risk_asc', 'risk_desc', 'name_asc', 'name_desc']).default('risk_asc'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type FoodCreateInput = z.infer<typeof foodCreateSchema>;
export type FoodUpdateInput = z.infer<typeof foodUpdateSchema>;
export type FoodListQuery = z.infer<typeof foodListQuerySchema>;
