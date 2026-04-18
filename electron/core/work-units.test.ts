import { describe, it, expect } from 'vitest';

import {
  shouldMergeWorkUnit,
  createWorkUnitFromCheckpoint,
  mergeCheckpointIntoWorkUnit,
} from './work-units.js';
import type { AppSettings, CheckpointRecord, WorkUnitRecord } from '../../shared/types.js';

const createMockCheckpoint = (overrides: Partial<CheckpointRecord> = {}): CheckpointRecord => ({
  id: 'c1',
  startAt: '2024-01-15T09:30:00Z',
  endAt: '2024-01-15T10:00:00Z',
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

const createMockWorkUnit = (overrides: Partial<WorkUnitRecord> = {}): WorkUnitRecord => ({
  id: 'w1',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T09:30:00Z',
  durationMinutes: 30,
  projectName: 'myloggy',
  title: '開発',
  category: '開発',
  summary: '設計中',
  progressLevel: '中',
  isDistracted: false,
  checkpointIds: ['c0'],
  userEdited: false,
  updatedAt: '2024-01-15T09:30:00Z',
  note: null,
  ...overrides,
});

const createMockSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  isTracking: true,
  captureIntervalMinutes: 1,
  checkIntervalMinutes: 10,
  llmModel: 'gemma4:26b',
  ollamaHost: 'http://127.0.0.1:11434',
  llmProvider: 'ollama',
  lmstudioHost: 'http://127.0.0.1:1234',
  displayCaptureMode: 'all',
  excludedApps: [],
  excludedDomains: [],
  excludedTimeBlocks: [],
  excludedCaptureMode: 'skip',
  analysisTimeoutMs: 30000,
  maxAnalysisRetries: 3,
  idleGapMinutes: 20,
  categories: [],
  onboardingCompleted: false,
  ...overrides,
});

describe('shouldMergeWorkUnit', () => {
  it('同じプロジェクトでcontinuityがcontinueの場合、マージ対象', () => {
    const current = createMockWorkUnit({ projectName: 'myloggy' });
    const checkpoint = createMockCheckpoint({
      projectName: 'myloggy',
      continuity: 'continue',
      startAt: '2024-01-15T09:30:00Z',
    });
    const settings = createMockSettings({ idleGapMinutes: 20 });

    const result = shouldMergeWorkUnit(current, checkpoint, settings);

    expect(result).toBe(true);
  });

  it('gapがidleGapMinutesを超える場合、マージしない', () => {
    const current = createMockWorkUnit({ endAt: '2024-01-15T09:00:00Z' });
    const checkpoint = createMockCheckpoint({
      startAt: '2024-01-15T10:00:00Z',
    });
    const settings = createMockSettings({ idleGapMinutes: 20 });

    const result = shouldMergeWorkUnit(current, checkpoint, settings);

    expect(result).toBe(false);
  });

  it('projectが異なりcontinuityがswitchの場合、スコアが低いとマージしない', () => {
    const current = createMockWorkUnit({ projectName: 'myloggy' });
    const checkpoint = createMockCheckpoint({
      projectName: 'other',
      continuity: 'switch',
      confidence: 0.5,
    });
    const settings = createMockSettings();

    const result = shouldMergeWorkUnit(current, checkpoint, settings);

    expect(result).toBe(false);
  });

  it('continuityがunclearの場合、スコア閾値で判定', () => {
    const current = createMockWorkUnit({ projectName: 'myloggy' });
    const checkpoint = createMockCheckpoint({
      projectName: 'myloggy',
      continuity: 'unclear',
      confidence: 0.3,
    });
    const settings = createMockSettings();

    const result = shouldMergeWorkUnit(current, checkpoint, settings);

    expect(result).toBe(true);
  });

  it('continuityがswitchでスコアが0.75以上ならマージ', () => {
    const current = createMockWorkUnit({ projectName: 'myloggy', title: '開発' });
    const checkpoint = createMockCheckpoint({
      projectName: 'myloggy',
      taskLabel: '開発',
      continuity: 'switch',
      confidence: 0.9,
    });
    const settings = createMockSettings();

    const result = shouldMergeWorkUnit(current, checkpoint, settings);

    expect(result).toBe(true);
  });
});

describe('createWorkUnitFromCheckpoint', () => {
  it('CheckpointからWorkUnitを生成', () => {
    const checkpoint = createMockCheckpoint({
      startAt: '2024-01-15T09:00:00Z',
      endAt: '2024-01-15T10:00:00Z',
      projectName: 'myloggy',
      taskLabel: '機能開発',
      category: '開発',
      stateSummary: '新機能の実装',
      confidence: 0.9,
      isDistracted: false,
    });

    const result = createWorkUnitFromCheckpoint(checkpoint);

    expect(result.id).toMatch(/^work_/);
    expect(result.startAt).toBe('2024-01-15T09:00:00Z');
    expect(result.endAt).toBe('2024-01-15T10:00:00Z');
    expect(result.durationMinutes).toBe(60);
    expect(result.projectName).toBe('myloggy');
    expect(result.title).toBe('機能開発');
    expect(result.category).toBe('開発');
    expect(result.summary).toBe('新機能の実装');
    expect(result.isDistracted).toBe(false);
    expect(result.checkpointIds).toContain('c1');
    expect(result.userEdited).toBe(false);
  });

  it('confidence >= 0.85 で progressLevel は高', () => {
    const checkpoint = createMockCheckpoint({ confidence: 0.9 });

    const result = createWorkUnitFromCheckpoint(checkpoint);

    expect(result.progressLevel).toBe('高');
  });

  it('0.55 <= confidence < 0.85 で progressLevel は中', () => {
    const checkpoint = createMockCheckpoint({ confidence: 0.7 });

    const result = createWorkUnitFromCheckpoint(checkpoint);

    expect(result.progressLevel).toBe('中');
  });

  it('confidence < 0.55 で progressLevel は低', () => {
    const checkpoint = createMockCheckpoint({ confidence: 0.4 });

    const result = createWorkUnitFromCheckpoint(checkpoint);

    expect(result.progressLevel).toBe('低');
  });
});

describe('mergeCheckpointIntoWorkUnit', () => {
  it('checkpointを既存のWorkUnitにマージ', () => {
    const current = createMockWorkUnit({
      id: 'w1',
      startAt: '2024-01-15T09:00:00Z',
      endAt: '2024-01-15T09:30:00Z',
      durationMinutes: 30,
      projectName: 'myloggy',
      title: '設計',
      summary: 'アーキテクチャ設計',
      checkpointIds: ['c0'],
      userEdited: false,
    });

    const checkpoint = createMockCheckpoint({
      startAt: '2024-01-15T09:30:00Z',
      endAt: '2024-01-15T10:00:00Z',
      projectName: 'myloggy',
      taskLabel: '開発',
      stateSummary: 'コーディング中',
    });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.id).toBe('w1');
    expect(result.startAt).toBe('2024-01-15T09:00:00Z');
    expect(result.endAt).toBe('2024-01-15T10:00:00Z');
    expect(result.durationMinutes).toBe(60);
    expect(result.checkpointIds).toEqual(['c0', 'c1']);
  });

  it('userEditedがtrueの場合、titleとsummaryを更新しない', () => {
    const current = createMockWorkUnit({
      title: 'カスタムタイトル',
      summary: 'カスタム概要',
      userEdited: true,
    });

    const checkpoint = createMockCheckpoint({
      taskLabel: '新しいタスク',
      stateSummary: '新しい概要',
    });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.title).toBe('カスタムタイトル');
    expect(result.summary).toBe('カスタム概要');
  });

  it('userEditedがfalseの場合、titleとsummaryを更新', () => {
    const current = createMockWorkUnit({
      title: '古いタスク',
      summary: '古い概要',
      userEdited: false,
    });

    const checkpoint = createMockCheckpoint({
      taskLabel: '新しいタスク',
      stateSummary: '新しい概要',
    });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.title).toBe('新しいタスク');
    expect(result.summary).toBe('新しい概要');
  });

  it('checkpointのprojectNameが不明でない場合、更新', () => {
    const current = createMockWorkUnit({ projectName: 'old-project' });

    const checkpoint = createMockCheckpoint({ projectName: 'myloggy' });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.projectName).toBe('myloggy');
  });

  it('checkpointのprojectNameが不明の場合、既存のprojectNameを維持', () => {
    const current = createMockWorkUnit({ projectName: 'myloggy' });

    const checkpoint = createMockCheckpoint({ projectName: '不明' });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.projectName).toBe('myloggy');
  });

  it('isDistractedはOR演算でマージ', () => {
    const current = createMockWorkUnit({ isDistracted: false });
    const checkpoint = createMockCheckpoint({ isDistracted: true });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.isDistracted).toBe(true);
  });

  it('progressLevelは高い方を維持', () => {
    const current = createMockWorkUnit({ progressLevel: '高' });
    const checkpoint = createMockCheckpoint({ confidence: 0.4 });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.progressLevel).toBe('高');
  });

  it('checkpointのconfidenceが高い場合、progressLevelが上がることがある', () => {
    const current = createMockWorkUnit({ progressLevel: '低' });
    const checkpoint = createMockCheckpoint({ confidence: 0.9 });

    const result = mergeCheckpointIntoWorkUnit(current, checkpoint);

    expect(result.progressLevel).toBe('高');
  });
});