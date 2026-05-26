import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { refreshTrialView } from '../../src/lib/refreshTrialView.js';
import { evaluateAchievements } from '../../src/modules/achievements/achievement.evaluator.js';
import { seedAchievements } from '../../prisma/seed/achievements.js';

let app: Express;
let babyId: string;

const isoAt = (s: string) => new Date(`${s}+00:00`).toISOString();

async function reseedAchievements() {
  await prisma.achievementUnlock.deleteMany();
  await prisma.achievement.deleteMany();
  for (const a of seedAchievements) {
    await prisma.achievement.create({ data: a });
  }
}

beforeAll(async () => {
  app = createApp();
  await reseedAchievements();
});

beforeEach(async () => {
  await prisma.achievementUnlock.deleteMany();
  await prisma.feedingRecord.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.baby.deleteMany();
  const baby = await prisma.baby.create({
    data: { name: '小寶', birthDate: new Date('2025-11-15') }, // 滿 6M on 2026-05-15
  });
  babyId = baby.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeFood(
  name: string,
  category: 'VEGETABLE' | 'FRUIT' | 'HIGH' | 'SEAFOOD' | 'MEAT' | 'GRAIN',
  risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW',
) {
  return prisma.foodItem.create({
    data: {
      name,
      category: category === 'HIGH' ? 'FRUIT' : category,
      allergyRisk: risk,
      isSystem: true,
    },
  });
}

async function unlock3(foodId: string, baseDay: number) {
  for (let i = 0; i < 3; i++) {
    const day = String(baseDay + i).padStart(2, '0');
    await prisma.feedingRecord.create({
      data: {
        babyId,
        foodId,
        fedAt: new Date(isoAt(`2026-04-${day}T10:00:00`)),
        amountMl: 30,
        attemptCount: i + 1,
        reaction: 'NONE',
      },
    });
  }
  await refreshTrialView();
}

describe('GET /api/v1/achievements', () => {
  test('lists all 13 seeded achievements', async () => {
    const res = await request(app).get('/api/v1/achievements').expect(200);
    expect(res.body.data.length).toBe(seedAchievements.length);
    const codes = res.body.data.map((a: { code: string }) => a.code);
    expect(codes).toContain('UNLOCK_5_VEG');
    expect(codes).toContain('TOTAL_UNLOCK_10');
  });
});

describe('AchievementEvaluator', () => {
  test('UNLOCK_COUNT_BY_CATEGORY VEGETABLE 5 unlocks after 5th veg unlocked', async () => {
    for (let i = 0; i < 5; i++) {
      const f = await makeFood(`veg${i}`, 'VEGETABLE', 'LOW');
      await unlock3(f.id, 1 + i * 3);
    }
    const newly = await evaluateAchievements(babyId);
    const codes = newly.map((a) => a.code);
    expect(codes).toContain('UNLOCK_5_VEG');
  });

  test('UNLOCK_COUNT_BY_RISK HIGH 3 unlocks after 3 HIGH unlocked', async () => {
    for (let i = 0; i < 3; i++) {
      const f = await makeFood(`high${i}`, 'FRUIT', 'HIGH');
      await unlock3(f.id, 1 + i * 3);
    }
    const newly = await evaluateAchievements(babyId);
    expect(newly.map((a) => a.code)).toContain('UNLOCK_3_HIGH');
  });

  test('TOTAL_UNLOCK 10 unlocks when 10 distinct foods unlocked', async () => {
    for (let i = 0; i < 10; i++) {
      const f = await makeFood(`food${i}`, i % 2 === 0 ? 'VEGETABLE' : 'FRUIT', 'LOW');
      await unlock3(f.id, 1 + i * 3);
    }
    const newly = await evaluateAchievements(babyId);
    expect(newly.map((a) => a.code)).toContain('TOTAL_UNLOCK_10');
  });

  test('FIRST_FEEDING_BY_AGE 6M unlocks when first feeding within 6M', async () => {
    // baby birthDate 2025-11-15, first feeding at 2026-05-01 → ageInMonths = 5 (≤6)
    const f = await makeFood('any', 'VEGETABLE', 'LOW');
    await prisma.feedingRecord.create({
      data: {
        babyId,
        foodId: f.id,
        fedAt: new Date(isoAt('2026-05-01T10:00:00')),
        amountMl: 30,
        attemptCount: 1,
        reaction: 'NONE',
      },
    });
    await refreshTrialView();
    const newly = await evaluateAchievements(babyId);
    expect(newly.map((a) => a.code)).toContain('FIRST_FEEDING_6M');
  });

  test('does not re-unlock already-unlocked achievements', async () => {
    for (let i = 0; i < 5; i++) {
      const f = await makeFood(`veg${i}`, 'VEGETABLE', 'LOW');
      await unlock3(f.id, 1 + i * 3);
    }
    await evaluateAchievements(babyId);
    const secondCall = await evaluateAchievements(babyId);
    expect(secondCall.map((a) => a.code)).not.toContain('UNLOCK_5_VEG');
  });
});

describe('GET /api/v1/babies/:babyId/achievements', () => {
  test('shows unlocked + progress for unlocked-and-not yet', async () => {
    for (let i = 0; i < 5; i++) {
      const f = await makeFood(`veg${i}`, 'VEGETABLE', 'LOW');
      await unlock3(f.id, 1 + i * 3);
    }
    await evaluateAchievements(babyId);
    const res = await request(app).get(`/api/v1/babies/${babyId}/achievements`).expect(200);
    const veg5 = res.body.data.find(
      (a: { achievement: { code: string } }) => a.achievement.code === 'UNLOCK_5_VEG',
    );
    const veg10 = res.body.data.find(
      (a: { achievement: { code: string } }) => a.achievement.code === 'UNLOCK_10_VEG',
    );
    expect(veg5).toMatchObject({ unlocked: true });
    expect(veg5.unlockedAt).not.toBeNull();
    expect(veg10).toMatchObject({ unlocked: false });
    expect(veg10.progress).toEqual({ current: 5, target: 10 });
  });

  test('404 on unknown baby', async () => {
    await request(app)
      .get('/api/v1/babies/00000000-0000-0000-0000-000000000000/achievements')
      .expect(404);
  });
});

describe('Feeding creation surfaces newlyUnlockedAchievements', () => {
  test('5th veg unlock causes UNLOCK_5_VEG to appear in POST response', async () => {
    for (let i = 0; i < 4; i++) {
      const f = await makeFood(`veg${i}`, 'VEGETABLE', 'LOW');
      await unlock3(f.id, 1 + i * 3);
    }
    // Now the 5th veg via API (3 feedings):
    const fifth = await makeFood('veg4', 'VEGETABLE', 'LOW');
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: fifth.id, fedAt: isoAt('2026-04-28T10:00:00'), amountMl: 30 })
      .expect(201);
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: fifth.id, fedAt: isoAt('2026-04-29T10:00:00'), amountMl: 30 })
      .expect(201);
    const res = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: fifth.id, fedAt: isoAt('2026-04-30T10:00:00'), amountMl: 30 })
      .expect(201);
    const codes = res.body.newlyUnlockedAchievements.map((a: { code: string }) => a.code);
    expect(codes).toContain('UNLOCK_5_VEG');
  });
});
