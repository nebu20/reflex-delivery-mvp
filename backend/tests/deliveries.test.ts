import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db';
import { createApp } from '../src/createApp';
import { DeliveryRepository } from '../src/modules/deliveries/delivery.repository';
import Database from 'better-sqlite3';

let db: Database.Database;
let app: ReturnType<typeof createApp>;
let repository: DeliveryRepository;

beforeEach(() => {
  db = createTestDb();
  app = createApp(db);
  repository = new DeliveryRepository(db);
});

const validPayload = {
  customerName: 'John Kamau',
  customerPhone: '+254700000000',
  deliveryAddress: 'Nairobi CBD',
  itemDescription: 'Samsung phone',
};

describe('Delivery API', () => {
  // ── Task 3 Tests ────────────────────────────────────────────────────────
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

  // ── Task 4 Tests ────────────────────────────────────────────────────────
  describe('PATCH /api/deliveries/:id/assignment', () => {
    it('9. REQUESTED delivery can be assigned -> 200 OK', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({ riderId: 'RIDER-001' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('10. Assignment changes status to ASSIGNED and stores assignedRider', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({ riderId: 'RIDER-001' });

      expect(res.body.status).toBe('ASSIGNED');
      expect(res.body.assignedRider).toBe('RIDER-001');
    });

    it('11. Missing riderId returns 400 Bad Request', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/riderId/i);
    });

    it('12. Unknown delivery returns 404 Not Found', async () => {
      const res = await request(app)
        .patch('/api/deliveries/NON_EXISTENT_ID/assignment')
        .send({ riderId: 'RIDER-001' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('13. Already ASSIGNED delivery cannot be reassigned -> 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({ riderId: 'RIDER-001' });

      const reassign = await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({ riderId: 'RIDER-002' });

      expect(reassign.status).toBe(409);
      expect(reassign.body.error).toMatch(/already/i);
    });

    it('14. PICKED_UP delivery cannot be assigned -> 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      repository.updateStatus(created.body.id, 'PICKED_UP');

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({ riderId: 'RIDER-001' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already/i);
    });

    it('15. DELIVERED delivery cannot be assigned -> 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      repository.updateStatus(created.body.id, 'DELIVERED');

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/assignment`)
        .send({ riderId: 'RIDER-001' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already/i);
    });
  });

  describe('GET /api/riders', () => {
    it('16. returns predefined rider list -> 200 OK', async () => {
      const res = await request(app).get('/api/riders');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
    });
  });
});
