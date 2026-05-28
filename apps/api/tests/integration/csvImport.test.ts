import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

let app: Express;
let babyId: string;
let foodAId: string;
let foodBId: string;

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
  const a = await prisma.foodItem.create({
    data: { name: '紅蘿蔔泥(CSV)', category: 'VEGETABLE', allergyRisk: 'LOW', isSystem: true },
  });
  foodAId = a.id;
  const b = await prisma.foodItem.create({
    data: { name: '蘋果泥(CSV)', category: 'FRUIT', allergyRisk: 'LOW', isSystem: true },
  });
  foodBId = b.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const HEADER = 'food_name,fed_at,amount_ml,reaction,note\n';

const csv = (lines: string[]): Buffer => Buffer.from(HEADER + lines.join('\n'), 'utf8');

function importBody(body: Buffer, dryRun = false) {
  const req = request(app)
    .post(`/api/v1/babies/${babyId}/feedings/import${dryRun ? '?dryRun=true' : ''}`)
    .attach('file', body, 'rows.csv');
  return req;
}

describe('POST /api/v1/babies/:babyId/feedings/import', () => {
  test('imports valid rows', async () => {
    const body = csv([
      `紅蘿蔔泥(CSV),2026-04-10T10:00:00Z,30,NONE,`,
      `紅蘿蔔泥(CSV),2026-04-11T10:00:00Z,30,NONE,`,
      `蘋果泥(CSV),2026-04-11T11:00:00Z,20,MILD,輕微紅疹`,
    ]);
    const res = await importBody(body).expect(200);
    expect(res.body).toMatchObject({ imported: 3, skipped: 0 });
    expect(res.body.errors).toEqual([]);
    const rows = await prisma.feedingRecord.findMany({
      where: { babyId },
      orderBy: { fedAt: 'asc' },
    });
    expect(rows).toHaveLength(3);
    // attemptCount auto-numbered per (baby, food) in fedAt order
    const carrot = rows.filter((r) => r.foodId === foodAId);
    expect(carrot.map((r) => r.attemptCount)).toEqual([1, 2]);
    const apple = rows.filter((r) => r.foodId === foodBId);
    expect(apple[0]?.reaction).toBe('MILD');
    expect(apple[0]?.note).toBe('輕微紅疹');
  });

  test('case-insensitive food name with trim', async () => {
    const body = csv([`  紅蘿蔔泥(CSV) ,2026-04-10T10:00:00Z,30,,`]);
    const res = await importBody(body).expect(200);
    expect(res.body.imported).toBe(1);
  });

  test('skips conflicts with existing records', async () => {
    await prisma.feedingRecord.create({
      data: {
        babyId,
        foodId: foodAId,
        fedAt: new Date('2026-04-10T10:00:00Z'),
        amountMl: 30,
        attemptCount: 1,
      },
    });
    const body = csv([
      `紅蘿蔔泥(CSV),2026-04-10T10:00:00Z,30,NONE,`, // conflict
      `紅蘿蔔泥(CSV),2026-04-11T10:00:00Z,30,NONE,`, // new
    ]);
    const res = await importBody(body).expect(200);
    expect(res.body).toMatchObject({ imported: 1, skipped: 1 });
  });

  test('reports per-row errors but imports the rest', async () => {
    const body = csv([
      `紅蘿蔔泥(CSV),2026-04-10T10:00:00Z,30,NONE,`, // ok
      `外星食物,2026-04-10T11:00:00Z,30,NONE,`, // food not found
      `紅蘿蔔泥(CSV),2026-04-11T10:00:00Z,abc,NONE,`, // bad amount
      `紅蘿蔔泥(CSV),2026-04-12T10:00:00Z,30,WEIRD,`, // bad reaction
      `紅蘿蔔泥(CSV),2026-04-13T10:00:00Z,30,NONE,`, // ok
    ]);
    const res = await importBody(body).expect(200);
    expect(res.body.imported).toBe(2);
    expect(res.body.skipped).toBe(0);
    expect(res.body.errors).toHaveLength(3);
    const messages = (res.body.errors as { message: string }[]).map((e) => e.message);
    expect(messages.some((m) => m.includes('food not found'))).toBe(true);
    expect(messages.some((m) => m.includes('amount_ml'))).toBe(true);
    expect(messages.some((m) => m.includes('reaction'))).toBe(true);
  });

  test('dryRun does not write but counts correctly', async () => {
    const body = csv([
      `紅蘿蔔泥(CSV),2026-04-10T10:00:00Z,30,NONE,`,
      `紅蘿蔔泥(CSV),2026-04-11T10:00:00Z,30,NONE,`,
    ]);
    const before = await prisma.feedingRecord.count({ where: { babyId } });
    const res = await importBody(body, true).expect(200);
    expect(res.body).toMatchObject({ imported: 2, skipped: 0 });
    const after = await prisma.feedingRecord.count({ where: { babyId } });
    expect(after).toBe(before);
  });

  test('dryRun and real import return matching counts', async () => {
    const body = () =>
      csv([
        `紅蘿蔔泥(CSV),2026-04-10T10:00:00Z,30,NONE,`,
        `外星食物,2026-04-10T11:00:00Z,30,NONE,`,
      ]);
    const dry = await importBody(body(), true).expect(200);
    const real = await importBody(body(), false).expect(200);
    expect(real.body.imported).toBe(dry.body.imported);
    expect(real.body.skipped).toBe(dry.body.skipped);
    expect(real.body.errors.length).toBe(dry.body.errors.length);
  });

  test('rejects missing required header', async () => {
    const body = Buffer.from('food_name,amount_ml\n紅蘿蔔泥(CSV),30\n', 'utf8');
    const res = await importBody(body).expect(200);
    expect(res.body.errors[0].message).toMatch(/Missing required header/);
  });

  test('404 on unknown baby', async () => {
    const body = csv([`紅蘿蔔泥(CSV),2026-04-10T10:00:00Z,30,NONE,`]);
    await request(app)
      .post('/api/v1/babies/00000000-0000-0000-0000-000000000000/feedings/import')
      .attach('file', body, 'rows.csv')
      .expect(404);
  });

  test('400 when file field missing', async () => {
    await request(app).post(`/api/v1/babies/${babyId}/feedings/import`).expect(400);
  });

  test('within-batch attemptCount sorted by fedAt regardless of CSV order', async () => {
    const body = csv([
      `紅蘿蔔泥(CSV),2026-04-13T10:00:00Z,30,NONE,`, // would be 3rd by date
      `紅蘿蔔泥(CSV),2026-04-11T10:00:00Z,30,NONE,`, // 1st by date
      `紅蘿蔔泥(CSV),2026-04-12T10:00:00Z,30,NONE,`, // 2nd by date
    ]);
    await importBody(body).expect(200);
    const rows = await prisma.feedingRecord.findMany({
      where: { babyId, foodId: foodAId },
      orderBy: { fedAt: 'asc' },
    });
    expect(rows.map((r) => r.attemptCount)).toEqual([1, 2, 3]);
  });
});
