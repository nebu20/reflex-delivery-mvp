import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'reflex.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/** Applies the schema to any Database instance (used by both app and tests). */
export function applySchema(instance: Database.Database): void {
  instance.pragma('journal_mode = WAL');
  instance.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id                   TEXT PRIMARY KEY,
      customer_name        TEXT NOT NULL,
      customer_phone       TEXT NOT NULL,
      delivery_address     TEXT NOT NULL,
      item_description     TEXT NOT NULL,
      status               TEXT NOT NULL DEFAULT 'REQUESTED',
      assigned_rider       TEXT,
      proof_recipient_name TEXT,
      proof_note           TEXT,
      proof_confirmed_at   DATETIME,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration helper for existing table instances
  try { instance.exec('ALTER TABLE deliveries ADD COLUMN proof_recipient_name TEXT;'); } catch {}
  try { instance.exec('ALTER TABLE deliveries ADD COLUMN proof_note TEXT;'); } catch {}
  try { instance.exec('ALTER TABLE deliveries ADD COLUMN proof_confirmed_at DATETIME;'); } catch {}
}

export function initDb(dbPath?: string): void {
  const resolvedPath = dbPath || process.env.DB_PATH || DEFAULT_DB_PATH;
  const dataDir = path.dirname(resolvedPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(resolvedPath);
  applySchema(db);

  console.log('📦 SQLite database initialized at:', resolvedPath);
}

/** Creates a fresh in-memory database — for use in tests only. */
export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  applySchema(testDb);
  return testDb;
}
