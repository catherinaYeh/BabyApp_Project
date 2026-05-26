import type { FoodItem as PrismaFood, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/problems.js';
import type { FoodCreateInput, FoodListQuery, FoodUpdateInput } from './food.schema.js';

export type FoodResponse = {
  id: string;
  name: string;
  category: PrismaFood['category'];
  allergyRisk: PrismaFood['allergyRisk'];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

const toResponse = (f: PrismaFood): FoodResponse => ({
  id: f.id,
  name: f.name,
  category: f.category,
  allergyRisk: f.allergyRisk,
  isSystem: f.isSystem,
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
});

// Risk ordering for sort by allergy risk. Used by raw orderBy via array.
const RISK_ORDER: Record<PrismaFood['allergyRisk'], number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export async function listFoods(query: FoodListQuery): Promise<{
  data: FoodResponse[];
  meta: { nextCursor: string | null; total: number };
}> {
  const where: Prisma.FoodItemWhereInput = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.allergyRisk ? { allergyRisk: query.allergyRisk } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };

  const total = await prisma.foodItem.count({ where });

  // We can't directly orderBy enum by risk_order; emulate by fetching then ordering in JS for risk_*,
  // or use a Prisma raw ordering map. Simpler & still O(n): order by name then sort by risk in JS.
  // For limit + cursor we go the standard way for name_* sorts (DB ordering) and the JS path for risk_*.
  if (query.sort === 'risk_asc' || query.sort === 'risk_desc') {
    const all = await prisma.foodItem.findMany({ where, orderBy: { name: 'asc' } });
    all.sort((a, b) => {
      const diff = RISK_ORDER[a.allergyRisk] - RISK_ORDER[b.allergyRisk];
      const signed = query.sort === 'risk_asc' ? diff : -diff;
      return signed !== 0 ? signed : a.name.localeCompare(b.name);
    });
    const startIdx = query.cursor ? all.findIndex((it) => it.id === query.cursor) + 1 : 0;
    const slice = all.slice(startIdx, startIdx + query.limit + 1);
    const hasMore = slice.length > query.limit;
    const page = hasMore ? slice.slice(0, query.limit) : slice;
    return {
      data: page.map(toResponse),
      meta: { nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null, total },
    };
  }

  const orderBy: Prisma.FoodItemOrderByWithRelationInput =
    query.sort === 'name_desc' ? { name: 'desc' } : { name: 'asc' };

  const rows = await prisma.foodItem.findMany({
    where,
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    data: page.map(toResponse),
    meta: { nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null, total },
  };
}

export async function getFood(id: string): Promise<FoodResponse> {
  const row = await prisma.foodItem.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Food', id);
  return toResponse(row);
}

export async function createFood(input: FoodCreateInput): Promise<FoodResponse> {
  const exists = await prisma.foodItem.findUnique({ where: { name: input.name } });
  if (exists) throw new ConflictError(`Food with name '${input.name}' already exists`);
  const row = await prisma.foodItem.create({
    data: { ...input, isSystem: false },
  });
  return toResponse(row);
}

export async function updateFood(id: string, input: FoodUpdateInput): Promise<FoodResponse> {
  const existing = await prisma.foodItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Food', id);
  if (existing.isSystem) {
    throw new ForbiddenError('System foods are read-only and cannot be edited');
  }
  if (input.name && input.name !== existing.name) {
    const dup = await prisma.foodItem.findUnique({ where: { name: input.name } });
    if (dup) throw new ConflictError(`Food with name '${input.name}' already exists`);
  }
  const row = await prisma.foodItem.update({ where: { id }, data: input });
  return toResponse(row);
}

export async function deleteFood(id: string): Promise<void> {
  const existing = await prisma.foodItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Food', id);
  if (existing.isSystem) {
    throw new ForbiddenError('System foods are read-only and cannot be deleted');
  }
  const referenced = await prisma.feedingRecord.count({ where: { foodId: id } });
  if (referenced > 0) {
    throw new ConflictError(
      `Food is referenced by ${referenced} feeding record(s) and cannot be deleted`,
    );
  }
  await prisma.foodItem.delete({ where: { id } });
}
