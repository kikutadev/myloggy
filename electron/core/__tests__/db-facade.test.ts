// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '../db.js';
import type {
  SnapshotRecord,
  CheckpointRecord,
  WorkUnitRecord,
} from '../../../shared/types.js';

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

describe('db/AppDatabase Facade', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase('/tmp', true);
  });

  afterEach(() => {
    db.close();
  });

  it('initializes default settings', () => {
    const settings = db.getSettings();
    expect(settings.llmProvider).toBe('ollama');
  });

  it('saves and retrieves settings', () => {
    const settings = db.getSettings();
    settings.llmModel = 'custom';
    db.saveSettings(settings);
    expect(db.getSettings().llmModel).toBe('custom');
  });

  it('inserts and retrieves snapshots', () => {
    db.insertSnapshot(makeSnapshot('snap_1', { activeApp: 'Code' }));
    const recent = db.listRecentSnapshots(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].activeApp).toBe('Code');
  });

  it('counts pending snapshots', () => {
    db.insertSnapshot(makeSnapshot('snap_1'));
    db.insertSnapshot(makeSnapshot('snap_2', { checkpointId: 'cp_1', status: 'processed' }));
    expect(db.countPendingSnapshots()).toBe(1);
    expect(db.listPendingSnapshots()).toHaveLength(1);
  });

  it('marks snapshots processed', () => {
    db.insertSnapshot(makeSnapshot('snap_1'));
    db.markSnapshotsProcessed(['snap_1'], 'cp_1');
    const snap = db.getSnapshotById('snap_1');
    expect(snap?.status).toBe('processed');
    expect(snap?.checkpointId).toBe('cp_1');
  });

  it('increments analysis attempts', () => {
    db.insertSnapshot(makeSnapshot('snap_1'));
    db.incrementAnalysisAttempts(['snap_1']);
    expect(db.getSnapshotById('snap_1')?.status).toBe('analysis_failed');
  });

  it('inserts and lists checkpoints', () => {
    db.insertCheckpoint(makeCheckpoint('cp_1', { startAt: '2024-01-01T00:00:00Z', endAt: '2024-01-01T01:00:00Z' }));
    db.insertCheckpoint(makeCheckpoint('cp_2', { startAt: '2024-01-01T02:00:00Z', endAt: '2024-01-01T03:00:00Z' }));
    const list = db.listCheckpointsBetween('2024-01-01T00:30:00Z', '2024-01-01T02:30:00Z');
    expect(list).toHaveLength(2);
    expect(db.getLastCheckpoint()?.id).toBe('cp_2');
  });

  it('inserts and patches work units', () => {
    db.insertWorkUnit(makeWorkUnit('wu_1'));
    const patched = db.patchWorkUnit({ id: 'wu_1', title: 'Patched' });
    expect(patched?.title).toBe('Patched');
    expect(patched?.userEdited).toBe(true);
    expect(db.getWorkUnitById('wu_1')?.title).toBe('Patched');
  });

  it('gets current work unit', () => {
    db.insertWorkUnit(makeWorkUnit('wu_1', { endAt: '2024-01-01T01:00:00Z' }));
    db.insertWorkUnit(makeWorkUnit('wu_2', { endAt: '2024-01-01T03:00:00Z' }));
    expect(db.getCurrentWorkUnit()?.id).toBe('wu_2');
  });

  it('inserts and lists errors', () => {
    db.insertError('scope', 'msg', 'detail');
    const errors = db.listErrors(10);
    expect(errors).toHaveLength(1);
    expect(errors[0].detail).toBe('detail');
  });

  it('clears errors', () => {
    db.insertError('scope', 'msg');
    db.clearErrors();
    expect(db.listErrors(10)).toHaveLength(0);
  });

  it('upserts and gets category rules', () => {
    db.upsertCategoryRule('proj-a', '開発');
    expect(db.getCategoryRule('proj-a')).toBe('開発');
  });

  it('inserts and lists analysis logs', () => {
    db.insertAnalysisLog({
      provider: 'ollama',
      model: 'm',
      locale: 'ja',
      promptText: 'prompt',
      snapshotIds: ['s1'],
    });
    const logs = db.listAnalysisLogs(10);
    expect(logs).toHaveLength(1);
    expect(logs[0].snapshotIds).toEqual(['s1']);
  });

  it('lists known project names across work_units and category_rules', () => {
    db.insertWorkUnit(makeWorkUnit('wu_1', { projectName: 'FromWorkUnit' }));
    db.upsertCategoryRule('FromCategoryRule', '開発');
    const names = db.listKnownProjectNames(50);
    expect(names).toContain('FromWorkUnit');
    expect(names).toContain('FromCategoryRule');
  });

  it('clears pending snapshots', () => {
    db.insertSnapshot(makeSnapshot('snap_1'));
    const cleared = db.clearPendingSnapshots();
    expect(cleared).toHaveLength(1);
    expect(db.countPendingSnapshots()).toBe(0);
  });

  it('returns ready snapshot windows', () => {
    db.insertSnapshot(makeSnapshot('snap_1', { capturedAt: '2024-01-01T00:02:00Z' }));
    db.insertSnapshot(makeSnapshot('snap_2', { capturedAt: '2024-01-01T00:05:00Z' }));
    const windows = db.getReadySnapshotWindows(10, '2024-01-01T01:00:00Z');
    expect(windows).toHaveLength(1);
    expect(windows[0]).toHaveLength(2);
  });
});
