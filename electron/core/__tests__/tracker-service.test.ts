// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackerService } from '../tracker-service.js';

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
      expect(analyzeSpy).toHaveBeenCalledWith(true);
      expect(db.getSnapshotById('snap_1')?.status).toBe('captured');
      expect(db.getSnapshotById('snap_1')?.checkpointId).toBeNull();
      expect(db.listCheckpointsBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z')).toHaveLength(0);
      expect(db.listWorkUnitsBetween('2024-01-15T00:00:00Z', '2024-01-15T23:59:59Z')).toHaveLength(0);
      expect(state.isAnalyzing).toBe(false);
    });
  });
});
