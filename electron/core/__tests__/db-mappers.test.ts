// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  rowToSnapshot,
  rowToCheckpoint,
  rowToWorkUnit,
  rowToErrorLog,
  rowToAnalysisLog,
} from '../db/mappers.js';

describe('db/mappers', () => {
  describe('rowToSnapshot', () => {
    it('maps a full row correctly', () => {
      const row: Record<string, unknown> = {
        id: 'snap_1',
        captured_at: '2024-01-01T00:00:00Z',
        image_path: '/a.png',
        image_hash: 'hash1',
        image_paths_json: JSON.stringify(['/a.png', '/b.png']),
        image_hashes_json: JSON.stringify(['h1', 'h2']),
        display_count: 2,
        cursor_x: 10,
        cursor_y: 20,
        cursor_display_id: 1,
        cursor_display_index: 0,
        cursor_relative_x: 0.5,
        cursor_relative_y: 0.5,
        active_app: 'Code',
        window_title: 'win',
        page_title: 'page',
        url: 'http://example.com',
        keyboard_activity: 5,
        mouse_activity: 3,
        app_switch_count: 1,
        git_branch: 'main',
        git_dirty: 1,
        manual_note: 'note',
        status: 'captured',
        excluded_reason: null,
        metadata_json: null,
        checkpoint_id: null,
      };
      const snap = rowToSnapshot(row);
      expect(snap.id).toBe('snap_1');
      expect(snap.imagePaths).toEqual(['/a.png', '/b.png']);
      expect(snap.imageHashes).toEqual(['h1', 'h2']);
      expect(snap.gitDirty).toBe(true);
      expect(snap.cursorX).toBe(10);
    });

    it('falls back to legacy image fields when json arrays are empty', () => {
      const row: Record<string, unknown> = {
        id: 'snap_2',
        captured_at: '2024-01-01T00:00:00Z',
        image_path: '/legacy.png',
        image_hash: 'legacy_hash',
        image_paths_json: '[]',
        image_hashes_json: '[]',
        display_count: 1,
        status: 'captured',
      };
      const snap = rowToSnapshot(row);
      expect(snap.imagePaths).toEqual(['/legacy.png']);
      expect(snap.imageHashes).toEqual(['legacy_hash']);
    });

    it('returns empty arrays when no images are present', () => {
      const row: Record<string, unknown> = {
        id: 'snap_3',
        captured_at: '2024-01-01T00:00:00Z',
        image_path: null,
        image_hash: null,
        image_paths_json: null,
        image_hashes_json: null,
        display_count: 0,
        status: 'captured',
      };
      const snap = rowToSnapshot(row);
      expect(snap.imagePaths).toEqual([]);
      expect(snap.imageHashes).toEqual([]);
      expect(snap.displayCount).toBe(0);
    });
  });

  describe('rowToCheckpoint', () => {
    it('maps a full row and normalizes category', () => {
      const row: Record<string, unknown> = {
        id: 'cp_1',
        start_at: '2024-01-01T00:00:00Z',
        end_at: '2024-01-01T01:00:00Z',
        project_name: 'MyProject',
        task_label: 'Task',
        category: '開発',
        state_summary: 'Summary',
        evidence_json: JSON.stringify(['e1']),
        continuity: 'continue',
        confidence: 0.9,
        source_snapshot_ids_json: JSON.stringify(['s1']),
        llm_model: 'model',
        created_at: '2024-01-01T00:00:00Z',
        is_distracted: 0,
        status: 'completed',
        app_summary_json: JSON.stringify(['a1']),
        url_summary_json: JSON.stringify(['u1']),
      };
      const cp = rowToCheckpoint(row);
      expect(cp.id).toBe('cp_1');
      expect(cp.category).toBe('開発');
      expect(cp.isDistracted).toBe(false);
    });

    it('detects legacy distracted category', () => {
      const row: Record<string, unknown> = {
        id: 'cp_2',
        start_at: '2024-01-01T00:00:00Z',
        end_at: '2024-01-01T01:00:00Z',
        project_name: 'X',
        task_label: 'T',
        category: '脱線',
        state_summary: 'S',
        evidence_json: '[]',
        continuity: 'switch',
        confidence: 0.5,
        source_snapshot_ids_json: '[]',
        llm_model: 'm',
        created_at: '2024-01-01T00:00:00Z',
        is_distracted: null,
        status: 'completed',
        app_summary_json: '[]',
        url_summary_json: '[]',
      };
      const cp = rowToCheckpoint(row);
      expect(cp.isDistracted).toBe(true);
    });
  });

  describe('rowToWorkUnit', () => {
    it('maps a row and normalizes projectName and category', () => {
      const row: Record<string, unknown> = {
        id: 'wu_1',
        start_at: '2024-01-01T00:00:00Z',
        end_at: '2024-01-01T01:00:00Z',
        duration_minutes: 60,
        project_name: 'Proj',
        title: 'Title',
        category: '調査・情報収集',
        summary: 'Summary',
        progress_level: '高',
        is_distracted: 0,
        checkpoint_ids_json: JSON.stringify(['c1']),
        user_edited: 0,
        updated_at: '2024-01-01T00:00:00Z',
        note: null,
      };
      const wu = rowToWorkUnit(row);
      expect(wu.id).toBe('wu_1');
      expect(wu.category).toBe('調査・情報収集');
      expect(wu.checkpointIds).toEqual(['c1']);
      expect(wu.userEdited).toBe(false);
    });
  });

  describe('rowToErrorLog', () => {
    it('maps a row', () => {
      const row: Record<string, unknown> = {
        id: 'err_1',
        created_at: '2024-01-01T00:00:00Z',
        scope: 'test',
        message: 'msg',
        detail: 'det',
      };
      const err = rowToErrorLog(row);
      expect(err.scope).toBe('test');
      expect(err.detail).toBe('det');
    });

    it('handles null detail', () => {
      const row: Record<string, unknown> = {
        id: 'err_2',
        created_at: '2024-01-01T00:00:00Z',
        scope: 'test',
        message: 'msg',
        detail: null,
      };
      const err = rowToErrorLog(row);
      expect(err.detail).toBeNull();
    });
  });

  describe('rowToAnalysisLog', () => {
    it('maps a full row', () => {
      const row: Record<string, unknown> = {
        id: 'al_1',
        created_at: '2024-01-01T00:00:00Z',
        provider: 'ollama',
        model: 'm',
        locale: 'ja',
        prompt_text: 'prompt',
        response_text: 'resp',
        parsed_json: '{"a":1}',
        error: null,
        snapshot_ids_json: JSON.stringify(['s1']),
        previous_checkpoint_id: null,
        project_name_result: 'Proj',
        duration_ms: 1000,
      };
      const al = rowToAnalysisLog(row);
      expect(al.provider).toBe('ollama');
      expect(al.snapshotIds).toEqual(['s1']);
      expect(al.durationMs).toBe(1000);
    });

    it('handles null optional fields', () => {
      const row: Record<string, unknown> = {
        id: 'al_2',
        created_at: '2024-01-01T00:00:00Z',
        provider: 'p',
        model: 'm',
        locale: 'en',
        prompt_text: 'prompt',
        snapshot_ids_json: null,
        previous_checkpoint_id: null,
        project_name_result: null,
        duration_ms: null,
      };
      const al = rowToAnalysisLog(row);
      expect(al.snapshotIds).toEqual([]);
      expect(al.durationMs).toBeNull();
    });
  });
});
