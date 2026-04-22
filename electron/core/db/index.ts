import { createConnection, type DatabaseConnection } from './connection.js';
import { initializeSchema } from './schema.js';
import { SettingsRepository } from './repositories/settings.js';
import { SnapshotRepository } from './repositories/snapshots.js';
import { CheckpointRepository } from './repositories/checkpoints.js';
import { WorkUnitRepository } from './repositories/work-units.js';
import { ErrorLogRepository } from './repositories/error-logs.js';
import { AnalysisLogRepository } from './repositories/analysis-logs.js';
import { CategoryRuleRepository } from './repositories/category-rules.js';

export { createConnection, type DatabaseConnection } from './connection.js';
export { initializeSchema, ensureColumn } from './schema.js';
export {
  rowToSnapshot,
  rowToCheckpoint,
  rowToWorkUnit,
  rowToErrorLog,
  rowToAnalysisLog,
} from './mappers.js';
export { BaseRepository } from './repositories/base-repository.js';
export { SettingsRepository } from './repositories/settings.js';
export { SnapshotRepository } from './repositories/snapshots.js';
export { CheckpointRepository } from './repositories/checkpoints.js';
export { WorkUnitRepository } from './repositories/work-units.js';
export { ErrorLogRepository } from './repositories/error-logs.js';
export { AnalysisLogRepository } from './repositories/analysis-logs.js';
export { CategoryRuleRepository } from './repositories/category-rules.js';

import type {
  AnalysisLogRecord,
  AppSettings,
  CheckpointRecord,
  ErrorLogRecord,
  SnapshotRecord,
  WorkUnitPatch,
  WorkUnitRecord,
} from '../../../shared/types.js';
import { UNKNOWN_LABEL } from '../../../shared/localization.js';
import { DEFAULT_SETTINGS } from '../defaults.js';

export class AppDatabase {
  private readonly conn: DatabaseConnection;
  private readonly settingsRepo: SettingsRepository;
  private readonly snapshotsRepo: SnapshotRepository;
  private readonly checkpointsRepo: CheckpointRepository;
  private readonly workUnitsRepo: WorkUnitRepository;
  private readonly errorLogsRepo: ErrorLogRepository;
  private readonly analysisLogsRepo: AnalysisLogRepository;
  private readonly categoryRulesRepo: CategoryRuleRepository;

  constructor(private readonly baseDir: string, useMemory = false) {
    this.conn = createConnection(baseDir, useMemory);
    initializeSchema(this.conn);

    this.settingsRepo = new SettingsRepository(this.conn);
    this.categoryRulesRepo = new CategoryRuleRepository(this.conn);
    this.snapshotsRepo = new SnapshotRepository(this.conn);
    this.checkpointsRepo = new CheckpointRepository(this.conn);
    this.workUnitsRepo = new WorkUnitRepository(this.conn, this.categoryRulesRepo);
    this.errorLogsRepo = new ErrorLogRepository(this.conn);
    this.analysisLogsRepo = new AnalysisLogRepository(this.conn);

    if (!this.conn.prepare('SELECT json FROM settings WHERE id = 1').get()) {
      this.settingsRepo.saveSettings(DEFAULT_SETTINGS);
    }
  }

  close(): void {
    this.conn.close();
  }

  getSettings(): AppSettings {
    return this.settingsRepo.getSettings();
  }

  saveSettings(settings: AppSettings): AppSettings {
    return this.settingsRepo.saveSettings(settings);
  }

  insertSnapshot(snapshot: SnapshotRecord): void {
    this.snapshotsRepo.insert(snapshot);
  }

  getReadySnapshotWindows(intervalMinutes: number, nowIso: string): SnapshotRecord[][] {
    return this.snapshotsRepo.getReadyWindows(intervalMinutes, nowIso);
  }

  incrementAnalysisAttempts(snapshotIds: string[]): void {
    this.snapshotsRepo.incrementAnalysisAttempts(snapshotIds);
  }

  markSnapshotsProcessed(snapshotIds: string[], checkpointId: string): void {
    this.snapshotsRepo.markProcessed(snapshotIds, checkpointId);
  }

  updateSnapshotImagePaths(snapshotId: string, imagePaths: string[]): void {
    this.snapshotsRepo.updateImagePaths(snapshotId, imagePaths);
  }

  getAnalysisAttempts(snapshotIds: string[]): number {
    return this.snapshotsRepo.getMaxAnalysisAttempts(snapshotIds);
  }

  getSnapshotById(id: string): SnapshotRecord | null {
    return this.snapshotsRepo.getById(id);
  }

  insertCheckpoint(record: CheckpointRecord): void {
    this.checkpointsRepo.insert(record);
  }

  listCheckpointsBetween(startIso: string, endIso: string): CheckpointRecord[] {
    return this.checkpointsRepo.listBetween(startIso, endIso);
  }

  getLastCheckpoint(): CheckpointRecord | null {
    return this.checkpointsRepo.getLast();
  }

  getCurrentWorkUnit(): WorkUnitRecord | null {
    return this.workUnitsRepo.getCurrent();
  }

  insertWorkUnit(record: WorkUnitRecord): void {
    this.workUnitsRepo.insert(record);
  }

  updateWorkUnit(record: WorkUnitRecord): void {
    this.workUnitsRepo.update(record);
  }

  patchWorkUnit(patch: WorkUnitPatch): WorkUnitRecord | null {
    return this.workUnitsRepo.patch(patch);
  }

  getWorkUnitById(id: string): WorkUnitRecord | null {
    return this.workUnitsRepo.getById(id);
  }

  listWorkUnitsBetween(startIso: string, endIso: string): WorkUnitRecord[] {
    return this.workUnitsRepo.listBetween(startIso, endIso);
  }

  listRecentSnapshots(limit = 20): SnapshotRecord[] {
    return this.snapshotsRepo.listRecent(limit);
  }

  listSnapshotsByCheckpointId(checkpointId: string): SnapshotRecord[] {
    return this.snapshotsRepo.listByCheckpointId(checkpointId);
  }

  listPendingSnapshots(): SnapshotRecord[] {
    return this.snapshotsRepo.listPending();
  }

  clearPendingSnapshots(): SnapshotRecord[] {
    return this.snapshotsRepo.clearPending();
  }

  listRecentWorkUnits(limit = 8): WorkUnitRecord[] {
    return this.workUnitsRepo.listRecent(limit);
  }

  insertError(scope: string, message: string, detail?: string | null): ErrorLogRecord {
    return this.errorLogsRepo.insert(scope, message, detail);
  }

  listErrors(limit = 20): ErrorLogRecord[] {
    return this.errorLogsRepo.list(limit);
  }

  clearErrors(): void {
    this.errorLogsRepo.clear();
  }

  countPendingSnapshots(): number {
    return this.snapshotsRepo.countPending();
  }

  listKnownProjectNames(limit = 50): string[] {
    const fromWorkUnits = this.conn
      .prepare(
        `SELECT DISTINCT project_name FROM work_units
         WHERE project_name != ?
         ORDER BY updated_at DESC
         LIMIT ?`,
      )
      .all(UNKNOWN_LABEL, limit) as { project_name: string }[];
    const fromCategoryRules = this.conn
      .prepare('SELECT project_name FROM category_rules ORDER BY updated_at DESC')
      .all() as { project_name: string }[];
    const names = new Set<string>();
    for (const row of fromWorkUnits) {
      names.add(String(row.project_name));
    }
    for (const row of fromCategoryRules) {
      names.add(String(row.project_name));
    }
    return [...names];
  }

  getCategoryRule(projectName: string): string | null {
    return this.categoryRulesRepo.get(projectName);
  }

  upsertCategoryRule(projectName: string, category: string): void {
    this.categoryRulesRepo.upsert(projectName, category);
  }

  insertAnalysisLog(record: {
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
    return this.analysisLogsRepo.insert(record);
  }

  listAnalysisLogs(limit = 50): AnalysisLogRecord[] {
    return this.analysisLogsRepo.list(limit);
  }
}
