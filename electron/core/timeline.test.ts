import { describe, it, expect, beforeEach, vi } from 'vitest';
import dayjs from 'dayjs';

import {
  buildDayTimeline,
  buildWeekTimeline,
  buildMonthTimeline,
  buildDashboard,
} from './timeline.js';
import type { AppDatabaseLike } from './timeline.types.js';
import type { CheckpointRecord, WorkUnitRecord, ErrorLogRecord, AppState } from '../../shared/types.js';

const createMockWorkUnit = (overrides: Partial<WorkUnitRecord> = {}): WorkUnitRecord => ({
  id: 'w1',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T10:00:00Z',
  durationMinutes: 60,
  projectName: 'myloggy',
  title: '開発',
  category: '開発',
  summary: 'コーディング',
  progressLevel: '高',
  isDistracted: false,
  checkpointIds: ['c1'],
  userEdited: false,
  updatedAt: '2024-01-15T10:00:00Z',
  note: null,
  ...overrides,
});

const createMockCheckpoint = (overrides: Partial<CheckpointRecord> = {}): CheckpointRecord => ({
  id: 'c1',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T09:30:00Z',
  projectName: 'myloggy',
  taskLabel: '開発',
  category: '開発',
  stateSummary: 'コーディング中',
  evidence: ['VS Code使用'],
  continuity: 'continue',
  confidence: 0.8,
  sourceSnapshotIds: ['s1'],
  llmModel: 'gemma4:26b',
  createdAt: '2024-01-15T09:30:00Z',
  isDistracted: false,
  status: 'completed',
  appSummary: ['VS Code'],
  urlSummary: [],
  ...overrides,
});

const createMockDb = (): AppDatabaseLike => ({
  listWorkUnitsBetween: vi.fn(),
  listCheckpointsBetween: vi.fn(),
  listRecentWorkUnits: vi.fn(),
  listErrors: vi.fn(),
});

describe('buildDayTimeline', () => {
  it('指定日付のWorkUnitとCheckpointを取得してサマリーを計算', () => {
    const db = createMockDb();
    const mockUnits = [
      createMockWorkUnit({ id: 'w1', durationMinutes: 60, projectName: 'myloggy', category: '開発' }),
      createMockWorkUnit({ id: 'w2', durationMinutes: 30, projectName: 'myloggy', category: '調査' }),
    ];
    const mockCheckpoints = [createMockCheckpoint({ id: 'c1' })];

    vi.mocked(db.listWorkUnitsBetween).mockReturnValue(mockUnits);
    vi.mocked(db.listCheckpointsBetween).mockReturnValue(mockCheckpoints);

    const result = buildDayTimeline(db, '2024-01-15');

    expect(result.date).toBe('2024-01-15');
    expect(result.units).toHaveLength(2);
    expect(result.checkpoints).toHaveLength(1);
    expect(result.totalMinutes).toBe(90);

    expect(result.categorySummary).toEqual([
      { category: '開発', minutes: 60 },
      { category: '調査', minutes: 30 },
    ]);

    expect(result.projectSummary).toEqual([
      { projectName: 'myloggy', minutes: 90 },
    ]);
  });

  it('データがない場合は空の結果を返す', () => {
    const db = createMockDb();
    vi.mocked(db.listWorkUnitsBetween).mockReturnValue([]);
    vi.mocked(db.listCheckpointsBetween).mockReturnValue([]);

    const result = buildDayTimeline(db, '2024-01-15');

    expect(result.date).toBe('2024-01-15');
    expect(result.units).toHaveLength(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.categorySummary).toHaveLength(0);
    expect(result.projectSummary).toHaveLength(0);
  });
});

describe('buildWeekTimeline', () => {
  it('週単位のWorkUnitを集約してサマリー計算', () => {
    const db = createMockDb();
    const mockUnits = [
      createMockWorkUnit({ id: 'w1', durationMinutes: 60, projectName: 'myloggy', category: '開発', isDistracted: false }),
      createMockWorkUnit({ id: 'w2', durationMinutes: 30, projectName: 'myloggy', category: '開発', isDistracted: true }),
      createMockWorkUnit({ id: 'w3', durationMinutes: 45, projectName: 'other', category: '調査', isDistracted: false }),
    ];

    vi.mocked(db.listWorkUnitsBetween).mockReturnValue(mockUnits);

    const result = buildWeekTimeline(db, '2024-01-15');

    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    expect(result.units).toHaveLength(3);
    expect(result.totalMinutes).toBe(135);
    expect(result.distractedCount).toBe(1);

    expect(result.categorySummary).toEqual([
      { category: '開発', minutes: 90 },
      { category: '調査', minutes: 45 },
    ]);

    expect(result.longestUnits).toHaveLength(3);
    expect(result.longestUnits[0].durationMinutes).toBe(60);
  });

  it('データがない場合は空の結果を返す', () => {
    const db = createMockDb();
    vi.mocked(db.listWorkUnitsBetween).mockReturnValue([]);

    const result = buildWeekTimeline(db, '2024-01-15');

    expect(result.totalMinutes).toBe(0);
    expect(result.distractedCount).toBe(0);
    expect(result.longestUnits).toHaveLength(0);
  });
});

describe('buildMonthTimeline', () => {
  it('月間カレンダーを構築して代表Unitを選択', () => {
    const db = createMockDb();
    const startOfMonth = '2024-01-01T00:00:00.000Z';
    const endOfMonth = '2024-01-31T23:59:59.999Z';

    const mockUnits = [
      createMockWorkUnit({
        id: 'w1',
        startAt: '2024-01-15T09:00:00Z',
        endAt: '2024-01-15T10:00:00Z',
        durationMinutes: 60,
        projectName: 'myloggy',
        category: '開発',
      }),
      createMockWorkUnit({
        id: 'w2',
        startAt: '2024-01-20T14:00:00Z',
        endAt: '2024-01-20T15:30:00Z',
        durationMinutes: 90,
        projectName: 'myloggy',
        category: '開発',
      }),
    ];

    vi.mocked(db.listWorkUnitsBetween).mockReturnValue(mockUnits);

    const result = buildMonthTimeline(db, '2024-01-15', 'en');

    expect(result.month).toBe('2024-01');
    expect(result.days).toBeDefined();
    expect(result.days.length).toBeGreaterThan(0);

    const day15 = result.days.find((d) => d.date === '2024-01-15');
    expect(day15).toBeDefined();
    expect(day15?.totalMinutes).toBe(60);
    expect(day15?.representativeUnit?.id).toBe('w1');

    const day20 = result.days.find((d) => d.date === '2024-01-20');
    expect(day20?.representativeUnit?.id).toBe('w2');
  });

  it('localeに従ってコメント生成', () => {
    const db = createMockDb();
    vi.mocked(db.listWorkUnitsBetween).mockReturnValue([
      createMockWorkUnit({ category: '開発', projectName: 'myloggy' }),
    ]);

    const resultJa = buildMonthTimeline(db, '2024-01-15', 'ja');
    const resultEn = buildMonthTimeline(db, '2024-01-15', 'en');

    expect(resultJa.comment).toBeDefined();
    expect(resultEn.comment).toBeDefined();
  });
});

describe('buildDashboard', () => {
  it('今日・週・月のデータを統合', () => {
    const db = createMockDb();
    const mockState: AppState = {
      isTracking: true,
      isAnalyzing: false,
      pendingSnapshots: 0,
      pendingWindows: 0,
      lastCaptureAt: null,
      lastCheckpointAt: null,
      lastError: null,
      currentWorkUnit: null,
    };

    const mockUnit = createMockWorkUnit();
    const mockError: ErrorLogRecord = {
      id: 'e1',
      createdAt: '2024-01-15T10:00:00Z',
      scope: 'capture',
      message: 'Test error',
      detail: null,
    };

    vi.mocked(db.listWorkUnitsBetween).mockReturnValue([mockUnit]);
    vi.mocked(db.listCheckpointsBetween).mockReturnValue([createMockCheckpoint()]);
    vi.mocked(db.listRecentWorkUnits).mockReturnValue([mockUnit]);
    vi.mocked(db.listErrors).mockReturnValue([mockError]);

    const result = buildDashboard(db, '2024-01-15', mockState, 'en');

    expect(result.state).toBe(mockState);
    expect(result.today.date).toBe('2024-01-15');
    expect(result.week.startDate).toBeDefined();
    expect(result.month.month).toBe('2024-01');
    expect(result.recentUnits).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });
});