// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { WorkUnitRepository } from '../db/repositories/work-units.js';
import { CategoryRuleRepository } from '../db/repositories/category-rules.js';
import type { WorkUnitRecord } from '../../../shared/types.js';

function makeWorkUnit(id: string, overrides: Partial<WorkUnitRecord> = {}): WorkUnitRecord {
  return {
    id,
    startAt: '2024-01-01T00:00:00Z',
    endAt: '2024-01-01T01:00:00Z',
    durationMinutes: 60,
    projectName: 'Proj',
    title: 'Title',
    category: '開発',
    summary: 'Summary',
    progressLevel: '中',
    isDistracted: false,
    checkpointIds: [],
    userEdited: false,
    updatedAt: '2024-01-01T00:00:00Z',
    note: null,
    ...overrides,
  };
}

describe('db/repositories/work-units', () => {
  let conn: DatabaseConnection;
  let repo: WorkUnitRepository;
  let categoryRules: CategoryRuleRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    categoryRules = new CategoryRuleRepository(conn);
    repo = new WorkUnitRepository(conn, categoryRules);
  });

  afterEach(() => {
    conn.close();
  });

  it('inserts and retrieves by id', () => {
    const wu = makeWorkUnit('wu_1', { title: 'Task A' });
    repo.insert(wu);
    const found = repo.getById('wu_1');
    expect(found?.title).toBe('Task A');
  });

  it('updates a record', () => {
    repo.insert(makeWorkUnit('wu_1'));
    repo.update({ ...makeWorkUnit('wu_1'), title: 'Updated' });
    const found = repo.getById('wu_1');
    expect(found?.title).toBe('Updated');
  });

  it('lists work units between dates', () => {
    repo.insert(makeWorkUnit('wu_1', { startAt: '2024-01-01T00:00:00Z', endAt: '2024-01-01T01:00:00Z' }));
    repo.insert(makeWorkUnit('wu_2', { startAt: '2024-01-01T02:00:00Z', endAt: '2024-01-01T03:00:00Z' }));
    const list = repo.listBetween('2024-01-01T00:30:00Z', '2024-01-01T02:30:00Z');
    expect(list).toHaveLength(2);
  });

  it('lists recent work units in descending order', () => {
    repo.insert(makeWorkUnit('wu_1', { endAt: '2024-01-01T01:00:00Z' }));
    repo.insert(makeWorkUnit('wu_2', { endAt: '2024-01-01T03:00:00Z' }));
    const list = repo.listRecent(10);
    expect(list[0].id).toBe('wu_2');
  });

  it('gets current work unit (latest endAt)', () => {
    repo.insert(makeWorkUnit('wu_1', { endAt: '2024-01-01T01:00:00Z' }));
    repo.insert(makeWorkUnit('wu_2', { endAt: '2024-01-01T03:00:00Z' }));
    const current = repo.getCurrent();
    expect(current?.id).toBe('wu_2');
  });

  it('patch returns null for missing id', () => {
    const result = repo.patch({ id: 'missing' });
    expect(result).toBeNull();
  });

  it('patch updates fields and sets userEdited', () => {
    repo.insert(makeWorkUnit('wu_1'));
    const result = repo.patch({ id: 'wu_1', title: 'Patched' });
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Patched');
    expect(result?.userEdited).toBe(true);
    expect(result?.updatedAt).not.toBe('2024-01-01T00:00:00Z');
  });

  it('patch updates category rule when projectName is known', () => {
    repo.insert(makeWorkUnit('wu_1', { projectName: 'MyProject' }));
    repo.patch({ id: 'wu_1', category: '調査・情報収集' });
    expect(categoryRules.get('MyProject')).toBe('調査・情報収集');
  });

  it('patch does not update category rule for unknown project', () => {
    repo.insert(makeWorkUnit('wu_1', { projectName: '不明' }));
    repo.patch({ id: 'wu_1', category: '開発' });
    expect(categoryRules.get('不明')).toBeNull();
  });

  it('patch allows setting note to null', () => {
    repo.insert(makeWorkUnit('wu_1', { note: 'existing' }));
    const result = repo.patch({ id: 'wu_1', note: null });
    expect(result?.note).toBeNull();
  });

  describe('deleteBetween', () => {
    it('deletes work units within the date range', () => {
      repo.insert(makeWorkUnit('wu_1', { startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z' }));
      repo.insert(makeWorkUnit('wu_2', { startAt: '2024-01-15T14:00:00Z', endAt: '2024-01-15T15:00:00Z' }));
      repo.insert(makeWorkUnit('wu_3', { startAt: '2024-01-16T10:00:00Z', endAt: '2024-01-16T11:00:00Z' }));

      const count = repo.deleteBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(2);

      const remaining = repo.listBetween('2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('wu_3');
    });

    it('deletes work units that span across the date boundary', () => {
      repo.insert(makeWorkUnit('wu_1', { startAt: '2024-01-14T23:00:00Z', endAt: '2024-01-15T01:00:00Z' }));
      repo.insert(makeWorkUnit('wu_2', { startAt: '2024-01-15T23:00:00Z', endAt: '2024-01-16T01:00:00Z' }));
      repo.insert(makeWorkUnit('wu_3', { startAt: '2024-01-16T10:00:00Z', endAt: '2024-01-16T11:00:00Z' }));

      const count = repo.deleteBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(2);

      const remaining = repo.listBetween('2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('wu_3');
    });
  });
});
