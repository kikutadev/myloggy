import { BaseRepository } from './base-repository.js';
import type { CheckpointRecord } from '../../../../shared/types.js';
import { rowToCheckpoint } from '../mappers.js';

export class CheckpointRepository extends BaseRepository {
  insert(record: CheckpointRecord): void {
    this._run(
      `
      INSERT INTO checkpoints (
        id, start_at, end_at, project_name, task_label, category, state_summary, evidence_json,
        continuity, confidence, source_snapshot_ids_json, llm_model, created_at, is_distracted, status,
        app_summary_json, url_summary_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      record.id,
      record.startAt,
      record.endAt,
      record.projectName,
      record.taskLabel,
      record.category,
      record.stateSummary,
      JSON.stringify(record.evidence),
      record.continuity,
      record.confidence,
      JSON.stringify(record.sourceSnapshotIds),
      record.llmModel,
      record.createdAt,
      record.isDistracted ? 1 : 0,
      record.status,
      JSON.stringify(record.appSummary),
      JSON.stringify(record.urlSummary),
    );
  }

  listBetween(startIso: string, endIso: string): CheckpointRecord[] {
    return (
      this._all(
        `
        SELECT *
        FROM checkpoints
        WHERE start_at < ?
          AND end_at >= ?
          AND status = 'completed'
        ORDER BY start_at ASC
        `,
        endIso,
        startIso,
      ) as Record<string, unknown>[]
    ).map(rowToCheckpoint);
  }

  getLast(): CheckpointRecord | null {
    const row = this._get(
      "SELECT * FROM checkpoints WHERE status = 'completed' ORDER BY end_at DESC LIMIT 1",
    );
    return row ? rowToCheckpoint(row) : null;
  }
}
