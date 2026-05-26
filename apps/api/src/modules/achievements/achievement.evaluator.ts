import type { Achievement } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { ageInMonths } from '../../lib/ageInMonths.js';
import { isCondition, type Condition } from './achievement.condition.js';

/**
 * Per-condition current progress for a baby. Returns `null` when the source
 * data necessary for evaluation is unavailable (e.g. baby not found).
 */
export async function progressFor(
  babyId: string,
  condition: Condition,
): Promise<{ current: number; target: number } | null> {
  switch (condition.type) {
    case 'UNLOCK_COUNT_BY_CATEGORY': {
      const rows = await prisma.$queryRaw<[{ c: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM baby_food_trial bft
        JOIN food_item fi ON fi.id = bft.food_id
        WHERE bft.baby_id = ${babyId}::uuid
          AND bft.status = 'UNLOCKED'
          AND fi.category = ${condition.category}::"FoodCategory"
      `);
      return { current: Number(rows[0]?.c ?? 0), target: condition.count };
    }
    case 'UNLOCK_COUNT_BY_RISK': {
      const rows = await prisma.$queryRaw<[{ c: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM baby_food_trial bft
        JOIN food_item fi ON fi.id = bft.food_id
        WHERE bft.baby_id = ${babyId}::uuid
          AND bft.status = 'UNLOCKED'
          AND fi.allergy_risk = ${condition.risk}::"AllergyRisk"
      `);
      return { current: Number(rows[0]?.c ?? 0), target: condition.count };
    }
    case 'TOTAL_UNLOCK': {
      const c = await prisma.$queryRaw<[{ c: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM baby_food_trial
        WHERE baby_id = ${babyId}::uuid AND status = 'UNLOCKED'
      `);
      return { current: Number(c[0]?.c ?? 0), target: condition.count };
    }
    case 'FIRST_FEEDING_BY_AGE': {
      const baby = await prisma.baby.findUnique({
        where: { id: babyId },
        select: { birthDate: true },
      });
      if (!baby) return null;
      // The achievement unlocks if there exists a FeedingRecord whose
      // `ageInMonths(birthDate, fedAt) <= ageMonth`.
      const feedings = await prisma.feedingRecord.findMany({
        where: { babyId },
        select: { fedAt: true },
        orderBy: { fedAt: 'asc' },
        take: 1,
      });
      if (feedings.length === 0) return { current: 0, target: 1 };
      const earliest = feedings[0]!.fedAt;
      const ageAtFirst = ageInMonths(baby.birthDate, earliest);
      return { current: ageAtFirst <= condition.ageMonth ? 1 : 0, target: 1 };
    }
  }
}

/**
 * Evaluate all achievements for a baby. Upserts unlock rows for newly satisfied
 * conditions and returns those newly-unlocked Achievement records (so the API
 * response can include them for the badge-pop toast).
 */
export async function evaluateAchievements(babyId: string): Promise<Achievement[]> {
  const baby = await prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
  if (!baby) return [];

  const [achievements, existingUnlocks] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.achievementUnlock.findMany({
      where: { babyId },
      select: { achievementId: true },
    }),
  ]);
  const alreadyUnlocked = new Set(existingUnlocks.map((u) => u.achievementId));

  const newlyUnlocked: Achievement[] = [];

  for (const ach of achievements) {
    if (alreadyUnlocked.has(ach.id)) continue;
    if (!isCondition(ach.condition)) {
      logger.warn(
        { achievementCode: ach.code, condition: ach.condition },
        'Skipping achievement with unknown condition shape',
      );
      continue;
    }
    const prog = await progressFor(babyId, ach.condition);
    if (!prog) continue;
    if (prog.current >= prog.target) {
      await prisma.achievementUnlock.create({
        data: { babyId, achievementId: ach.id },
      });
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}
