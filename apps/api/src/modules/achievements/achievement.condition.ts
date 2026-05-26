import type { FoodCategory, AllergyRisk } from '@prisma/client';

export type Condition =
  | { type: 'UNLOCK_COUNT_BY_CATEGORY'; category: FoodCategory; count: number }
  | { type: 'UNLOCK_COUNT_BY_RISK'; risk: AllergyRisk; count: number }
  | { type: 'FIRST_FEEDING_BY_AGE'; ageMonth: number }
  | { type: 'TOTAL_UNLOCK'; count: number };

export function isCondition(value: unknown): value is Condition {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as { type?: unknown };
  return (
    c.type === 'UNLOCK_COUNT_BY_CATEGORY' ||
    c.type === 'UNLOCK_COUNT_BY_RISK' ||
    c.type === 'FIRST_FEEDING_BY_AGE' ||
    c.type === 'TOTAL_UNLOCK'
  );
}
