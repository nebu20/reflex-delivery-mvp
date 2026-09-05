import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db';
import { createApp } from '../src/createApp';
import Database from 'better-sqlite3';

let db: Database.Database;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  // Isolated in-memory SQLite database for each test — zero external DB dependency
  db = createTestDb();
  app = createApp(db);
});

const validPayload = {
  customerName: 'John Kamau',
  customerPhone: '+254700000000',
  deliveryAddress: 'Nairobi CBD',
  itemDescription: 'Samsung phone',
};

describe('Delivery Request API (Task 3)', () => {
  describe('POST /api/deliveries', () => {
    it('1. successfully creates a delivery request -> 201 Created', async () => {
      const res = await request(app).post('/api/deliveries').send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(typeof res.body.id).toBe('string');
      expect(res.body.customerName).toBe('John Kamau');
      expect(res.body.customerPhone).toBe('+254700000000');
      expect(res.body.deliveryAddress).toBe('Nairobi CBD');
      expect(res.body.itemDescription).toBe('Samsung phone');
      expect(res.body.status).toBe('REQUESTED');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    it('2. rejects request with missing customerName -> 400 Bad Request', async () => {
      const { customerName: _omit, ...body } = validPayload;
      const res = await request(app).post('/api/deliveries').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/customerName/);
    });

    it('3. rejects request with missing customerPhone -> 400 Bad Request', async () => {
      const { customerPhone: _omit, ...body } = validPayload;
      const res = await request(app).post('/api/deliveries').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/customerPhone/);
    });

    it('4. rejects request with missing deliveryAddress -> 400 Bad Request', async () => {
      const { deliveryAddress: _omit, ...body } = validPayload;
      const res = await request(app).post('/api/deliveries').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/deliveryAddress/);
    });

    it('5. rejects request with missing itemDescription -> 400 Bad Request', async () => {
      const { itemDescription: _omit, ...body } = validPayload;
      const res = await request(app).post('/api/deliveries').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itemDescription/);
    });
  });

  describe('GET /api/deliveries', () => {
    it('6. lists all delivery requests -> 200 OK', async () => {
      await request(app).post('/api/deliveries').send(validPayload);
      await request(app).post('/api/deliveries').send({
        ...validPayload,
        customerName: 'Jane Wanjiru',
        customerPhone: '+254711111111',
      });

      const res = await request(app).get('/api/deliveries');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /api/deliveries/:id', () => {
    it('7. returns a single delivery by ID -> 200 OK', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      const deliveryId = created.body.id;

      const res = await request(app).get(`/api/deliveries/${deliveryId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(deliveryId);
      expect(res.body.customerName).toBe('John Kamau');
      expect(res.body.status).toBe('REQUESTED');
    });

    it('8. returns 404 Not Found for an unknown delivery ID', async () => {
      const res = await request(app).get('/api/deliveries/NON_EXISTENT_ID');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });
});
