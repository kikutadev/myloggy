// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { CheckpointRepository } from '../db/repositories/checkpoints.js';
import type { CheckpointRecord } from '../../../shared/types.js';

function makeCheckpoint(id: string, overrides: Partial<CheckpointRecord> = {}): CheckpointRecord {
  return {
    id,
    startAt: '2024-01-01T00:00:00Z',
    endAt: '2024-01-01T01:00:00Z',
    projectName: 'Proj',
    taskLabel: 'Task',
    category: '開発',
    stateSummary: 'Summary',
    evidence: [],
    continuity: 'continue',
    confidence: 0.9,
    sourceSnapshotIds: [],
    llmModel: 'model',
    createdAt: '2024-01-01T00:00:00Z',
    isDistracted: false,
    status: 'completed',
    appSummary: [],
    urlSummary: [],
    ...overrides,
  };
}

describe('db/repositories/checkpoints', () => {
  let conn: DatabaseConnection;
  let repo: CheckpointRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new CheckpointRepository(conn);
  });

  afterEach(() => {
    conn.close();
  });

  it('inserts and retrieves by listBetween', () => {
    repo.insert(makeCheckpoint('cp_1', { startAt: '2024-01-01T00:00:00Z', endAt: '2024-01-01T01:00:00Z' }));
    repo.insert(makeCheckpoint('cp_2', { startAt: '2024-01-01T02:00:00Z', endAt: '2024-01-01T03:00:00Z' }));
    const list = repo.listBetween('2024-01-01T00:30:00Z', '2024-01-01T02:30:00Z');
    expect(list).toHaveLength(2);
  });

  it('filters by status', () => {
    repo.insert(makeCheckpoint('cp_1', { status: 'completed' }));
    repo.insert(makeCheckpoint('cp_2', { status: 'failed' }));
    const list = repo.listBetween('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('cp_1');
  });

  it('returns the last completed checkpoint', () => {
    repo.insert(makeCheckpoint('cp_1', { endAt: '2024-01-01T01:00:00Z' }));
    repo.insert(makeCheckpoint('cp_2', { endAt: '2024-01-01T03:00:00Z' }));
    const last = repo.getLast();
    expect(last?.id).toBe('cp_2');
  });

  describe('deleteBetween', () => {
    it('deletes completed checkpoints within the date range', () => {
      repo.insert(makeCheckpoint('cp_1', { startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z' }));
      repo.insert(makeCheckpoint('cp_2', { startAt: '2024-01-15T14:00:00Z', endAt: '2024-01-15T15:00:00Z' }));
      repo.insert(makeCheckpoint('cp_3', { startAt: '2024-01-16T10:00:00Z', endAt: '2024-01-16T11:00:00Z' }));

      const count = repo.deleteBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(2);

      const remaining = repo.listBetween('2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('cp_3');
    });

    it('does not delete failed checkpoints', () => {
      repo.insert(makeCheckpoint('cp_1', { startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z', status: 'completed' }));
      repo.insert(makeCheckpoint('cp_2', { startAt: '2024-01-15T12:00:00Z', endAt: '2024-01-15T13:00:00Z', status: 'failed' }));

      const count = repo.deleteBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(1);

      const all = conn.prepare('SELECT id, status FROM checkpoints').all() as { id: string; status: string }[];
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('cp_2');
      expect(all[0].status).toBe('failed');
    });

    it('deletes checkpoints that span across the date boundary', () => {
      repo.insert(makeCheckpoint('cp_1', { startAt: '2024-01-14T23:00:00Z', endAt: '2024-01-15T01:00:00Z' }));
      repo.insert(makeCheckpoint('cp_2', { startAt: '2024-01-15T23:00:00Z', endAt: '2024-01-16T01:00:00Z' }));
      repo.insert(makeCheckpoint('cp_3', { startAt: '2024-01-16T10:00:00Z', endAt: '2024-01-16T11:00:00Z' }));

      const count = repo.deleteBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(2);

      const remaining = repo.listBetween('2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('cp_3');
    });
  });
});
