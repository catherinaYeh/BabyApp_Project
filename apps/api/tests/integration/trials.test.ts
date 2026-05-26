import request from 'supertest';
import type { Express } from 'express';
import type { AllergyRisk, FoodCategory } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { refreshTrialView } from '../../src/lib/refreshTrialView.js';

let app: Express;
let babyId: string;

const isoAt = (s: string) => new Date(`${s}+00:00`).toISOString();

async function makeFood(name: string, category: FoodCategory, allergyRisk: AllergyRisk) {
  return prisma.foodItem.create({
    data: { name, category, allergyRisk, isSystem: true },
  });
}

async function feed(
  foodId: string,
  dayOffset: number,
  reaction: 'NONE' | 'MILD' | 'SEVERE' = 'NONE',
) {
  const day = String(20 + dayOffset).padStart(2, '0');
  await prisma.feedingRecord.create({
    data: {
      babyId,
      foodId,
      fedAt: new Date(isoAt(`2026-05-${day}T10:00:00`)),
      amountMl: 30,
      attemptCount: dayOffset + 1,
      reaction,
    },
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
  await refreshTrialView();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/v1/babies/:babyId/trials', () => {
  test('UNTRIED for new baby across all foods', async () => {
    await makeFood('A', 'VEGETABLE', 'LOW');
    await makeFood('B', 'FRUIT', 'HIGH');
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/trials`).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((d: { status: string }) => d.status === 'UNTRIED')).toBe(true);
  });

  test('TRYING after one NONE feeding', async () => {
    const f = await makeFood('A', 'VEGETABLE', 'LOW');
    await feed(f.id, 0);
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/trials?status=TRYING`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ foodId: f.id, status: 'TRYING', attempts: 1 });
  });

  test('UNLOCKED after 3 NONE feedings', async () => {
    const f = await makeFood('A', 'VEGETABLE', 'LOW');
    await feed(f.id, 0);
    await feed(f.id, 1);
    await feed(f.id, 2);
    await refreshTrialView();
    const res = await request(app)
      .get(`/api/v1/babies/${babyId}/trials?status=UNLOCKED`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('UNLOCKED');
  });

  test('ALLERGIC locks even after later NONE feedings', async () => {
    const f = await makeFood('A', 'FRUIT', 'HIGH');
    await feed(f.id, 0, 'SEVERE');
    await feed(f.id, 1, 'NONE');
    await refreshTrialView();
    const res = await request(app)
      .get(`/api/v1/babies/${babyId}/trials?status=ALLERGIC`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('404 on unknown baby', async () => {
    await request(app)
      .get('/api/v1/babies/00000000-0000-0000-0000-000000000000/trials')
      .expect(404);
  });
});

describe('GET /api/v1/babies/:babyId/recommendations', () => {
  test('orders by risk ascending', async () => {
    await makeFood('L', 'VEGETABLE', 'LOW');
    await makeFood('M', 'GRAIN', 'MEDIUM');
    await makeFood('H', 'FRUIT', 'HIGH');
    await refreshTrialView();
    const res = await request(app)
      .get(`/api/v1/babies/${babyId}/recommendations?limit=3`)
      .expect(200);
    const risks = res.body.data.map((f: { allergyRisk: string }) => f.allergyRisk);
    expect(risks[0]).toBe('LOW');
    expect(risks[1]).toBe('MEDIUM');
    expect(risks[2]).toBe('HIGH');
  });

  test('diversifies across categories (max 2 per category)', async () => {
    for (let i = 0; i < 8; i++) await makeFood(`veg${i}`, 'VEGETABLE', 'LOW');
    await makeFood('fruit1', 'FRUIT', 'MEDIUM');
    await makeFood('grain1', 'GRAIN', 'MEDIUM');
    await refreshTrialView();
    const res = await request(app)
      .get(`/api/v1/babies/${babyId}/recommendations?limit=5`)
      .expect(200);
    const categories = res.body.data.map((f: { category: string }) => f.category);
    const vegCount = categories.filter((c: string) => c === 'VEGETABLE').length;
    expect(vegCount).toBeLessThanOrEqual(2);
    expect(categories).toContain('FRUIT');
    expect(categories).toContain('GRAIN');
  });

  test('empty when no UNTRIED foods', async () => {
    const f = await makeFood('A', 'VEGETABLE', 'LOW');
    await feed(f.id, 0);
    await feed(f.id, 1);
    await feed(f.id, 2);
    await refreshTrialView();
    const res = await request(app).get(`/api/v1/babies/${babyId}/recommendations`).expect(200);
    expect(res.body.data).toEqual([]);
  });
});
