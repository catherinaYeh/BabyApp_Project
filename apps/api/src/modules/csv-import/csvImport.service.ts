import type { Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/problems.js';
import { refreshTrialView } from '../../lib/refreshTrialView.js';
import { evaluateAchievements } from '../achievements/achievement.evaluator.js';

export type CsvImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string; raw?: Record<string, string> }[];
};

const REACTIONS = ['NONE', 'MILD', 'SEVERE'] as const;
type Reaction = (typeof REACTIONS)[number];

const REQUIRED_HEADERS = ['food_name', 'fed_at', 'amount_ml'] as const;

type Row = Record<string, string>;

type ParsedFeeding = {
  rowIdx: number; // 1-based row in CSV (header is row 1)
  foodId: string;
  foodName: string;
  fedAt: Date;
  amountMl: number;
  reaction: Reaction;
  note?: string;
  raw: Row;
};

function parseReaction(v: string | undefined): Reaction {
  if (!v) return 'NONE';
  const u = v.trim().toUpperCase();
  if ((REACTIONS as readonly string[]).includes(u)) return u as Reaction;
  throw new Error(`reaction must be one of NONE/MILD/SEVERE (got "${v}")`);
}

function parseFedAt(v: string): Date {
  const d = new Date(v.trim());
  if (Number.isNaN(d.getTime())) {
    throw new Error(`fed_at not parseable: "${v}"`);
  }
  return d;
}

function parseAmount(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 1000) {
    throw new Error(`amount_ml must be an integer in [1, 1000] (got "${v}")`);
  }
  return n;
}

export async function importFeedingsFromCsv(
  babyId: string,
  buffer: Buffer,
  opts: { dryRun: boolean },
): Promise<CsvImportResult> {
  // 0. Baby must exist
  const baby = await prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
  if (!baby) throw new NotFoundError('Baby', babyId);

  // 1. Parse CSV (BOM-tolerant)
  let rows: Row[];
  try {
    rows = parse(buffer, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    }) as Row[];
  } catch (err) {
    return {
      imported: 0,
      skipped: 0,
      errors: [{ row: 0, message: `CSV parse failed: ${(err as Error).message}` }],
    };
  }

  if (rows.length === 0) {
    return { imported: 0, skipped: 0, errors: [{ row: 0, message: 'CSV is empty' }] };
  }
  if (rows.length > 5000) {
    return {
      imported: 0,
      skipped: 0,
      errors: [{ row: 0, message: `CSV exceeds 5000 rows (got ${rows.length})` }],
    };
  }

  const firstRow = rows[0]!;
  for (const h of REQUIRED_HEADERS) {
    if (!(h in firstRow)) {
      return {
        imported: 0,
        skipped: 0,
        errors: [{ row: 1, message: `Missing required header: ${h}` }],
      };
    }
  }

  // 2. Pre-load food lookup (lowercased trimmed name)
  const foods = await prisma.foodItem.findMany({ select: { id: true, name: true } });
  const foodByName = new Map<string, string>();
  for (const f of foods) foodByName.set(f.name.trim().toLowerCase(), f.id);

  // 3. Parse each row, accumulating errors and valid candidates
  const errors: CsvImportResult['errors'] = [];
  const valid: ParsedFeeding[] = [];

  rows.forEach((raw, i) => {
    const rowIdx = i + 2; // 1-based CSV row (i=0 is data row 2 since header is 1)
    try {
      const foodName = (raw['food_name'] ?? '').trim();
      if (!foodName) throw new Error('food_name is empty');
      const foodId = foodByName.get(foodName.toLowerCase());
      if (!foodId) throw new Error(`food not found: ${foodName}`);
      const fedAt = parseFedAt(raw['fed_at'] ?? '');
      const amountMl = parseAmount(raw['amount_ml'] ?? '');
      const reaction = parseReaction(raw['reaction']);
      const note = (raw['note'] ?? '').trim() || undefined;
      if (note && note.length > 500) throw new Error('note exceeds 500 chars');

      valid.push({ rowIdx, foodId, foodName, fedAt, amountMl, reaction, note, raw });
    } catch (err) {
      errors.push({ row: rowIdx, message: (err as Error).message, raw });
    }
  });

  // 4. Skip rows whose (babyId, foodId, fedAt) already exists.
  const existing = await prisma.feedingRecord.findMany({
    where: { babyId, OR: valid.map((v) => ({ foodId: v.foodId, fedAt: v.fedAt })) },
    select: { foodId: true, fedAt: true },
  });
  const existingKey = new Set(existing.map((e) => `${e.foodId}|${e.fedAt.toISOString()}`));

  // 5. Sort within batch by fedAt to assign sensible attemptCount, then number.
  const toCreate: (ParsedFeeding & { attemptCount: number })[] = [];
  let skippedCount = 0;
  // Group by foodId so we can compute attempt count starting from existing count.
  const byFood = new Map<string, ParsedFeeding[]>();
  for (const v of valid) {
    const key = `${v.foodId}|${v.fedAt.toISOString()}`;
    if (existingKey.has(key)) {
      skippedCount += 1;
      continue;
    }
    const arr = byFood.get(v.foodId) ?? [];
    arr.push(v);
    byFood.set(v.foodId, arr);
  }

  // existing count per food for this baby (excludes the batch)
  const existingCountPerFood = await prisma.feedingRecord.groupBy({
    by: ['foodId'],
    where: { babyId },
    _count: { _all: true },
  });
  const countMap = new Map<string, number>();
  for (const r of existingCountPerFood) countMap.set(r.foodId, r._count._all);

  for (const [foodId, list] of byFood) {
    list.sort((a, b) => a.fedAt.getTime() - b.fedAt.getTime());
    let n = countMap.get(foodId) ?? 0;
    for (const item of list) {
      n += 1;
      toCreate.push({ ...item, attemptCount: n });
    }
  }

  if (opts.dryRun) {
    return { imported: toCreate.length, skipped: skippedCount, errors };
  }

  // 6. Transaction: insert all valid rows. Wrap individual creates so a
  //    duplicate races (race with concurrent insert) still gets counted as
  //    skipped rather than aborting the batch.
  let imported = 0;
  let raceSkips = 0;
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const r of toCreate) {
      try {
        await tx.feedingRecord.create({
          data: {
            babyId,
            foodId: r.foodId,
            fedAt: r.fedAt,
            amountMl: r.amountMl,
            attemptCount: r.attemptCount,
            reaction: r.reaction,
            ...(r.note ? { note: r.note } : {}),
          },
        });
        imported += 1;
      } catch (err) {
        const e = err as { code?: string };
        if (e.code === 'P2002') {
          raceSkips += 1;
        } else {
          throw err;
        }
      }
    }
  });

  if (imported > 0) {
    await refreshTrialView();
    await evaluateAchievements(babyId);
  }

  return { imported, skipped: skippedCount + raceSkips, errors };
}
