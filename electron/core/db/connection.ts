import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, StatementSync } from 'node:sqlite';

export type SqlValue = string | number | boolean | null;

export interface DatabaseConnection {
  prepare(sql: string): StatementSync;
  exec(sql: string): void;
  close(): void;
}

export function createConnection(baseDir: string, useMemory = false): DatabaseConnection {
  let db: DatabaseSync;
  if (!useMemory) {
    fs.mkdirSync(baseDir, { recursive: true });
    const dbPath = path.join(baseDir, 'myloggy.sqlite');
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
  } else {
    db = new DatabaseSync(':memory:');
  }
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

export function normalizeParams(...params: unknown[]): SqlValue[] {
  return params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p === undefined) return null;
    return p as SqlValue;
  });
}
