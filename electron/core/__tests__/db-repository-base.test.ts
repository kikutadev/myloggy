// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { BaseRepository } from '../db/repositories/base-repository.js';

class TestRepo extends BaseRepository {
  createTable() {
    this._run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, active INTEGER)');
  }

  insert(id: number, name: string, active: boolean) {
    this._run('INSERT INTO test (id, name, active) VALUES (?, ?, ?)', id, name, active);
  }

  findAll() {
    return this._all('SELECT * FROM test ORDER BY id');
  }

  findById(id: number) {
    return this._get('SELECT * FROM test WHERE id = ?', id);
  }
}

describe('db/repositories/base-repository', () => {
  let conn: DatabaseConnection;
  let repo: TestRepo;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new TestRepo(conn);
    repo.createTable();
  });

  afterEach(() => {
    conn.close();
  });

  it('runs insert and normalizes boolean to 1/0', () => {
    repo.insert(1, 'hello', true);
    const row = repo.findById(1);
    expect(row?.name).toBe('hello');
    expect(row?.active).toBe(1);
  });

  it('normalizes undefined to null', () => {
    repo._run('INSERT INTO test (id, name, active) VALUES (?, ?, ?)', 2, undefined, false);
    const row = repo.findById(2);
    expect(row?.name).toBeNull();
    expect(row?.active).toBe(0);
  });

  it('all returns array of rows', () => {
    repo.insert(1, 'a', true);
    repo.insert(2, 'b', false);
    const rows = repo.findAll();
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('a');
  });

  it('get returns undefined for missing row', () => {
    const row = repo.findById(999);
    expect(row).toBeUndefined();
  });
});
