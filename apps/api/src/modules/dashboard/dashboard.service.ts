import type { FoodCategory } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/problems.js';
import { ageInMonths } from '../../lib/ageInMonths.js';
import { getRecommendations } from '../trials/trial.service.js';
import {
  listBabyAchievements,
  type BabyAchievementResponse,
} from '../achievements/achievement.service.js';

const RECENT_UNLOCKS_LIMIT = 5;
const RECOMMENDATIONS_LIMIT = 5;

export type StatusCounts = {
  UNTRIED: number;
  TRYING: number;
  UNLOCKED: number;
  ALLERGIC: number;
};

export type ProgressByCategory = {
  category: FoodCategory;
  unlocked: number;
  total: number;
};

export type ProgressResponse = {
  unlocked: number;
  total: number;
  percent: number;
  byCategory: ProgressByCategory[];
};

export type DashboardResponse = {
  baby: {
    id: string;
    name: string;
    birthDate: string;
    ageMonth: number;
    avatarColor: string;
  };
  statusCounts: StatusCounts;
  progress: ProgressResponse;
  recentUnlocks: BabyAchievementResponse[];
  recommendations: Awaited<ReturnType<typeof getRecommendations>>['data'];
};

async function ensureBaby(babyId: string) {
  const baby = await prisma.baby.findUnique({ where: { id: babyId } });
  if (!baby) throw new NotFoundError('Baby', babyId);
  return baby;
}

export async function getStatusCounts(babyId: string): Promise<StatusCounts> {
  const rows = await prisma.$queryRaw<Array<{ status: keyof StatusCounts; c: bigint }>>(Prisma.sql`
    SELECT status, COUNT(*)::bigint AS c
    FROM baby_food_trial
    WHERE baby_id = ${babyId}::uuid
    GROUP BY status
  `);
  const counts: StatusCounts = { UNTRIED: 0, TRYING: 0, UNLOCKED: 0, ALLERGIC: 0 };
  for (const r of rows) counts[r.status] = Number(r.c);
  return counts;
}

export async function getProgress(babyId: string): Promise<ProgressResponse> {
  await ensureBaby(babyId);
  // Overall + by-category in one round trip.
  const rows = await prisma.$queryRaw<
    Array<{ category: FoodCategory; total: bigint; unlocked: bigint }>
  >(Prisma.sql`
    SELECT
      fi.category                                                  AS category,
      COUNT(*)::bigint                                             AS total,
      COUNT(*) FILTER (WHERE bft.status = 'UNLOCKED')::bigint      AS unlocked
    FROM baby_food_trial bft
    JOIN food_item fi ON fi.id = bft.food_id
    WHERE bft.baby_id = ${babyId}::uuid
    GROUP BY fi.category
    ORDER BY fi.category
  `);
  const byCategory: ProgressByCategory[] = rows.map((r) => ({
    category: r.category,
    unlocked: Number(r.unlocked),
    total: Number(r.total),
  }));
  const total = byCategory.reduce((s, x) => s + x.total, 0);
  const unlocked = byCategory.reduce((s, x) => s + x.unlocked, 0);
  const percent = total === 0 ? 0 : Math.round((unlocked / total) * 1000) / 10;
  return { unlocked, total, percent, byCategory };
}

export async function getDashboard(babyId: string): Promise<DashboardResponse> {
  const baby = await ensureBaby(babyId);

  const [statusCounts, progress, achievementList, recs] = await Promise.all([
    getStatusCounts(babyId),
    getProgress(babyId),
    listBabyAchievements(babyId),
    getRecommendations(babyId, { limit: RECOMMENDATIONS_LIMIT }),
  ]);

  const recentUnlocks = achievementList.data
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
    .slice(0, RECENT_UNLOCKS_LIMIT);

  return {
    baby: {
      id: baby.id,
      name: baby.name,
      birthDate: baby.birthDate.toISOString().slice(0, 10),
      ageMonth: ageInMonths(baby.birthDate),
      avatarColor: baby.avatarColor,
    },
    statusCounts,
    progress,
    recentUnlocks,
    recommendations: recs.data,
  };
}
