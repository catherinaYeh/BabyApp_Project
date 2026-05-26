import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { refreshTrialView } from '../../src/lib/refreshTrialView.js';
import { evaluateAchievements } from '../../src/modules/achievements/achievement.evaluator.js';

let app: Express;
let babyId: string;
const isoAt = (s: string) => new Date(`${s}+00:00`).toISOString();

async function makeFood(
  name: string,
  category: 'VEGETABLE' | 'FRUIT' | 'GRAIN',
  risk: 'LOW' | 'MEDIUM' | 'HIGH',
) {
  return prisma.foodItem.create({
    data: { name, category, allergyRisk: risk, isSystem: true },
  });
}

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await prisma.achievementUnlock.deleteMany();
  await prisma.feedingRecord.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.baby.deleteMany();
  const baby = await prisma.baby.create({
    data: { name: '小寶', birthDate: new Date('2025-11-15') },
  });
  babyId = baby.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/v1/babies/:babyId/progress', () => {
  test('zeros when no foods exist', async () => {
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/progress`).expect(200);
    expect(res.body).toMatchObject({ unlocked: 0, total: 0, percent: 0, byCategory: [] });
  });

  test('reports 25% with 1 of 4 unlocked', async () => {
    const f1 = await makeFood('v1', 'VEGETABLE', 'LOW');
    await makeFood('v2', 'VEGETABLE', 'LOW');
    await makeFood('v3', 'VEGETABLE', 'LOW');
    await makeFood('v4', 'VEGETABLE', 'LOW');
    // unlock f1 with 3 NONE feedings
    for (let i = 0; i < 3; i++) {
      await prisma.feedingRecord.create({
        data: {
          babyId,
          foodId: f1.id,
          fedAt: new Date(isoAt(`2026-04-0${i + 1}T10:00:00`)),
          amountMl: 30,
          attemptCount: i + 1,
        },
      });
    }
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/progress`).expect(200);
    expect(res.body.total).toBe(4);
    expect(res.body.unlocked).toBe(1);
    expect(res.body.percent).toBe(25);
    expect(res.body.byCategory).toHaveLength(1);
    expect(res.body.byCategory[0]).toMatchObject({
      category: 'VEGETABLE',
      unlocked: 1,
      total: 4,
    });
  });

  test('byCategory groups across categories', async () => {
    await makeFood('v1', 'VEGETABLE', 'LOW');
    await makeFood('f1', 'FRUIT', 'LOW');
    await makeFood('g1', 'GRAIN', 'LOW');
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/progress`).expect(200);
    const cats = res.body.byCategory.map((c: { category: string }) => c.category).sort();
    expect(cats).toEqual(['FRUIT', 'GRAIN', 'VEGETABLE']);
  });
});

describe('GET /api/v1/babies/:babyId/dashboard', () => {
  test('returns baby + statusCounts + progress + recentUnlocks + recommendations', async () => {
    const v1 = await makeFood('v1', 'VEGETABLE', 'LOW');
    await makeFood('v2', 'VEGETABLE', 'LOW');
    await makeFood('f1', 'FRUIT', 'HIGH');
    // 1 TRYING (1 NONE feeding on v1)
    await prisma.feedingRecord.create({
      data: {
        babyId,
        foodId: v1.id,
        fedAt: new Date(isoAt('2026-04-01T10:00:00')),
        amountMl: 30,
        attemptCount: 1,
      },
    });
    await refreshTrialView();
    await evaluateAchievements(babyId);
    const res = await request(app).get(`/api/v1/babies/${babyId}/dashboard`).expect(200);
    expect(res.body.baby).toMatchObject({ name: '小寶' });
    expect(typeof res.body.baby.ageMonth).toBe('number');
    expect(res.body.statusCounts.TRYING).toBe(1);
    expect(res.body.statusCounts.UNTRIED).toBe(2);
    expect(res.body.progress.total).toBe(3);
    expect(Array.isArray(res.body.recentUnlocks)).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
  });

  test('statusCounts sum equals food_item total', async () => {
    await makeFood('v1', 'VEGETABLE', 'LOW');
    await makeFood('v2', 'VEGETABLE', 'MEDIUM');
    await makeFood('f1', 'FRUIT', 'HIGH');
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/dashboard`).expect(200);
    const sum =
      res.body.statusCounts.UNTRIED +
      res.body.statusCounts.TRYING +
      res.body.statusCounts.UNLOCKED +
      res.body.statusCounts.ALLERGIC;
    expect(sum).toBe(3);
  });

  test('404 on unknown baby', async () => {
    await request(app)
      .get('/api/v1/babies/00000000-0000-0000-0000-000000000000/dashboard')
      .expect(404);
  });
});
