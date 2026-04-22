import { BaseRepository } from './base-repository.js';
import type { SnapshotRecord } from '../../../../shared/types.js';
import { rowToSnapshot } from '../mappers.js';

export class SnapshotRepository extends BaseRepository {
  insert(snapshot: SnapshotRecord): void {
    this._run(
      `
      INSERT INTO snapshots (
        id, captured_at, image_path, image_hash, image_paths_json, image_hashes_json, display_count, cursor_x, cursor_y, cursor_display_id, cursor_display_index, cursor_relative_x, cursor_relative_y, active_app, window_title, page_title, url,
        keyboard_activity, mouse_activity, app_switch_count, git_branch, git_dirty, manual_note,
        status, excluded_reason, metadata_json, checkpoint_id, analysis_attempts, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `,
      snapshot.id,
      snapshot.capturedAt,
      snapshot.imagePath,
      snapshot.imageHash,
      JSON.stringify(snapshot.imagePaths),
      JSON.stringify(snapshot.imageHashes),
      snapshot.displayCount,
      snapshot.cursorX,
      snapshot.cursorY,
      snapshot.cursorDisplayId,
      snapshot.cursorDisplayIndex,
      snapshot.cursorRelativeX,
      snapshot.cursorRelativeY,
      snapshot.activeApp,
      snapshot.windowTitle,
      snapshot.pageTitle,
      snapshot.url,
      snapshot.keyboardActivity,
      snapshot.mouseActivity,
      snapshot.appSwitchCount,
      snapshot.gitBranch,
      snapshot.gitDirty === null ? null : snapshot.gitDirty ? 1 : 0,
      snapshot.manualNote,
      snapshot.status,
      snapshot.excludedReason,
      snapshot.metadataJson,
      snapshot.checkpointId,
      new Date().toISOString(),
    );
  }

  getById(id: string): SnapshotRecord | null {
    const row = this._get('SELECT * FROM snapshots WHERE id = ?', id);
    return row ? rowToSnapshot(row) : null;
  }

  listRecent(limit = 20): SnapshotRecord[] {
    return (this._all('SELECT * FROM snapshots ORDER BY captured_at DESC LIMIT ?', limit) as Record<string, unknown>[]).map(rowToSnapshot);
  }

  listPending(): SnapshotRecord[] {
    return (
      this._all(
        `
        SELECT *
        FROM snapshots
        WHERE checkpoint_id IS NULL
          AND status IN ('captured', 'analysis_failed')
        ORDER BY captured_at ASC
        `,
      ) as Record<string, unknown>[]
    ).map(rowToSnapshot);
  }

  clearPending(): SnapshotRecord[] {
    const snapshots = this.listPending();
    if (!snapshots.length) {
      return [];
    }
    const statement = this.conn.prepare('DELETE FROM snapshots WHERE id = ?');
    for (const snapshot of snapshots) {
      statement.run(snapshot.id);
    }
    return snapshots;
  }

  countPending(): number {
    const row = this._get(
      "SELECT COUNT(*) AS total FROM snapshots WHERE checkpoint_id IS NULL AND status IN ('captured', 'analysis_failed')",
    );
    return Number(row?.total ?? 0);
  }

  listByCheckpointId(checkpointId: string): SnapshotRecord[] {
    return (
      this._all('SELECT * FROM snapshots WHERE checkpoint_id = ? ORDER BY captured_at ASC', checkpointId) as Record<string, unknown>[]
    ).map(rowToSnapshot);
  }

  getReadyWindows(intervalMinutes: number, nowIso: string): SnapshotRecord[][] {
    const rows = this._all(
      `
      SELECT *
      FROM snapshots
      WHERE checkpoint_id IS NULL
        AND status IN ('captured', 'analysis_failed')
      ORDER BY captured_at ASC
      `,
    ) as Record<string, unknown>[];

    const readyBefore = new Date(nowIso).getTime();
    const windows = new Map<string, SnapshotRecord[]>();

    for (const row of rows) {
      const snapshot = rowToSnapshot(row);
      const windowStart = new Date(snapshot.capturedAt);
      windowStart.setMinutes(Math.floor(windowStart.getMinutes() / intervalMinutes) * intervalMinutes, 0, 0);
      const windowStartIso = windowStart.toISOString();
      const windowEnd = windowStart.getTime() + intervalMinutes * 60_000;
      if (windowEnd > readyBefore) {
        continue;
      }
      const bucket = windows.get(windowStartIso) ?? [];
      bucket.push(snapshot);
      windows.set(windowStartIso, bucket);
    }

    return [...windows.values()];
  }

  incrementAnalysisAttempts(snapshotIds: string[]): void {
    const statement = this.conn.prepare(
      'UPDATE snapshots SET analysis_attempts = analysis_attempts + 1, status = ? WHERE id = ?',
    );
    for (const id of snapshotIds) {
      statement.run('analysis_failed', id);
    }
  }

  markProcessed(snapshotIds: string[], checkpointId: string): void {
    const statement = this.conn.prepare(
      'UPDATE snapshots SET status = ?, checkpoint_id = ? WHERE id = ?',
    );
    for (const id of snapshotIds) {
      statement.run('processed', checkpointId, id);
    }
  }

  updateImagePaths(snapshotId: string, imagePaths: string[]): void {
    this.conn.prepare(
      'UPDATE snapshots SET image_path = ?, image_paths_json = ? WHERE id = ?',
    ).run(imagePaths[0] ?? null, JSON.stringify(imagePaths), snapshotId);
  }

  getMaxAnalysisAttempts(snapshotIds: string[]): number {
    const statement = this.conn.prepare('SELECT MAX(analysis_attempts) AS attempts FROM snapshots WHERE id = ?');
    return snapshotIds.reduce((max, id) => {
      const row = statement.get(id) as Record<string, unknown> | undefined;
      return Math.max(max, Number(row?.attempts ?? 0));
    }, 0);
  }

  resetProcessedBetween(startIso: string, endIso: string): number {
    const result = this.conn.prepare(
      `
      UPDATE snapshots
      SET status = 'captured',
          checkpoint_id = NULL,
          analysis_attempts = 0
      WHERE captured_at >= ?
        AND captured_at <= ?
        AND status = 'processed'
      `
    ).run(startIso, endIso);
    return Number(result.changes ?? 0);
  }
}
