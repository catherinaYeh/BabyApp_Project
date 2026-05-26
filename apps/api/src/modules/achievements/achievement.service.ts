import type { Achievement } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/problems.js';
import { isCondition, type Condition } from './achievement.condition.js';
import { progressFor } from './achievement.evaluator.js';

export type AchievementResponse = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  condition: unknown;
};

export type BabyAchievementResponse = {
  achievement: AchievementResponse;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number } | null;
};

const toResponse = (a: Achievement): AchievementResponse => ({
  id: a.id,
  code: a.code,
  name: a.name,
  description: a.description,
  icon: a.icon,
  condition: a.condition,
});

export async function listAchievements(): Promise<{ data: AchievementResponse[] }> {
  const rows = await prisma.achievement.findMany({ orderBy: { code: 'asc' } });
  return { data: rows.map(toResponse) };
}

export async function listBabyAchievements(
  babyId: string,
): Promise<{ data: BabyAchievementResponse[] }> {
  const exists = await prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
  if (!exists) throw new NotFoundError('Baby', babyId);

  const [achievements, unlocks] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { code: 'asc' } }),
    prisma.achievementUnlock.findMany({ where: { babyId } }),
  ]);
  const unlockMap = new Map(unlocks.map((u) => [u.achievementId, u]));

  const data: BabyAchievementResponse[] = [];
  for (const ach of achievements) {
    const unlock = unlockMap.get(ach.id);
    const progress = isCondition(ach.condition)
      ? await progressFor(babyId, ach.condition as Condition)
      : null;
    data.push({
      achievement: toResponse(ach),
      unlocked: !!unlock,
      unlockedAt: unlock ? unlock.unlockedAt.toISOString() : null,
      progress,
    });
  }
  return { data };
}
