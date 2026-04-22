import { BaseRepository } from './base-repository.js';
import type { DatabaseConnection } from '../connection.js';
import type { WorkUnitPatch, WorkUnitRecord } from '../../../../shared/types.js';
import { isUnknownLabel, toStoredCategoryLabel, toStoredProjectName } from '../../../../shared/localization.js';
import { rowToWorkUnit } from '../mappers.js';
import type { CategoryRuleRepository } from './category-rules.js';

export class WorkUnitRepository extends BaseRepository {
  constructor(
    conn: DatabaseConnection,
    private readonly categoryRules: CategoryRuleRepository,
  ) {
    super(conn);
  }

  insert(record: WorkUnitRecord): void {
    this._run(
      `
      INSERT INTO work_units (
        id, start_at, end_at, duration_minutes, project_name, title, category, summary,
        progress_level, is_distracted, checkpoint_ids_json, user_edited, updated_at, note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      record.id,
      record.startAt,
      record.endAt,
      record.durationMinutes,
      record.projectName,
      record.title,
      record.category,
      record.summary,
      record.progressLevel,
      record.isDistracted ? 1 : 0,
      JSON.stringify(record.checkpointIds),
      record.userEdited ? 1 : 0,
      record.updatedAt,
      record.note,
    );
  }

  update(record: WorkUnitRecord): void {
    this._run(
      `
      UPDATE work_units
      SET start_at = ?, end_at = ?, duration_minutes = ?, project_name = ?, title = ?, category = ?,
          summary = ?, progress_level = ?, is_distracted = ?, checkpoint_ids_json = ?,
          user_edited = ?, updated_at = ?, note = ?
      WHERE id = ?
      `,
      record.startAt,
      record.endAt,
      record.durationMinutes,
      record.projectName,
      record.title,
      record.category,
      record.summary,
      record.progressLevel,
      record.isDistracted ? 1 : 0,
      JSON.stringify(record.checkpointIds),
      record.userEdited ? 1 : 0,
      record.updatedAt,
      record.note,
      record.id,
    );
  }

  patch(patch: WorkUnitPatch): WorkUnitRecord | null {
    const current = this.getById(patch.id);
    if (!current) {
      return null;
    }
    const updates: Partial<WorkUnitRecord> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.projectName !== undefined) updates.projectName = toStoredProjectName(patch.projectName);
    if (patch.category !== undefined) updates.category = toStoredCategoryLabel(patch.category);
    if (patch.summary !== undefined) updates.summary = patch.summary;
    if (patch.isDistracted !== undefined) updates.isDistracted = patch.isDistracted;
    if (patch.note !== undefined) updates.note = patch.note;

    const updated: WorkUnitRecord = {
      ...current,
      ...updates,
      userEdited: true,
      updatedAt: new Date().toISOString(),
    };
    this.update(updated);
    if (updates.category && updated.projectName && !isUnknownLabel(updated.projectName)) {
      this.categoryRules.upsert(updated.projectName, updates.category);
    }
    return updated;
  }

  getById(id: string): WorkUnitRecord | null {
    const row = this._get('SELECT * FROM work_units WHERE id = ?', id);
    return row ? rowToWorkUnit(row) : null;
  }

  listBetween(startIso: string, endIso: string): WorkUnitRecord[] {
    return (
      this._all(
        `
        SELECT *
        FROM work_units
        WHERE start_at < ?
          AND end_at >= ?
        ORDER BY start_at ASC
        `,
        endIso,
        startIso,
      ) as Record<string, unknown>[]
    ).map(rowToWorkUnit);
  }

  listRecent(limit = 8): WorkUnitRecord[] {
    return (
      this._all('SELECT * FROM work_units ORDER BY end_at DESC LIMIT ?', limit) as Record<string, unknown>[]
    ).map(rowToWorkUnit);
  }

  getCurrent(): WorkUnitRecord | null {
    const row = this._get('SELECT * FROM work_units ORDER BY end_at DESC LIMIT 1');
    return row ? rowToWorkUnit(row) : null;
  }
}
