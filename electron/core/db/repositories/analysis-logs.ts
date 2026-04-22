import { BaseRepository } from './base-repository.js';
import type { AnalysisLogRecord } from '../../../../shared/types.js';
import { createId } from '../../utils.js';
import { rowToAnalysisLog } from '../mappers.js';

export class AnalysisLogRepository extends BaseRepository {
  insert(record: {
    id?: string;
    createdAt?: string;
    provider: string;
    model: string;
    locale: string;
    promptText: string;
    responseText?: string | null;
    parsedJson?: string | null;
    error?: string | null;
    snapshotIds: string[];
    previousCheckpointId?: string | null;
    projectNameResult?: string | null;
    durationMs?: number | null;
  }): AnalysisLogRecord {
    const id = record.id ?? createId('alog');
    const createdAt = record.createdAt ?? new Date().toISOString();
    const payload: AnalysisLogRecord = {
      id,
      createdAt,
      provider: record.provider,
      model: record.model,
      locale: record.locale,
      promptText: record.promptText,
      responseText: record.responseText ?? null,
      parsedJson: record.parsedJson ?? null,
      error: record.error ?? null,
      snapshotIds: record.snapshotIds,
      previousCheckpointId: record.previousCheckpointId ?? null,
      projectNameResult: record.projectNameResult ?? null,
      durationMs: record.durationMs ?? null,
    };
    this._run(
      `INSERT INTO analysis_logs (
        id, created_at, provider, model, locale, prompt_text, response_text, parsed_json, error,
        snapshot_ids_json, previous_checkpoint_id, project_name_result, duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      payload.id,
      payload.createdAt,
      payload.provider,
      payload.model,
      payload.locale,
      payload.promptText,
      payload.responseText,
      payload.parsedJson,
      payload.error,
      JSON.stringify(payload.snapshotIds),
      payload.previousCheckpointId,
      payload.projectNameResult,
      payload.durationMs,
    );
    return payload;
  }

  list(limit = 50): AnalysisLogRecord[] {
    return (
      this._all('SELECT * FROM analysis_logs ORDER BY created_at DESC LIMIT ?', limit) as Record<string, unknown>[]
    ).map(rowToAnalysisLog);
  }
}
