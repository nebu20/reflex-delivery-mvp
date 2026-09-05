import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Delivery, CreateDeliveryDTO } from './delivery.types';

interface DeliveryRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  item_description: string;
  status: string;
  assigned_rider: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryAddress: row.delivery_address,
    address: row.delivery_address,
    itemDescription: row.item_description,
    status: row.status as Delivery['status'],
    assignedRider: row.assigned_rider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DeliveryRepository {
  constructor(private db: Database.Database) {}

  create(data: CreateDeliveryDTO): Delivery {
    const id = `DEL-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO deliveries (id, customer_name, customer_phone, delivery_address, item_description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'REQUESTED', ?, ?)
    `);

    stmt.run(
      id,
      data.customerName,
      data.customerPhone,
      data.deliveryAddress,
      data.itemDescription,
      now,
      now
    );

    const row = this.db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as DeliveryRow;
    return rowToDelivery(row);
  }

  findAll(statusFilter?: string): Delivery[] {
    if (statusFilter) {
      const rows = this.db.prepare('SELECT * FROM deliveries WHERE status = ? ORDER BY created_at DESC').all(statusFilter) as DeliveryRow[];
      return rows.map(rowToDelivery);
    }
    const rows = this.db.prepare('SELECT * FROM deliveries ORDER BY created_at DESC').all() as DeliveryRow[];
    return rows.map(rowToDelivery);
  }

  findById(id: string): Delivery | null {
    const row = this.db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as DeliveryRow | undefined;
    return row ? rowToDelivery(row) : null;
  }

  updateAssignment(id: string, riderId: string, status: string = 'ASSIGNED'): Delivery | null {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE deliveries
      SET assigned_rider = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(riderId, status, now, id);
    return this.findById(id);
  }

  // Helper for tests/status updates
  updateStatus(id: string, status: string): Delivery | null {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE deliveries
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, now, id);
    return this.findById(id);
  }
}
