// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { SettingsRepository } from '../db/repositories/settings.js';
import { DEFAULT_SETTINGS } from '../defaults.js';

describe('db/repositories/settings', () => {
  let conn: DatabaseConnection;
  let repo: SettingsRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new SettingsRepository(conn);
  });

  afterEach(() => {
    conn.close();
  });

  it('returns default settings when no row exists', () => {
    const settings = repo.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and retrieves settings', () => {
    const custom = { ...DEFAULT_SETTINGS, llmModel: 'custom-model' };
    repo.saveSettings(custom);
    const retrieved = repo.getSettings();
    expect(retrieved.llmModel).toBe('custom-model');
    expect(retrieved.ollamaHost).toBe(DEFAULT_SETTINGS.ollamaHost);
  });

  it('migrates mainDisplayOnly to displayCaptureMode', () => {
    const legacy = JSON.stringify({ mainDisplayOnly: true, llmModel: 'legacy' });
    conn.prepare('INSERT INTO settings (id, json, updated_at) VALUES (1, ?, ?)').run(legacy, new Date().toISOString());
    const settings = repo.getSettings();
    expect(settings.displayCaptureMode).toBe('main');
    expect(settings.llmModel).toBe('legacy');
  });

  it('overrides defaults correctly', () => {
    const partial = { ...DEFAULT_SETTINGS, captureIntervalMinutes: 5 };
    repo.saveSettings(partial);
    const retrieved = repo.getSettings();
    expect(retrieved.captureIntervalMinutes).toBe(5);
    expect(retrieved.checkIntervalMinutes).toBe(DEFAULT_SETTINGS.checkIntervalMinutes);
  });
});
