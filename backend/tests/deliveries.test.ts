import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db';
import { createApp } from '../src/createApp';
import Database from 'better-sqlite3';

let db: Database.Database;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  // Fresh in-memory database for each test — no external DB dependency
  db = createTestDb();
  app = createApp(db);
});

// ─── Valid delivery payload ────────────────────────────────────────────────
const validPayload = {
  customerName: 'John Kamau',
  customerPhone: '0712345678',
  address: 'Nairobi, Westlands',
  itemDescription: 'Laptop',
};

describe('POST /api/deliveries', () => {
  it('1. creates a valid delivery → 201', async () => {
    const res = await request(app).post('/api/deliveries').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.customerName).toBe('John Kamau');
    expect(res.body.customerPhone).toBe('0712345678');
    expect(res.body.address).toBe('Nairobi, Westlands');
    expect(res.body.itemDescription).toBe('Laptop');
    expect(res.body.status).toBe('PENDING');
    expect(res.body.assignedRider).toBeNull();
    expect(res.body.createdAt).toBeDefined();
  });

  it('2. missing customerName → 400', async () => {
    const { customerName: _omit, ...body } = validPayload;
    const res = await request(app).post('/api/deliveries').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerName/);
  });

  it('3. empty customerName (whitespace) → 400', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .send({ ...validPayload, customerName: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerName/);
  });

  it('4. missing customerPhone → 400', async () => {
    const { customerPhone: _omit, ...body } = validPayload;
    const res = await request(app).post('/api/deliveries').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerPhone/);
  });

  it('5. missing address → 400', async () => {
    const { address: _omit, ...body } = validPayload;
    const res = await request(app).post('/api/deliveries').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/address/);
  });

  it('6. missing itemDescription → 400', async () => {
    const { itemDescription: _omit, ...body } = validPayload;
    const res = await request(app).post('/api/deliveries').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/itemDescription/);
  });
});

describe('GET /api/deliveries', () => {
  beforeEach(async () => {
    // Seed two deliveries
    await request(app).post('/api/deliveries').send(validPayload);
    await request(app).post('/api/deliveries').send({
      ...validPayload,
      customerName: 'Jane Wanjiru',
      customerPhone: '0798765432',
    });
  });

  it('7. GET /api/deliveries → 200 with all deliveries', async () => {
    const res = await request(app).get('/api/deliveries');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('8. GET /api/deliveries?status=PENDING → 200 with only PENDING deliveries', async () => {
    const res = await request(app).get('/api/deliveries?status=PENDING');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body.every((d: { status: string }) => d.status === 'PENDING')).toBe(true);
  });

  it('9. GET /api/deliveries?status=ASSIGNED → 200 with empty array', async () => {
    const res = await request(app).get('/api/deliveries?status=ASSIGNED');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
