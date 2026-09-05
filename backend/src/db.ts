import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data', 'reflex.db');

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
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name   TEXT    NOT NULL,
      customer_phone  TEXT    NOT NULL,
      address         TEXT    NOT NULL,
      item_description TEXT   NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'PENDING',
      assigned_rider  TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function initDb(dbPath?: string): void {
  const resolvedPath = dbPath ?? DB_PATH;
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
