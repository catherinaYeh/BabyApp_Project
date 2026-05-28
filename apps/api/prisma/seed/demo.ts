/**
 * Demo seed: creates one sample baby + 20 feeding records so a fresh DB can
 * show a meaningful dashboard immediately. Idempotent (skips if the sample
 * baby with name "示範寶寶" already exists).
 */

import { PrismaClient } from '@prisma/client';

const SAMPLE_BABY_NAME = '示範寶寶';

const FEEDINGS = [
  // 紅蘿蔔泥 × 3 → UNLOCKED
  { foodName: '紅蘿蔔泥', daysAgo: 18, hour: 10, amount: 25, reaction: 'NONE' },
  { foodName: '紅蘿蔔泥', daysAgo: 16, hour: 10, amount: 30, reaction: 'NONE' },
  { foodName: '紅蘿蔔泥', daysAgo: 14, hour: 11, amount: 35, reaction: 'NONE' },
  // 南瓜泥 × 3 → UNLOCKED
  { foodName: '南瓜泥', daysAgo: 17, hour: 11, amount: 25, reaction: 'NONE' },
  { foodName: '南瓜泥', daysAgo: 15, hour: 10, amount: 30, reaction: 'NONE' },
  { foodName: '南瓜泥', daysAgo: 13, hour: 11, amount: 35, reaction: 'NONE' },
  // 地瓜泥 × 3 → UNLOCKED
  { foodName: '地瓜泥', daysAgo: 16, hour: 17, amount: 30, reaction: 'NONE' },
  { foodName: '地瓜泥', daysAgo: 14, hour: 17, amount: 30, reaction: 'NONE' },
  { foodName: '地瓜泥', daysAgo: 12, hour: 17, amount: 30, reaction: 'NONE' },
  // 蘋果泥 × 3 → UNLOCKED
  { foodName: '蘋果泥', daysAgo: 12, hour: 16, amount: 25, reaction: 'NONE' },
  { foodName: '蘋果泥', daysAgo: 10, hour: 16, amount: 30, reaction: 'NONE' },
  { foodName: '蘋果泥', daysAgo: 8, hour: 16, amount: 30, reaction: 'NONE' },
  // 香蕉泥 × 3 → UNLOCKED (→ should unlock UNLOCK_5_VEG, ?_FRUIT)
  { foodName: '香蕉泥', daysAgo: 11, hour: 9, amount: 20, reaction: 'NONE' },
  { foodName: '香蕉泥', daysAgo: 9, hour: 9, amount: 25, reaction: 'NONE' },
  { foodName: '香蕉泥', daysAgo: 7, hour: 9, amount: 30, reaction: 'NONE' },
  // 十倍粥 × 2 → TRYING
  { foodName: '十倍粥', daysAgo: 6, hour: 12, amount: 40, reaction: 'NONE' },
  { foodName: '十倍粥', daysAgo: 4, hour: 12, amount: 45, reaction: 'NONE' },
  // 草莓泥 × 1, SEVERE → ALLERGIC
  { foodName: '草莓泥', daysAgo: 5, hour: 15, amount: 10, reaction: 'SEVERE' },
  // 高麗菜泥 × 2 → TRYING
  { foodName: '高麗菜泥', daysAgo: 3, hour: 11, amount: 25, reaction: 'NONE' },
  { foodName: '高麗菜泥', daysAgo: 1, hour: 11, amount: 30, reaction: 'NONE' },
] as const;

export async function seedDemo(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.baby.findFirst({ where: { name: SAMPLE_BABY_NAME } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Demo baby '${SAMPLE_BABY_NAME}' already exists, skipping demo seed`);
    return;
  }
  const baby = await prisma.baby.create({
    data: {
      name: SAMPLE_BABY_NAME,
      birthDate: new Date(Date.now() - 6.5 * 30 * 24 * 60 * 60 * 1000), // ≈ 6.5 月齡
      avatarColor: '#E0AC4C',
    },
  });

  const foods = await prisma.foodItem.findMany();
  const foodByName = new Map(foods.map((f) => [f.name, f.id]));

  const counts = new Map<string, number>();
  let written = 0;
  for (const f of FEEDINGS) {
    const foodId = foodByName.get(f.foodName);
    if (!foodId) continue;
    const date = new Date(Date.now() - f.daysAgo * 24 * 60 * 60 * 1000);
    date.setHours(f.hour, 0, 0, 0);
    counts.set(foodId, (counts.get(foodId) ?? 0) + 1);
    await prisma.feedingRecord.create({
      data: {
        babyId: baby.id,
        foodId,
        fedAt: date,
        amountMl: f.amount,
        attemptCount: counts.get(foodId)!,
        reaction: f.reaction,
      },
    });
    written += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Demo seed: 1 baby ('${SAMPLE_BABY_NAME}'), ${written} feedings created`);
}
