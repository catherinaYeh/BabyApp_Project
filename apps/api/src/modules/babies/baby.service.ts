import type { Baby as PrismaBaby } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/problems.js';
import { ageInMonths } from '../../lib/ageInMonths.js';
import { refreshTrialView } from '../../lib/refreshTrialView.js';
import type { BabyCreateInput, BabyListQuery, BabyUpdateInput } from './baby.schema.js';

export type BabyResponse = {
  id: string;
  name: string;
  birthDate: string;
  ageMonth: number;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
};

const toResponse = (b: PrismaBaby, now: Date = new Date()): BabyResponse => ({
  id: b.id,
  name: b.name,
  birthDate: b.birthDate.toISOString().slice(0, 10),
  ageMonth: ageInMonths(b.birthDate, now),
  avatarColor: b.avatarColor,
  createdAt: b.createdAt.toISOString(),
  updatedAt: b.updatedAt.toISOString(),
});

export async function listBabies(
  query: BabyListQuery,
): Promise<{ data: BabyResponse[]; meta: { nextCursor: string | null; total: number } }> {
  const total = await prisma.baby.count();
  const rows = await prisma.baby.findMany({
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'asc' },
  });
  const hasMore = rows.length > query.limit;
  const data = hasMore ? rows.slice(0, query.limit) : rows;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;
  const now = new Date();
  return { data: data.map((r) => toResponse(r, now)), meta: { nextCursor, total } };
}

export async function getBaby(id: string): Promise<BabyResponse> {
  const row = await prisma.baby.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Baby', id);
  return toResponse(row);
}

export async function createBaby(input: BabyCreateInput): Promise<BabyResponse> {
  const row = await prisma.baby.create({
    data: {
      name: input.name,
      birthDate: new Date(`${input.birthDate}T00:00:00Z`),
      ...(input.avatarColor ? { avatarColor: input.avatarColor } : {}),
    },
  });
  // MV is CROSS JOIN baby × food_item; new baby needs an UNTRIED row per food.
  await refreshTrialView();
  return toResponse(row);
}

export async function updateBaby(id: string, input: BabyUpdateInput): Promise<BabyResponse> {
  const exists = await prisma.baby.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError('Baby', id);
  const row = await prisma.baby.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.birthDate !== undefined
        ? { birthDate: new Date(`${input.birthDate}T00:00:00Z`) }
        : {}),
      ...(input.avatarColor !== undefined ? { avatarColor: input.avatarColor } : {}),
    },
  });
  return toResponse(row);
}

export async function deleteBaby(id: string): Promise<void> {
  const exists = await prisma.baby.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError('Baby', id);
  await prisma.baby.delete({ where: { id } });
  await refreshTrialView();
}
