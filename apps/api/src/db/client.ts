import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SCHEMA_SQL } from './schema.js';

export type Db = Database.Database;

/**
 * Open (and create if needed) the SQLite database, apply hardening PRAGMAs and
 * the schema. Pass ':memory:' for tests.
 */
export function openDb(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA_SQL);
  return db;
}

/** Short, sortable-ish id with an entity prefix (e.g. `brd_a1b2c3d4`). */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
