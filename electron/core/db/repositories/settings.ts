import { BaseRepository } from './base-repository.js';
import type { AppSettings } from '../../../../shared/types.js';
import { DEFAULT_SETTINGS } from '../../defaults.js';
import { safeJsonParse } from '../../utils.js';

export class SettingsRepository extends BaseRepository {
  getSettings(): AppSettings {
    const row = this._get('SELECT json FROM settings WHERE id = 1');
    if (!row) {
      return DEFAULT_SETTINGS;
    }
    const parsed = safeJsonParse<AppSettings & { mainDisplayOnly?: boolean }>(
      row.json as string,
      DEFAULT_SETTINGS,
    );
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      displayCaptureMode: parsed.displayCaptureMode ?? (parsed.mainDisplayOnly === true ? 'main' : 'all'),
    };
  }

  saveSettings(settings: AppSettings): AppSettings {
    const payload = JSON.stringify(settings);
    const updatedAt = new Date().toISOString();
    this._run(
      `
      INSERT INTO settings (id, json, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
      `,
      payload,
      updatedAt,
    );
    return this.getSettings();
  }
}
