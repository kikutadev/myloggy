// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackerService } from '../tracker-service.js';
import { analyzeWindow } from '../llm.js';
import type { AnalysisProgress } from '../../shared/types.js';

vi.mock('../llm.js', () => ({
  analyzeWindow: vi.fn(),
}));

vi.mock('../capture.js', () => ({
  captureScreenshot: vi.fn(),
  deleteScreenshots: vi.fn(),
}));

describe('TrackerService', () => {
  let tracker: TrackerService;

  beforeEach(() => {
    tracker = new TrackerService('/tmp/myloggy-test-' + Date.now(), 'ja');
  });

  afterEach(() => {
    tracker.dispose();
  });

  describe('reanalyzeDate', () => {
    it('resets processed snapshots and deletes checkpoints/work units for the target date', async () => {
      const db = (tracker as unknown as { db: { insertSnapshot: Function; insertCheckpoint: Function; insertWorkUnit: Function; getSnapshotById: Function; listCheckpointsBetween: Function; listWorkUnitsBetween: Function; resetAnalysisForDate: Function } }).db;

      // Arrange: insert test data
      db.insertSnapshot({
        id: 'snap_1', capturedAt: '2024-01-15T10:00:00Z', status: 'processed', checkpointId: 'cp_1',
        imagePath: null, imageHash: null, imagePaths: [], imageHashes: [], displayCount: 1,
        cursorX: null, cursorY: null, cursorDisplayId: null, cursorDisplayIndex: null,
        cursorRelativeX: null, cursorRelativeY: null, activeApp: null, windowTitle: null,
        pageTitle: null, url: null, keyboardActivity: null, mouseActivity: null,
        appSwitchCount: null, gitBranch: null, gitDirty: null, manualNote: null,
        excludedReason: null, metadataJson: null,
      });
      db.insertCheckpoint({
        id: 'cp_1', startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z',
        projectName: 'Proj', taskLabel: 'Task', category: '開発', stateSummary: 'Summary',
        evidence: [], continuity: 'continue', confidence: 0.9, sourceSnapshotIds: [],
        llmModel: 'model', createdAt: '2024-01-15T10:00:00Z', isDistracted: false,
        status: 'completed', appSummary: [], urlSummary: [],
      });
      db.insertWorkUnit({
        id: 'wu_1', startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z',
        durationMinutes: 60, projectName: 'Proj', title: 'Title', category: '開発',
        summary: 'Summary', progressLevel: '中', isDistracted: false, checkpointIds: ['cp_1'],
        userEdited: false, updatedAt: '2024-01-15T10:00:00Z', note: null,
      });

      // Mock analyzeReadyWindows to avoid LLM calls
      const analyzeSpy = vi.fn().mockResolvedValue(undefined);
      (tracker as unknown as { analyzeReadyWindows: Function }).analyzeReadyWindows = analyzeSpy;

      // Act
      const state = await tracker.reanalyzeDate('2024-01-15');

      // Assert
      expect(analyzeSpy).toHaveBeenCalledWith(true, expect.any(String), expect.any(String));
      expect(db.getSnapshotById('snap_1')?.status).toBe('captured');
      expect(db.getSnapshotById('snap_1')?.checkpointId).toBeNull();
      expect(db.listCheckpointsBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z')).toHaveLength(0);
      expect(db.listWorkUnitsBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z')).toHaveLength(0);
      expect(state.isAnalyzing).toBe(false);
    });
  });

  describe('progress events', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('setProgressListenerでリスナーを設定できる', () => {
      const listener = vi.fn();
      tracker.setProgressListener(listener);
      (tracker as unknown as { emitProgress: (p: AnalysisProgress) => void }).emitProgress({ phase: 'analyze', current: 0, total: 1, message: 'test' });
      expect(listener).toHaveBeenCalledWith({ phase: 'analyze', current: 0, total: 1, message: 'test' });
    });

    it('analyzeReadyWindows実行時にanalyzeとcompleteフェーズが発行される', async () => {
      const db = (tracker as unknown as { db: { insertSnapshot: Function } }).db;
      db.insertSnapshot({
        id: 'snap_1', capturedAt: '2024-01-15T11:55:00Z', status: 'captured', checkpointId: null,
        imagePath: null, imageHash: null, imagePaths: [], imageHashes: [], displayCount: 1,
        cursorX: 100, cursorY: 100, cursorDisplayId: null, cursorDisplayIndex: null,
        cursorRelativeX: null, cursorRelativeY: null, activeApp: 'App', windowTitle: 'Win',
        pageTitle: null, url: null, keyboardActivity: null, mouseActivity: null,
        appSwitchCount: null, gitBranch: null, gitDirty: null, manualNote: null,
        excludedReason: null, metadataJson: null,
      });
      db.insertSnapshot({
        id: 'snap_2', capturedAt: '2024-01-15T12:05:00Z', status: 'captured', checkpointId: null,
        imagePath: null, imageHash: null, imagePaths: [], imageHashes: [], displayCount: 1,
        cursorX: 200, cursorY: 200, cursorDisplayId: null, cursorDisplayIndex: null,
        cursorRelativeX: null, cursorRelativeY: null, activeApp: 'App', windowTitle: 'Win',
        pageTitle: null, url: null, keyboardActivity: null, mouseActivity: null,
        appSwitchCount: null, gitBranch: null, gitDirty: null, manualNote: null,
        excludedReason: null, metadataJson: null,
      });

      vi.mocked(analyzeWindow).mockResolvedValue({
        id: 'cp_1', startAt: '2024-01-15T11:55:00Z', endAt: '2024-01-15T12:05:00Z',
        projectName: 'Proj', taskLabel: 'Task', category: '開発', stateSummary: 'Summary',
        evidence: [], continuity: 'continue', confidence: 0.9, sourceSnapshotIds: ['snap_1', 'snap_2'],
        llmModel: 'model', createdAt: '2024-01-15T12:00:00Z', isDistracted: false,
        status: 'completed', appSummary: [], urlSummary: [],
      } as any);

      const progressEvents: AnalysisProgress[] = [];
      tracker.setProgressListener((p) => progressEvents.push(p));

      await tracker.analyzeNow();

      expect(progressEvents).toHaveLength(4);
      expect(progressEvents[0]).toEqual({ phase: 'analyze', current: 0, total: 2, message: 'AI解析中... (0/2)' });
      expect(progressEvents[1]).toEqual({ phase: 'analyze', current: 1, total: 2, message: 'AI解析中... (1/2)' });
      expect(progressEvents[2]).toEqual({ phase: 'analyze', current: 2, total: 2, message: 'AI解析中... (2/2)' });
      expect(progressEvents[3]).toEqual({ phase: 'complete', current: 2, total: 2, message: '完了 (2件処理)' });
    });

    it('reanalyzeDate実行時にresetフェーズが発行される', async () => {
      const db = (tracker as unknown as { db: { insertSnapshot: Function; insertCheckpoint: Function; insertWorkUnit: Function } }).db;
      db.insertSnapshot({
        id: 'snap_1', capturedAt: '2024-01-15T10:00:00Z', status: 'processed', checkpointId: 'cp_1',
        imagePath: null, imageHash: null, imagePaths: [], imageHashes: [], displayCount: 1,
        cursorX: null, cursorY: null, cursorDisplayId: null, cursorDisplayIndex: null,
        cursorRelativeX: null, cursorRelativeY: null, activeApp: null, windowTitle: null,
        pageTitle: null, url: null, keyboardActivity: null, mouseActivity: null,
        appSwitchCount: null, gitBranch: null, gitDirty: null, manualNote: null,
        excludedReason: null, metadataJson: null,
      });
      db.insertCheckpoint({
        id: 'cp_1', startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z',
        projectName: 'Proj', taskLabel: 'Task', category: '開発', stateSummary: 'Summary',
        evidence: [], continuity: 'continue', confidence: 0.9, sourceSnapshotIds: [],
        llmModel: 'model', createdAt: '2024-01-15T10:00:00Z', isDistracted: false,
        status: 'completed', appSummary: [], urlSummary: [],
      });
      db.insertWorkUnit({
        id: 'wu_1', startAt: '2024-01-15T10:00:00Z', endAt: '2024-01-15T11:00:00Z',
        durationMinutes: 60, projectName: 'Proj', title: 'Title', category: '開発',
        summary: 'Summary', progressLevel: '中', isDistracted: false, checkpointIds: ['cp_1'],
        userEdited: false, updatedAt: '2024-01-15T10:00:00Z', note: null,
      });

      const progressEvents: AnalysisProgress[] = [];
      tracker.setProgressListener((p) => progressEvents.push(p));

      const analyzeSpy = vi.fn().mockResolvedValue(undefined);
      (tracker as unknown as { analyzeReadyWindows: Function }).analyzeReadyWindows = analyzeSpy;

      await tracker.reanalyzeDate('2024-01-15');

      expect(progressEvents).toHaveLength(2);
      expect(progressEvents[0]).toEqual({ phase: 'reset', current: 0, total: 0, message: '既存解析結果を削除中...' });
      expect(progressEvents[1]).toEqual({ phase: 'reset', current: 1, total: 1, message: '既存解析結果を削除しました (1件)' });
    });
  });
});
