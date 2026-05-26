import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { seedFoods } from '../../prisma/seed/foods.js';

let app: Express;

beforeAll(async () => {
  app = createApp();
  // Seed system foods for tests (idempotent)
  await prisma.foodItem.deleteMany();
  await prisma.foodItem.createMany({
    data: seedFoods.map((f) => ({ ...f, isSystem: true })),
  });
});

afterEach(async () => {
  // Clean only user-defined foods after each test (keep system seed)
  await prisma.foodItem.deleteMany({ where: { isSystem: false } });
});

afterAll(async () => {
  await prisma.feedingRecord.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.$disconnect();
});

describe('GET /api/v1/foods', () => {
  test('lists with default pagination (limit 20, risk_asc)', async () => {
    const res = await request(app).get('/api/v1/foods').expect(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta.total).toBe(seedFoods.length);
    // risk_asc: first page should not have HIGH before LOW/MEDIUM
    const firstRisks = res.body.data.map((d: { allergyRisk: string }) => d.allergyRisk);
    expect(firstRisks[0]).toBe('LOW');
  });

  test('filter by category', async () => {
    const res = await request(app).get('/api/v1/foods?category=VEGETABLE').expect(200);
    expect(res.body.data.every((d: { category: string }) => d.category === 'VEGETABLE')).toBe(true);
  });

  test('filter by allergyRisk', async () => {
    const res = await request(app).get('/api/v1/foods?allergyRisk=HIGH&limit=100').expect(200);
    expect(res.body.data.every((d: { allergyRisk: string }) => d.allergyRisk === 'HIGH')).toBe(
      true,
    );
  });

  test('search case-insensitive', async () => {
    const res = await request(app).get('/api/v1/foods?search=蛋').expect(200);
    expect(res.body.data.every((d: { name: string }) => d.name.includes('蛋'))).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('sort risk_asc orders LOW → MEDIUM → HIGH', async () => {
    const res = await request(app).get('/api/v1/foods?sort=risk_asc&limit=100').expect(200);
    const risks = res.body.data.map((d: { allergyRisk: string }) => d.allergyRisk);
    const order = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
    for (let i = 1; i < risks.length; i++) {
      expect(order[risks[i] as keyof typeof order]).toBeGreaterThanOrEqual(
        order[risks[i - 1] as keyof typeof order],
      );
    }
  });
});

describe('POST /api/v1/foods', () => {
  test('creates user-defined food', async () => {
    const res = await request(app)
      .post('/api/v1/foods')
      .send({ name: '自製寶寶餅乾', category: 'GRAIN', allergyRisk: 'HIGH' })
      .expect(201);
    expect(res.body).toMatchObject({
      name: '自製寶寶餅乾',
      isSystem: false,
    });
  });

  test('409 on duplicate name (vs system food)', async () => {
    const res = await request(app)
      .post('/api/v1/foods')
      .send({ name: '蘋果泥', category: 'FRUIT', allergyRisk: 'LOW' })
      .expect(409);
    expect(res.body.title).toBe('Conflict');
  });

  test('422 on missing allergyRisk', async () => {
    const res = await request(app)
      .post('/api/v1/foods')
      .send({ name: '測試食材', category: 'OTHER' })
      .expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'allergyRisk' }));
  });

  test('422 on invalid allergyRisk', async () => {
    await request(app)
      .post('/api/v1/foods')
      .send({ name: '測試食材', category: 'OTHER', allergyRisk: 'UNKNOWN' })
      .expect(422);
  });
});

describe('PATCH /api/v1/foods/:id', () => {
  test('403 on editing system food', async () => {
    const sys = await prisma.foodItem.findFirst({ where: { isSystem: true } });
    const res = await request(app)
      .patch(`/api/v1/foods/${sys!.id}`)
      .send({ allergyRisk: 'LOW' })
      .expect(403);
    expect(res.body.title).toBe('Forbidden');
  });

  test('200 on editing user food', async () => {
    const created = await request(app)
      .post('/api/v1/foods')
      .send({ name: '我的食材', category: 'OTHER', allergyRisk: 'LOW' })
      .expect(201);
    const res = await request(app)
      .patch(`/api/v1/foods/${created.body.id}`)
      .send({ allergyRisk: 'HIGH' })
      .expect(200);
    expect(res.body.allergyRisk).toBe('HIGH');
  });
});

describe('DELETE /api/v1/foods/:id', () => {
  test('403 on deleting system food', async () => {
    const sys = await prisma.foodItem.findFirst({ where: { isSystem: true } });
    await request(app).delete(`/api/v1/foods/${sys!.id}`).expect(403);
  });

  test('204 on deleting unused user food', async () => {
    const created = await request(app)
      .post('/api/v1/foods')
      .send({ name: '臨時食材', category: 'OTHER', allergyRisk: 'LOW' })
      .expect(201);
    await request(app).delete(`/api/v1/foods/${created.body.id}`).expect(204);
  });

  test('409 on deleting food with feeding records', async () => {
    const created = await request(app)
      .post('/api/v1/foods')
      .send({ name: '被引用食材', category: 'OTHER', allergyRisk: 'LOW' })
      .expect(201);
    const baby = await prisma.baby.create({
      data: { name: '測試', birthDate: new Date('2025-11-15') },
    });
    await prisma.feedingRecord.create({
      data: {
        babyId: baby.id,
        foodId: created.body.id,
        fedAt: new Date('2026-05-20T10:00:00Z'),
        amountMl: 30,
        attemptCount: 1,
      },
    });
    const res = await request(app).delete(`/api/v1/foods/${created.body.id}`).expect(409);
    expect(res.body.title).toBe('Conflict');
    // cleanup
    await prisma.feedingRecord.deleteMany({ where: { foodId: created.body.id } });
    await prisma.baby.delete({ where: { id: baby.id } });
  });
});
