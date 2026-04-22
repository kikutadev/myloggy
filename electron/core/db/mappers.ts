import type {
  AnalysisLogRecord,
  CheckpointRecord,
  ErrorLogRecord,
  SnapshotRecord,
  WorkUnitRecord,
} from '../../../shared/types.js';
import {
  isLegacyDistractedCategory,
  toStoredCategoryLabel,
  toStoredProjectName,
} from '../../../shared/localization.js';
import { safeJsonParse } from '../utils.js';

function normalizeBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Boolean(value);
}

export function rowToSnapshot(row: Record<string, unknown>): SnapshotRecord {
  const imagePaths = safeJsonParse<string[]>(row.image_paths_json as string | null, []);
  const imageHashes = safeJsonParse<string[]>(row.image_hashes_json as string | null, []);
  const legacyImagePath = (row.image_path as string | null) ?? null;
  const legacyImageHash = (row.image_hash as string | null) ?? null;

  return {
    id: String(row.id),
    capturedAt: String(row.captured_at),
    imagePath: legacyImagePath,
    imageHash: legacyImageHash,
    imagePaths: imagePaths.length ? imagePaths : legacyImagePath ? [legacyImagePath] : [],
    imageHashes: imageHashes.length ? imageHashes : legacyImageHash ? [legacyImageHash] : [],
    displayCount: Number(row.display_count ?? (imagePaths.length || (legacyImagePath ? 1 : 0))),
    cursorX: (row.cursor_x as number | null) ?? null,
    cursorY: (row.cursor_y as number | null) ?? null,
    cursorDisplayId: (row.cursor_display_id as number | null) ?? null,
    cursorDisplayIndex: (row.cursor_display_index as number | null) ?? null,
    cursorRelativeX: (row.cursor_relative_x as number | null) ?? null,
    cursorRelativeY: (row.cursor_relative_y as number | null) ?? null,
    activeApp: (row.active_app as string | null) ?? null,
    windowTitle: (row.window_title as string | null) ?? null,
    pageTitle: (row.page_title as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    keyboardActivity: (row.keyboard_activity as number | null) ?? null,
    mouseActivity: (row.mouse_activity as number | null) ?? null,
    appSwitchCount: (row.app_switch_count as number | null) ?? null,
    gitBranch: (row.git_branch as string | null) ?? null,
    gitDirty: normalizeBoolean(row.git_dirty),
    manualNote: (row.manual_note as string | null) ?? null,
    status: row.status as SnapshotRecord['status'],
    excludedReason: (row.excluded_reason as string | null) ?? null,
    metadataJson: (row.metadata_json as string | null) ?? null,
    checkpointId: (row.checkpoint_id as string | null) ?? null,
  };
}

export function rowToCheckpoint(row: Record<string, unknown>): CheckpointRecord {
  const rawCategory = toStoredCategoryLabel(String(row.category));
  return {
    id: String(row.id),
    startAt: String(row.start_at),
    endAt: String(row.end_at),
    projectName: toStoredProjectName(String(row.project_name)),
    taskLabel: String(row.task_label),
    category: rawCategory,
    stateSummary: String(row.state_summary),
    evidence: safeJsonParse<string[]>(row.evidence_json as string | null, []),
    continuity: row.continuity as CheckpointRecord['continuity'],
    confidence: Number(row.confidence),
    sourceSnapshotIds: safeJsonParse<string[]>(row.source_snapshot_ids_json as string | null, []),
    llmModel: String(row.llm_model),
    createdAt: String(row.created_at),
    isDistracted: Boolean(row.is_distracted ?? isLegacyDistractedCategory(rawCategory)),
    status: row.status as CheckpointRecord['status'],
    appSummary: safeJsonParse<string[]>(row.app_summary_json as string | null, []),
    urlSummary: safeJsonParse<string[]>(row.url_summary_json as string | null, []),
  };
}

export function rowToWorkUnit(row: Record<string, unknown>): WorkUnitRecord {
  return {
    id: String(row.id),
    startAt: String(row.start_at),
    endAt: String(row.end_at),
    durationMinutes: Number(row.duration_minutes),
    projectName: toStoredProjectName(String(row.project_name)),
    title: String(row.title),
    category: toStoredCategoryLabel(String(row.category)),
    summary: String(row.summary),
    progressLevel: row.progress_level as WorkUnitRecord['progressLevel'],
    isDistracted: Boolean(row.is_distracted),
    checkpointIds: safeJsonParse<string[]>(row.checkpoint_ids_json as string | null, []),
    userEdited: Boolean(row.user_edited),
    updatedAt: String(row.updated_at),
    note: (row.note as string | null) ?? null,
  };
}

export function rowToErrorLog(row: Record<string, unknown>): ErrorLogRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    scope: String(row.scope),
    message: String(row.message),
    detail: (row.detail as string | null) ?? null,
  };
}

export function rowToAnalysisLog(row: Record<string, unknown>): AnalysisLogRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    provider: String(row.provider),
    model: String(row.model),
    locale: String(row.locale),
    promptText: String(row.prompt_text),
    responseText: (row.response_text as string | null) ?? null,
    parsedJson: (row.parsed_json as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    snapshotIds: safeJsonParse<string[]>(row.snapshot_ids_json as string | null, []),
    previousCheckpointId: (row.previous_checkpoint_id as string | null) ?? null,
    projectNameResult: (row.project_name_result as string | null) ?? null,
    durationMs: (row.duration_ms as number | null) ?? null,
  };
}
