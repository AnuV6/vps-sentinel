import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  const dbPath = process.env.DATABASE_URL || './data/vps-sentinel.db';
  const resolvedPath = path.resolve(dbPath);
  const dbDir = path.dirname(resolvedPath);

  if (!fs.existsSync(dbDir)) {
    console.log(`[DB] Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[DB] Initializing database at: ${resolvedPath}`);

  db = await open({
    filename: resolvedPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'http', -- http, keyword, port
      keyword TEXT,
      port INTEGER,
      active INTEGER DEFAULT 1,
      last_check_status INTEGER,
      last_check_latency INTEGER,
      last_check_time TEXT
    );

    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER,
      status INTEGER,
      latency INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(monitor_id) REFERENCES monitors(id)
    );


    CREATE INDEX IF NOT EXISTS idx_checks_monitor ON checks(monitor_id);
    CREATE INDEX IF NOT EXISTS idx_checks_timestamp ON checks(timestamp);
  `);

  return db;
}
