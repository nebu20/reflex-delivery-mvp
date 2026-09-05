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

describe('Reflex Delivery Management API', () => {
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
      expect(res.body.proofOfDelivery).toBeNull();
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

  // ── Task 5 Tests ────────────────────────────────────────────────────────
  describe('PATCH /api/deliveries/:id/status', () => {
    it('17. ASSIGNED -> PICKED_UP succeeds -> 200 OK', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      await request(app).patch(`/api/deliveries/${created.body.id}/assignment`).send({ riderId: 'RIDER-001' });

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'PICKED_UP' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PICKED_UP');
      expect(res.body.assignedRider).toBe('RIDER-001');
    });

    it('18. PICKED_UP -> DELIVERED succeeds -> 200 OK', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      await request(app).patch(`/api/deliveries/${created.body.id}/assignment`).send({ riderId: 'RIDER-001' });
      await request(app).patch(`/api/deliveries/${created.body.id}/status`).send({ status: 'PICKED_UP' });

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DELIVERED');
    });

    it('19. REQUESTED -> PICKED_UP fails with 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'PICKED_UP' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Invalid status transition/i);
    });

    it('20. REQUESTED -> DELIVERED fails with 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Invalid status transition/i);
    });

    it('21. ASSIGNED -> DELIVERED fails with 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      await request(app).patch(`/api/deliveries/${created.body.id}/assignment`).send({ riderId: 'RIDER-001' });

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Invalid status transition/i);
    });

    it('22. DELIVERED -> PICKED_UP fails with 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      await request(app).patch(`/api/deliveries/${created.body.id}/assignment`).send({ riderId: 'RIDER-001' });
      await request(app).patch(`/api/deliveries/${created.body.id}/status`).send({ status: 'PICKED_UP' });
      await request(app).patch(`/api/deliveries/${created.body.id}/status`).send({ status: 'DELIVERED' });

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'PICKED_UP' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Invalid status transition/i);
    });

    it('23. Missing status returns 400 Bad Request', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it('24. Invalid status value returns 400 Bad Request', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);

      const res = await request(app)
        .patch(`/api/deliveries/${created.body.id}/status`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it('25. Unknown delivery returns 404 Not Found', async () => {
      const res = await request(app)
        .patch('/api/deliveries/NON_EXISTENT_ID/status')
        .send({ status: 'PICKED_UP' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('GET /api/riders/:riderId/deliveries', () => {
    it('26. returns assigned deliveries for valid rider -> 200 OK', async () => {
      const d1 = await request(app).post('/api/deliveries').send(validPayload);
      await request(app).post('/api/deliveries').send({ ...validPayload, customerName: 'Jane Wanjiru' });

      await request(app).patch(`/api/deliveries/${d1.body.id}/assignment`).send({ riderId: 'RIDER-001' });

      const res = await request(app).get('/api/riders/RIDER-001/deliveries');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(d1.body.id);
      expect(res.body[0].assignedRider).toBe('RIDER-001');
    });

    it('27. unknown rider returns 404 Not Found', async () => {
      const res = await request(app).get('/api/riders/UNKNOWN_RIDER/deliveries');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('28. rider with no deliveries returns [] -> 200 OK', async () => {
      const res = await request(app).get('/api/riders/RIDER-003/deliveries');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── Task 6 Tests ────────────────────────────────────────────────────────
  describe('PATCH /api/deliveries/:id/proof', () => {
    async function createDeliveredOrder() {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      const id = created.body.id;
      await request(app).patch(`/api/deliveries/${id}/assignment`).send({ riderId: 'RIDER-001' });
      await request(app).patch(`/api/deliveries/${id}/status`).send({ status: 'PICKED_UP' });
      await request(app).patch(`/api/deliveries/${id}/status`).send({ status: 'DELIVERED' });
      return id;
    }

    it('29. Delivered delivery can record proof -> 200 OK', async () => {
      const id = await createDeliveredOrder();

      const res = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau', note: 'Package received in good condition' });

      expect(res.status).toBe(200);
      expect(res.body.proofOfDelivery).toBeDefined();
    });

    it('30. Recipient name is stored in proof', async () => {
      const id = await createDeliveredOrder();

      const res = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau' });

      expect(res.body.proofOfDelivery.recipientName).toBe('John Kamau');
    });

    it('31. Confirmation timestamp is stored in proof', async () => {
      const id = await createDeliveredOrder();

      const res = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau' });

      expect(res.body.proofOfDelivery.confirmedAt).toBeDefined();
      expect(new Date(res.body.proofOfDelivery.confirmedAt).getTime()).not.toBeNaN();
    });

    it('32. Optional note is stored in proof', async () => {
      const id = await createDeliveredOrder();

      const res = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau', note: 'Left with security guard' });

      expect(res.body.proofOfDelivery.note).toBe('Left with security guard');
    });

    it('33. Missing recipient name returns 400 Bad Request', async () => {
      const id = await createDeliveredOrder();

      const res = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ note: 'Package left at door' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/recipientName/i);
    });

    it('34. Unknown delivery returns 404 Not Found', async () => {
      const res = await request(app)
        .patch('/api/deliveries/NON_EXISTENT_ID/proof')
        .send({ recipientName: 'John Kamau' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('35. Non-delivered delivery cannot record proof -> 409 Conflict', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      const id = created.body.id;

      const res = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/only be recorded for delivered/i);
    });

    it('36. Existing proof cannot be overwritten -> 409 Conflict', async () => {
      const id = await createDeliveredOrder();
      await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau' });

      const overwrite = await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'Jane Kamau' });

      expect(overwrite.status).toBe(409);
      expect(overwrite.body.error).toMatch(/already been recorded/i);
    });

    it('37. GET delivery returns proof data when proof exists', async () => {
      const id = await createDeliveredOrder();
      await request(app)
        .patch(`/api/deliveries/${id}/proof`)
        .send({ recipientName: 'John Kamau', note: 'All good' });

      const res = await request(app).get(`/api/deliveries/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.proofOfDelivery).toBeDefined();
      expect(res.body.proofOfDelivery.recipientName).toBe('John Kamau');
      expect(res.body.proofOfDelivery.note).toBe('All good');
    });

    it('38. GET delivery returns null proof when no proof exists', async () => {
      const created = await request(app).post('/api/deliveries').send(validPayload);
      const res = await request(app).get(`/api/deliveries/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.proofOfDelivery).toBeNull();
    });
  });
});
