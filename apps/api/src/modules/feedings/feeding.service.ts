import type { Achievement, FeedingRecord as PrismaFeeding, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/problems.js';
import { refreshTrialView } from '../../lib/refreshTrialView.js';
import { evaluateAchievements } from '../achievements/achievement.evaluator.js';
import type { FeedingCreateInput, FeedingListQuery, FeedingUpdateInput } from './feeding.schema.js';

export type FeedingResponse = {
  id: string;
  babyId: string;
  foodId: string;
  fedAt: string;
  amountMl: number;
  attemptCount: number;
  reaction: PrismaFeeding['reaction'];
  note: string | null;
  createdAt: string;
};

const toResponse = (f: PrismaFeeding): FeedingResponse => ({
  id: f.id,
  babyId: f.babyId,
  foodId: f.foodId,
  fedAt: f.fedAt.toISOString(),
  amountMl: f.amountMl,
  attemptCount: f.attemptCount,
  reaction: f.reaction,
  note: f.note,
  createdAt: f.createdAt.toISOString(),
});

async function ensureBaby(babyId: string): Promise<void> {
  const exists = await prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
  if (!exists) throw new NotFoundError('Baby', babyId);
}

async function ensureFood(foodId: string): Promise<void> {
  const exists = await prisma.foodItem.findUnique({ where: { id: foodId }, select: { id: true } });
  if (!exists) throw new NotFoundError('Food', foodId);
}

function rangeFromView(view: 'week' | 'month', now: Date = new Date()): { from: Date; to: Date } {
  const ref = new Date(now);
  if (view === 'week') {
    // ISO week: Monday 00:00 to Sunday 23:59:59.999, local timezone.
    const day = ref.getDay();
    const diffToMonday = (day + 6) % 7;
    const from = new Date(ref);
    from.setDate(ref.getDate() - diffToMonday);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    to.setMilliseconds(-1);
    return { from, to };
  }
  // month
  const from = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0);
  to.setMilliseconds(-1);
  return { from, to };
}

export async function listFeedings(
  babyId: string,
  query: FeedingListQuery,
): Promise<{
  data: FeedingResponse[];
  meta: { nextCursor: string | null; total: number };
}> {
  await ensureBaby(babyId);

  let from: Date | undefined = query.from ? new Date(query.from) : undefined;
  let to: Date | undefined = query.to ? new Date(query.to) : undefined;
  if (query.view) {
    const r = rangeFromView(query.view);
    from = r.from;
    to = r.to;
  }

  const where: Prisma.FeedingRecordWhereInput = {
    babyId,
    ...(from || to
      ? { fedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
    ...(query.foodId ? { foodId: query.foodId } : {}),
    ...(query.reaction ? { reaction: query.reaction } : {}),
  };

  const total = await prisma.feedingRecord.count({ where });
  const rows = await prisma.feedingRecord.findMany({
    where,
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: { fedAt: 'desc' },
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    data: page.map(toResponse),
    meta: { nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null, total },
  };
}

export async function getFeeding(babyId: string, feedingId: string): Promise<FeedingResponse> {
  const row = await prisma.feedingRecord.findFirst({ where: { id: feedingId, babyId } });
  if (!row) throw new NotFoundError('FeedingRecord', feedingId);
  return toResponse(row);
}

export type FeedingCreateResponse = {
  feeding: FeedingResponse;
  newlyUnlockedAchievements: Achievement[];
};

export async function createFeeding(
  babyId: string,
  input: FeedingCreateInput,
): Promise<FeedingCreateResponse> {
  await ensureBaby(babyId);
  await ensureFood(input.foodId);

  const fedAt = new Date(input.fedAt);

  // attemptCount = existing count for (baby, food) + 1
  const existingCount = await prisma.feedingRecord.count({
    where: { babyId, foodId: input.foodId },
  });

  let row: PrismaFeeding;
  try {
    row = await prisma.feedingRecord.create({
      data: {
        babyId,
        foodId: input.foodId,
        fedAt,
        amountMl: input.amountMl,
        attemptCount: existingCount + 1,
        reaction: input.reaction,
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });
  } catch (err) {
    // Surface a clear duplicate message when (babyId, foodId, fedAt) is taken.
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      throw new ConflictError(
        `A feeding record already exists for this baby/food at ${fedAt.toISOString()}`,
      );
    }
    throw err;
  }

  await refreshTrialView();
  const newlyUnlockedAchievements = await evaluateAchievements(babyId);
  return { feeding: toResponse(row), newlyUnlockedAchievements };
}

export async function updateFeeding(
  babyId: string,
  feedingId: string,
  input: FeedingUpdateInput,
): Promise<FeedingResponse> {
  const existing = await prisma.feedingRecord.findFirst({
    where: { id: feedingId, babyId },
  });
  if (!existing) throw new NotFoundError('FeedingRecord', feedingId);

  const row = await prisma.feedingRecord.update({
    where: { id: feedingId },
    data: {
      ...(input.fedAt ? { fedAt: new Date(input.fedAt) } : {}),
      ...(input.amountMl !== undefined ? { amountMl: input.amountMl } : {}),
      ...(input.reaction ? { reaction: input.reaction } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    },
  });
  await refreshTrialView();
  await evaluateAchievements(babyId);
  return toResponse(row);
}

export async function deleteFeeding(babyId: string, feedingId: string): Promise<void> {
  const existing = await prisma.feedingRecord.findFirst({
    where: { id: feedingId, babyId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('FeedingRecord', feedingId);
  await prisma.feedingRecord.delete({ where: { id: feedingId } });
  await refreshTrialView();
  await evaluateAchievements(babyId);
}
