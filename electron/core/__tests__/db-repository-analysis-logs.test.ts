// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { AnalysisLogRepository } from '../db/repositories/analysis-logs.js';

describe('db/repositories/analysis-logs', () => {
  let conn: DatabaseConnection;
  let repo: AnalysisLogRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new AnalysisLogRepository(conn);
  });

  afterEach(() => {
    conn.close();
  });

  it('inserts and lists logs', () => {
    const log = repo.insert({
      provider: 'ollama',
      model: 'm1',
      locale: 'ja',
      promptText: 'prompt',
      snapshotIds: ['s1', 's2'],
    });
    expect(log.provider).toBe('ollama');
    expect(log.snapshotIds).toEqual(['s1', 's2']);
    const list = repo.list(10);
    expect(list).toHaveLength(1);
    expect(list[0].snapshotIds).toEqual(['s1', 's2']);
  });

  it('uses provided id and createdAt', () => {
    const log = repo.insert({
      id: 'custom-id',
      createdAt: '2024-01-01T00:00:00Z',
      provider: 'p',
      model: 'm',
      locale: 'en',
      promptText: 'prompt',
      snapshotIds: [],
    });
    expect(log.id).toBe('custom-id');
    expect(log.createdAt).toBe('2024-01-01T00:00:00Z');
  });

  it('handles optional null fields', () => {
    const log = repo.insert({
      provider: 'p',
      model: 'm',
      locale: 'ja',
      promptText: 'prompt',
      snapshotIds: ['s1'],
    });
    expect(log.responseText).toBeNull();
    expect(log.durationMs).toBeNull();
  });
});
