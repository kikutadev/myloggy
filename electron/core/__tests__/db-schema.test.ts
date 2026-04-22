// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection } from '../db/connection.js';
import { initializeSchema, ensureColumn } from '../db/schema.js';
import type { DatabaseConnection } from '../db/connection.js';

function getTableNames(conn: DatabaseConnection): string[] {
  const rows = conn.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all() as { name: string }[];
  return rows.map((r) => r.name);
}

describe('db/schema', () => {
  let conn: DatabaseConnection;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
  });

  afterEach(() => {
    conn.close();
  });

  it('creates all expected tables', () => {
    initializeSchema(conn);
    const names = getTableNames(conn);
    expect(names).toContain('settings');
    expect(names).toContain('snapshots');
    expect(names).toContain('checkpoints');
    expect(names).toContain('work_units');
    expect(names).toContain('error_logs');
    expect(names).toContain('analysis_logs');
    expect(names).toContain('category_rules');
  });

  it('ensureColumn adds a new column', () => {
    conn.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY)');
    ensureColumn(conn, 'test_table', 'new_col', 'TEXT');
    const cols = conn.prepare("PRAGMA table_info(test_table)").all() as { name: string }[];
    expect(cols.map((c) => c.name)).toContain('new_col');
  });

  it('ensureColumn does not throw when column already exists', () => {
    conn.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY, existing TEXT)');
    expect(() => ensureColumn(conn, 'test_table', 'existing', 'TEXT')).not.toThrow();
  });

  it('runs migrations by adding missing columns', () => {
    initializeSchema(conn);
    const cols = conn.prepare("PRAGMA table_info(snapshots)").all() as { name: string }[];
    expect(cols.map((c) => c.name)).toContain('cursor_x');
    expect(cols.map((c) => c.name)).toContain('image_paths_json');
    expect(cols.map((c) => c.name)).toContain('display_count');
  });
});
