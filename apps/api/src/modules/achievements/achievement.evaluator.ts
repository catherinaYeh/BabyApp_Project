/**
 * AchievementEvaluator — stub implementation.
 *
 * Phase 8 will implement real condition evaluation against trial state +
 * feeding records. For now, no badges are ever returned, but the integration
 * points (create/update/delete feeding) call evaluate() so swapping the
 * implementation later is a one-file change.
 */

import type { Achievement } from '@prisma/client';

export async function evaluateAchievements(_babyId: string): Promise<Achievement[]> {
  // TODO(Phase 8): query achievements + baby_food_trial + feeding_record,
  // upsert achievement_unlock for newly satisfied conditions, return the new rows.
  return [];
}
