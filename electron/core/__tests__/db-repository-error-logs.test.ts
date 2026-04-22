// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { ErrorLogRepository } from '../db/repositories/error-logs.js';

describe('db/repositories/error-logs', () => {
  let conn: DatabaseConnection;
  let repo: ErrorLogRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new ErrorLogRepository(conn);
  });

  afterEach(() => {
    conn.close();
  });

  it('inserts and lists errors', () => {
    const err = repo.insert('scope-a', 'message-a', 'detail-a');
    expect(err.scope).toBe('scope-a');
    expect(err.detail).toBe('detail-a');
    const list = repo.list(10);
    expect(list).toHaveLength(1);
  });

  it('handles null detail', () => {
    const err = repo.insert('scope-b', 'message-b');
    expect(err.detail).toBeNull();
  });

  it('clears all errors', () => {
    repo.insert('scope', 'msg');
    repo.clear();
    expect(repo.list(10)).toHaveLength(0);
  });

  it('returns recent errors in descending order', async () => {
    repo.insert('s1', 'm1');
    await new Promise((r) => setTimeout(r, 20));
    repo.insert('s2', 'm2');
    const list = repo.list(10);
    expect(list).toHaveLength(2);
    expect(list[0].scope).toBe('s2');
    expect(list[1].scope).toBe('s1');
  });
});
