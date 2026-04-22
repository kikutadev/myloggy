import type { DatabaseConnection } from './connection.js';

export function initializeSchema(conn: DatabaseConnection): void {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      captured_at TEXT NOT NULL,
      image_path TEXT,
      image_hash TEXT,
      image_paths_json TEXT,
      image_hashes_json TEXT,
      display_count INTEGER NOT NULL DEFAULT 1,
      cursor_x REAL,
      cursor_y REAL,
      cursor_display_id INTEGER,
      cursor_display_index INTEGER,
      cursor_relative_x REAL,
      cursor_relative_y REAL,
      active_app TEXT,
      window_title TEXT,
      page_title TEXT,
      url TEXT,
      keyboard_activity INTEGER,
      mouse_activity INTEGER,
      app_switch_count INTEGER,
      git_branch TEXT,
      git_dirty INTEGER,
      manual_note TEXT,
      status TEXT NOT NULL,
      excluded_reason TEXT,
      metadata_json TEXT,
      checkpoint_id TEXT,
      analysis_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      project_name TEXT NOT NULL,
      task_label TEXT NOT NULL,
      category TEXT NOT NULL,
      state_summary TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      continuity TEXT NOT NULL,
      confidence REAL NOT NULL,
      source_snapshot_ids_json TEXT NOT NULL,
      llm_model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      app_summary_json TEXT NOT NULL,
      url_summary_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_units (
      id TEXT PRIMARY KEY,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      project_name TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      progress_level TEXT NOT NULL,
      is_distracted INTEGER NOT NULL DEFAULT 0,
      checkpoint_ids_json TEXT NOT NULL,
      user_edited INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      scope TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT
    );

    CREATE TABLE IF NOT EXISTS analysis_logs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      locale TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      response_text TEXT,
      parsed_json TEXT,
      error TEXT,
      snapshot_ids_json TEXT NOT NULL,
      previous_checkpoint_id TEXT,
      project_name_result TEXT,
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      project_name TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureColumn(conn, 'snapshots', 'image_paths_json', 'TEXT');
  ensureColumn(conn, 'snapshots', 'image_hashes_json', 'TEXT');
  ensureColumn(conn, 'snapshots', 'display_count', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(conn, 'snapshots', 'cursor_x', 'REAL');
  ensureColumn(conn, 'snapshots', 'cursor_y', 'REAL');
  ensureColumn(conn, 'snapshots', 'cursor_display_id', 'INTEGER');
  ensureColumn(conn, 'snapshots', 'cursor_display_index', 'INTEGER');
  ensureColumn(conn, 'snapshots', 'cursor_relative_x', 'REAL');
  ensureColumn(conn, 'snapshots', 'cursor_relative_y', 'REAL');
  ensureColumn(conn, 'checkpoints', 'is_distracted', 'INTEGER NOT NULL DEFAULT 0');
}

export function ensureColumn(
  conn: DatabaseConnection,
  table: string,
  column: string,
  definition: string,
): void {
  try {
    conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists.
  }
}
