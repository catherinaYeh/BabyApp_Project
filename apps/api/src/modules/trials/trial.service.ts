import type { FoodItem as PrismaFood } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/problems.js';
import type { RecommendationQuery, TrialListQuery } from './trial.schema.js';

export type TrialStatus = 'UNTRIED' | 'TRYING' | 'UNLOCKED' | 'ALLERGIC';

export type TrialState = {
  foodId: string;
  food: {
    id: string;
    name: string;
    category: PrismaFood['category'];
    allergyRisk: PrismaFood['allergyRisk'];
    isSystem: boolean;
  };
  status: TrialStatus;
  attempts: number;
  lastFedAt: string | null;
  hasReaction: boolean;
};

type ViewRow = {
  baby_id: string;
  food_id: string;
  attempts: bigint;
  last_fed_at: Date | null;
  has_reaction: boolean;
  status: TrialStatus;
};

async function ensureBaby(babyId: string): Promise<void> {
  const exists = await prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
  if (!exists) throw new NotFoundError('Baby', babyId);
}

export async function listTrials(
  babyId: string,
  query: TrialListQuery,
): Promise<{ data: TrialState[] }> {
  await ensureBaby(babyId);

  // Join the MV with food_item to get full food metadata.
  // Use raw SQL to read the materialized view; filter by status/category at SQL.
  const conditions: Prisma.Sql[] = [Prisma.sql`bft.baby_id = ${babyId}::uuid`];
  if (query.status) conditions.push(Prisma.sql`bft.status = ${query.status}`);
  if (query.category) {
    conditions.push(Prisma.sql`fi.category = ${query.category}::"FoodCategory"`);
  }

  const where = Prisma.join(conditions, ' AND ');

  const rows = await prisma.$queryRaw<
    Array<
      ViewRow & {
        f_name: string;
        f_category: PrismaFood['category'];
        f_allergy_risk: PrismaFood['allergyRisk'];
        f_is_system: boolean;
      }
    >
  >(Prisma.sql`
    SELECT
      bft.baby_id,
      bft.food_id,
      bft.attempts,
      bft.last_fed_at,
      bft.has_reaction,
      bft.status,
      fi.name        AS f_name,
      fi.category    AS f_category,
      fi.allergy_risk AS f_allergy_risk,
      fi.is_system   AS f_is_system
    FROM baby_food_trial bft
    JOIN food_item fi ON fi.id = bft.food_id
    WHERE ${where}
    ORDER BY fi.name ASC
  `);

  return {
    data: rows.map((r) => ({
      foodId: r.food_id,
      food: {
        id: r.food_id,
        name: r.f_name,
        category: r.f_category,
        allergyRisk: r.f_allergy_risk,
        isSystem: r.f_is_system,
      },
      status: r.status,
      attempts: Number(r.attempts),
      lastFedAt: r.last_fed_at ? r.last_fed_at.toISOString() : null,
      hasReaction: r.has_reaction,
    })),
  };
}

const RISK_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
const MAX_PER_CATEGORY = 2;

export async function getRecommendations(
  babyId: string,
  query: RecommendationQuery,
): Promise<{ data: TrialState['food'][] }> {
  await ensureBaby(babyId);

  // Fetch all UNTRIED foods for this baby (joined with food_item for risk/category).
  const rows = await prisma.$queryRaw<
    Array<{
      food_id: string;
      f_name: string;
      f_category: PrismaFood['category'];
      f_allergy_risk: PrismaFood['allergyRisk'];
      f_is_system: boolean;
    }>
  >(Prisma.sql`
    SELECT
      bft.food_id,
      fi.name        AS f_name,
      fi.category    AS f_category,
      fi.allergy_risk AS f_allergy_risk,
      fi.is_system   AS f_is_system
    FROM baby_food_trial bft
    JOIN food_item fi ON fi.id = bft.food_id
    WHERE bft.baby_id = ${babyId}::uuid AND bft.status = 'UNTRIED'
  `);

  // Sort by risk_asc, then by name.
  rows.sort((a, b) => {
    const diff = RISK_ORDER[a.f_allergy_risk] - RISK_ORDER[b.f_allergy_risk];
    return diff !== 0 ? diff : a.f_name.localeCompare(b.f_name);
  });

  // Diversify: strictly cap at MAX_PER_CATEGORY per category, even if it means
  // returning fewer items than `limit`. Spec: "其他名額讓給其他 category".
  const picked: typeof rows = [];
  const perCategory = new Map<string, number>();
  for (const r of rows) {
    const used = perCategory.get(r.f_category) ?? 0;
    if (used >= MAX_PER_CATEGORY) continue;
    picked.push(r);
    perCategory.set(r.f_category, used + 1);
    if (picked.length === query.limit) break;
  }

  return {
    data: picked.slice(0, query.limit).map((r) => ({
      id: r.food_id,
      name: r.f_name,
      category: r.f_category,
      allergyRisk: r.f_allergy_risk,
      isSystem: r.f_is_system,
    })),
  };
}
