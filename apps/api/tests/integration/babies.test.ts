import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

let app: Express;

beforeAll(() => {
  app = createApp();
});

afterEach(async () => {
  await prisma.feedingRecord.deleteMany();
  await prisma.achievementUnlock.deleteMany();
  await prisma.baby.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validBaby = { name: '小寶', birthDate: '2025-11-15' };

describe('POST /api/v1/babies', () => {
  test('creates baby with required fields', async () => {
    const res = await request(app).post('/api/v1/babies').send(validBaby).expect(201);
    expect(res.body).toMatchObject({
      name: '小寶',
      birthDate: '2025-11-15',
      avatarColor: '#FFB7B7',
    });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof res.body.ageMonth).toBe('number');
  });

  test('422 on empty name', async () => {
    const res = await request(app)
      .post('/api/v1/babies')
      .send({ ...validBaby, name: '' })
      .expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'name' }));
  });

  test('422 on name > 30 chars', async () => {
    const res = await request(app)
      .post('/api/v1/babies')
      .send({ ...validBaby, name: 'x'.repeat(31) })
      .expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'name' }));
  });

  test('422 on future birthDate', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const iso = future.toISOString().slice(0, 10);
    const res = await request(app)
      .post('/api/v1/babies')
      .send({ ...validBaby, birthDate: iso })
      .expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'birthDate' }));
  });

  test('422 on bad avatarColor', async () => {
    const res = await request(app)
      .post('/api/v1/babies')
      .send({ ...validBaby, avatarColor: 'red' })
      .expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'avatarColor' }));
  });
});

describe('GET /api/v1/babies', () => {
  test('lists with pagination meta', async () => {
    await request(app).post('/api/v1/babies').send(validBaby).expect(201);
    await request(app)
      .post('/api/v1/babies')
      .send({ ...validBaby, name: '二寶' })
      .expect(201);
    const res = await request(app).get('/api/v1/babies').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 2, nextCursor: null });
  });
});

describe('GET /api/v1/babies/:id', () => {
  test('returns 404 problem+json on unknown id', async () => {
    const res = await request(app)
      .get('/api/v1/babies/00000000-0000-0000-0000-000000000000')
      .expect(404);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({ status: 404, title: 'Not Found' });
  });

  test('returns 422 problem+json on bad uuid', async () => {
    const res = await request(app).get('/api/v1/babies/not-a-uuid').expect(422);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ path: 'babyId' }));
  });
});

describe('PATCH /api/v1/babies/:id', () => {
  test('updates name', async () => {
    const created = await request(app).post('/api/v1/babies').send(validBaby).expect(201);
    const res = await request(app)
      .patch(`/api/v1/babies/${created.body.id}`)
      .send({ name: '改名' })
      .expect(200);
    expect(res.body.name).toBe('改名');
  });

  test('404 on unknown id', async () => {
    await request(app)
      .patch('/api/v1/babies/00000000-0000-0000-0000-000000000000')
      .send({ name: 'x' })
      .expect(404);
  });
});

describe('DELETE /api/v1/babies/:id', () => {
  test('204 on success', async () => {
    const created = await request(app).post('/api/v1/babies').send(validBaby).expect(201);
    await request(app).delete(`/api/v1/babies/${created.body.id}`).expect(204);
    await request(app).get(`/api/v1/babies/${created.body.id}`).expect(404);
  });

  test('404 on unknown id', async () => {
    await request(app).delete('/api/v1/babies/00000000-0000-0000-0000-000000000000').expect(404);
  });
});
