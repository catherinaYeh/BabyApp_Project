import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

let app: Express;
let babyId: string;
let foodAId: string;
let foodBId: string;

beforeAll(async () => {
  app = createApp();
});

beforeEach(async () => {
  await prisma.feedingRecord.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.baby.deleteMany();
  const baby = await prisma.baby.create({
    data: { name: '小寶', birthDate: new Date('2025-11-15') },
  });
  babyId = baby.id;
  const foodA = await prisma.foodItem.create({
    data: { name: '紅蘿蔔泥(測試)', category: 'VEGETABLE', allergyRisk: 'LOW', isSystem: true },
  });
  foodAId = foodA.id;
  const foodB = await prisma.foodItem.create({
    data: { name: '草莓泥(測試)', category: 'FRUIT', allergyRisk: 'HIGH', isSystem: true },
  });
  foodBId = foodB.id;
});

afterAll(async () => {
  await prisma.feedingRecord.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.baby.deleteMany();
  await prisma.$disconnect();
});

const isoAt = (s: string) => new Date(`${s}+00:00`).toISOString();

describe('POST /api/v1/babies/:babyId/feedings', () => {
  test('creates first feeding with attemptCount=1, reaction default NONE', async () => {
    const res = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(201);
    expect(res.body.feeding).toMatchObject({
      foodId: foodAId,
      babyId,
      amountMl: 30,
      attemptCount: 1,
      reaction: 'NONE',
    });
    // AchievementEvaluator runs; FIRST_FEEDING_BY_AGE may or may not fire depending on baby age vs fedAt.
    expect(Array.isArray(res.body.newlyUnlockedAchievements)).toBe(true);
  });

  test('attemptCount auto-increments for same (baby, food)', async () => {
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(201);
    const res = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-21T10:00:00'), amountMl: 40 })
      .expect(201);
    expect(res.body.feeding.attemptCount).toBe(2);
  });

  test('attemptCount independent per food', async () => {
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(201);
    const res = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodBId, fedAt: isoAt('2026-05-20T11:00:00'), amountMl: 30 })
      .expect(201);
    expect(res.body.feeding.attemptCount).toBe(1);
  });

  test('409 on duplicate (babyId, foodId, fedAt)', async () => {
    const payload = { foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 };
    await request(app).post(`/api/v1/babies/${babyId}/feedings`).send(payload).expect(201);
    const res = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send(payload)
      .expect(409);
    expect(res.body.title).toBe('Conflict');
  });

  test('422 on amountMl out of range', async () => {
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 0 })
      .expect(422);
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 1001 })
      .expect(422);
  });

  test('404 when baby does not exist', async () => {
    await request(app)
      .post('/api/v1/babies/00000000-0000-0000-0000-000000000000/feedings')
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(404);
  });

  test('404 when food does not exist', async () => {
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({
        foodId: '00000000-0000-0000-0000-000000000000',
        fedAt: isoAt('2026-05-20T10:00:00'),
        amountMl: 30,
      })
      .expect(404);
  });

  test('reaction MILD recorded', async () => {
    const res = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({
        foodId: foodBId,
        fedAt: isoAt('2026-05-20T10:00:00'),
        amountMl: 20,
        reaction: 'MILD',
        note: '臉部紅疹',
      })
      .expect(201);
    expect(res.body.feeding.reaction).toBe('MILD');
    expect(res.body.feeding.note).toBe('臉部紅疹');
  });
});

describe('Materialized view refresh', () => {
  test('view reflects status after writes', async () => {
    // 3 NONE feedings → UNLOCKED
    for (let i = 0; i < 3; i++) {
      const day = String(20 + i).padStart(2, '0');
      await request(app)
        .post(`/api/v1/babies/${babyId}/feedings`)
        .send({ foodId: foodAId, fedAt: isoAt(`2026-05-${day}T10:00:00`), amountMl: 30 })
        .expect(201);
    }
    const trial = await prisma.$queryRawUnsafe<{ status: string; attempts: bigint }[]>(
      `SELECT status, attempts FROM baby_food_trial WHERE baby_id = '${babyId}' AND food_id = '${foodAId}'`,
    );
    expect(trial[0]?.status).toBe('UNLOCKED');
    expect(Number(trial[0]?.attempts)).toBe(3);
  });

  test('reaction triggers ALLERGIC', async () => {
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({
        foodId: foodBId,
        fedAt: isoAt('2026-05-20T10:00:00'),
        amountMl: 10,
        reaction: 'SEVERE',
      })
      .expect(201);
    const trial = await prisma.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM baby_food_trial WHERE baby_id = '${babyId}' AND food_id = '${foodBId}'`,
    );
    expect(trial[0]?.status).toBe('ALLERGIC');
  });

  test('delete rolls back UNLOCKED → TRYING', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const day = String(20 + i).padStart(2, '0');
      const r = await request(app)
        .post(`/api/v1/babies/${babyId}/feedings`)
        .send({ foodId: foodAId, fedAt: isoAt(`2026-05-${day}T10:00:00`), amountMl: 30 })
        .expect(201);
      ids.push(r.body.feeding.id);
    }
    await request(app).delete(`/api/v1/babies/${babyId}/feedings/${ids[0]!}`).expect(204);
    const trial = await prisma.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM baby_food_trial WHERE baby_id = '${babyId}' AND food_id = '${foodAId}'`,
    );
    expect(trial[0]?.status).toBe('TRYING');
  });
});

describe('GET /api/v1/babies/:babyId/feedings', () => {
  test('view=week auto applies range', async () => {
    // Create a feeding for today (within current week)
    const now = new Date();
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: now.toISOString(), amountMl: 30 })
      .expect(201);
    const res = await request(app).get(`/api/v1/babies/${babyId}/feedings?view=week`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('filter by foodId', async () => {
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(201);
    await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodBId, fedAt: isoAt('2026-05-20T11:00:00'), amountMl: 20 })
      .expect(201);
    const res = await request(app)
      .get(`/api/v1/babies/${babyId}/feedings?foodId=${foodAId}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].foodId).toBe(foodAId);
  });

  test('view + from/to mutex 422', async () => {
    const res = await request(app)
      .get(`/api/v1/babies/${babyId}/feedings?view=week&from=${isoAt('2026-05-01T00:00:00')}`)
      .expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'view' }));
  });
});

describe('PATCH/DELETE /api/v1/babies/:babyId/feedings/:feedingId', () => {
  test('PATCH updates reaction', async () => {
    const created = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(201);
    const res = await request(app)
      .patch(`/api/v1/babies/${babyId}/feedings/${created.body.feeding.id}`)
      .send({ reaction: 'MILD' })
      .expect(200);
    expect(res.body.reaction).toBe('MILD');
  });

  test('DELETE removes the feeding', async () => {
    const created = await request(app)
      .post(`/api/v1/babies/${babyId}/feedings`)
      .send({ foodId: foodAId, fedAt: isoAt('2026-05-20T10:00:00'), amountMl: 30 })
      .expect(201);
    await request(app)
      .delete(`/api/v1/babies/${babyId}/feedings/${created.body.feeding.id}`)
      .expect(204);
    await request(app)
      .get(`/api/v1/babies/${babyId}/feedings/${created.body.feeding.id}`)
      .expect(404);
  });
});
