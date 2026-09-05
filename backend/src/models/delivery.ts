import Database from 'better-sqlite3';
import { Delivery, CreateDeliveryInput } from '../types/delivery';

/** Raw row returned from SQLite — snake_case columns. */
interface DeliveryRow {
  id: number;
  customer_name: string;
  customer_phone: string;
  address: string;
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
    address: row.address,
    itemDescription: row.item_description,
    status: row.status as Delivery['status'],
    assignedRider: row.assigned_rider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDelivery(db: Database.Database, input: CreateDeliveryInput): Delivery {
  const stmt = db.prepare(`
    INSERT INTO deliveries (customer_name, customer_phone, address, item_description, status)
    VALUES (@customerName, @customerPhone, @address, @itemDescription, 'PENDING')
  `);

  const result = stmt.run(input);
  const row = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(result.lastInsertRowid) as DeliveryRow;
  return rowToDelivery(row);
}

export function getAllDeliveries(db: Database.Database, status?: string): Delivery[] {
  if (status) {
    const rows = db.prepare('SELECT * FROM deliveries WHERE status = ? ORDER BY created_at DESC').all(status) as DeliveryRow[];
    return rows.map(rowToDelivery);
  }
  const rows = db.prepare('SELECT * FROM deliveries ORDER BY created_at DESC').all() as DeliveryRow[];
  return rows.map(rowToDelivery);
}
