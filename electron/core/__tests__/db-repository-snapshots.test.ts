// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { SnapshotRepository } from '../db/repositories/snapshots.js';
import type { SnapshotRecord } from '../../../shared/types.js';

function makeSnapshot(id: string, overrides: Partial<SnapshotRecord> = {}): SnapshotRecord {
  return {
    id,
    capturedAt: '2024-01-01T00:00:00Z',
    imagePath: null,
    imageHash: null,
    imagePaths: [],
    imageHashes: [],
    displayCount: 1,
    cursorX: null,
    cursorY: null,
    cursorDisplayId: null,
    cursorDisplayIndex: null,
    cursorRelativeX: null,
    cursorRelativeY: null,
    activeApp: null,
    windowTitle: null,
    pageTitle: null,
    url: null,
    keyboardActivity: null,
    mouseActivity: null,
    appSwitchCount: null,
    gitBranch: null,
    gitDirty: null,
    manualNote: null,
    status: 'captured',
    excludedReason: null,
    metadataJson: null,
    checkpointId: null,
    ...overrides,
  };
}

describe('db/repositories/snapshots', () => {
  let conn: DatabaseConnection;
  let repo: SnapshotRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new SnapshotRepository(conn);
  });

  afterEach(() => {
    conn.close();
  });

  it('inserts and retrieves by id', () => {
    const snap = makeSnapshot('snap_1', { activeApp: 'Code' });
    repo.insert(snap);
    const found = repo.getById('snap_1');
    expect(found).not.toBeNull();
    expect(found?.activeApp).toBe('Code');
  });

  it('lists recent snapshots in descending order', () => {
    repo.insert(makeSnapshot('snap_1', { capturedAt: '2024-01-01T00:00:00Z' }));
    repo.insert(makeSnapshot('snap_2', { capturedAt: '2024-01-01T00:01:00Z' }));
    const list = repo.listRecent(10);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('snap_2');
  });

  it('lists only pending snapshots', () => {
    repo.insert(makeSnapshot('snap_1', { status: 'captured' }));
    repo.insert(makeSnapshot('snap_2', { status: 'processed', checkpointId: 'cp_1' }));
    const pending = repo.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('snap_1');
  });

  it('counts pending snapshots', () => {
    repo.insert(makeSnapshot('snap_1'));
    repo.insert(makeSnapshot('snap_2', { checkpointId: 'cp_1', status: 'processed' }));
    expect(repo.countPending()).toBe(1);
  });

  it('clears pending snapshots', () => {
    repo.insert(makeSnapshot('snap_1'));
    const cleared = repo.clearPending();
    expect(cleared).toHaveLength(1);
    expect(repo.countPending()).toBe(0);
  });

  it('marks snapshots as processed', () => {
    repo.insert(makeSnapshot('snap_1'));
    repo.insert(makeSnapshot('snap_2'));
    repo.markProcessed(['snap_1'], 'cp_1');
    const s1 = repo.getById('snap_1');
    expect(s1?.status).toBe('processed');
    expect(s1?.checkpointId).toBe('cp_1');
    const s2 = repo.getById('snap_2');
    expect(s2?.status).toBe('captured');
  });

  it('increments analysis attempts', () => {
    repo.insert(makeSnapshot('snap_1'));
    repo.incrementAnalysisAttempts(['snap_1']);
    const s1 = repo.getById('snap_1');
    expect(s1?.status).toBe('analysis_failed');
  });

  it('returns max analysis attempts across ids', () => {
    repo.insert(makeSnapshot('snap_1'));
    repo.insert(makeSnapshot('snap_2'));
    repo.incrementAnalysisAttempts(['snap_1']);
    repo.incrementAnalysisAttempts(['snap_1']);
    expect(repo.getMaxAnalysisAttempts(['snap_1', 'snap_2'])).toBe(2);
  });

  it('groups snapshots into ready windows', () => {
    repo.insert(makeSnapshot('snap_1', { capturedAt: '2024-01-01T00:02:00Z' }));
    repo.insert(makeSnapshot('snap_2', { capturedAt: '2024-01-01T00:05:00Z' }));
    repo.insert(makeSnapshot('snap_3', { capturedAt: '2024-01-01T00:15:00Z' }));
    const windows = repo.getReadyWindows(10, '2024-01-01T01:00:00Z');
    expect(windows).toHaveLength(2);
    expect(windows[0]).toHaveLength(2);
    expect(windows[1]).toHaveLength(1);
  });

  it('lists snapshots by checkpoint id', () => {
    repo.insert(makeSnapshot('snap_1', { checkpointId: 'cp_1', status: 'processed' }));
    repo.insert(makeSnapshot('snap_2', { checkpointId: 'cp_1', status: 'processed' }));
    repo.insert(makeSnapshot('snap_3'));
    const list = repo.listByCheckpointId('cp_1');
    expect(list).toHaveLength(2);
  });

  it('updates image paths', () => {
    repo.insert(makeSnapshot('snap_1'));
    repo.updateImagePaths('snap_1', ['/a.png', '/b.png']);
    const snap = repo.getById('snap_1');
    expect(snap?.imagePaths).toEqual(['/a.png', '/b.png']);
    expect(snap?.imagePath).toBe('/a.png');
  });

  describe('resetProcessedBetween', () => {
    it('resets processed snapshots to captured state within the date range', () => {
      repo.insert(makeSnapshot('snap_1', { capturedAt: '2024-01-15T10:00:00Z', status: 'processed', checkpointId: 'cp_1' }));
      repo.insert(makeSnapshot('snap_2', { capturedAt: '2024-01-15T14:00:00Z', status: 'processed', checkpointId: 'cp_2' }));
      repo.insert(makeSnapshot('snap_3', { capturedAt: '2024-01-16T10:00:00Z', status: 'processed', checkpointId: 'cp_3' }));

      const count = repo.resetProcessedBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(2);

      const s1 = repo.getById('snap_1');
      expect(s1?.status).toBe('captured');
      expect(s1?.checkpointId).toBeNull();

      const s2 = repo.getById('snap_2');
      expect(s2?.status).toBe('captured');
      expect(s2?.checkpointId).toBeNull();

      const s3 = repo.getById('snap_3');
      expect(s3?.status).toBe('processed');
      expect(s3?.checkpointId).toBe('cp_3');
    });

    it('resets analysis_attempts to 0', () => {
      repo.insert(makeSnapshot('snap_1', { capturedAt: '2024-01-15T10:00:00Z', status: 'processed', checkpointId: 'cp_1' }));
      repo.incrementAnalysisAttempts(['snap_1']);
      repo.markProcessed(['snap_1'], 'cp_1');

      repo.resetProcessedBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      const s1 = repo.getById('snap_1');
      expect(s1?.status).toBe('captured');
      expect(s1?.checkpointId).toBeNull();
    });

    it('does not affect non-processed snapshots', () => {
      repo.insert(makeSnapshot('snap_1', { capturedAt: '2024-01-15T10:00:00Z', status: 'captured' }));
      repo.insert(makeSnapshot('snap_2', { capturedAt: '2024-01-15T11:00:00Z', status: 'analysis_failed' }));

      const count = repo.resetProcessedBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z');
      expect(count).toBe(0);

      const s1 = repo.getById('snap_1');
      expect(s1?.status).toBe('captured');
      const s2 = repo.getById('snap_2');
      expect(s2?.status).toBe('analysis_failed');
    });
  });
});
