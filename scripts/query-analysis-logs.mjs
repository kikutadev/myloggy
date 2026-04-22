#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

let sqlite;
try {
  sqlite = await import('node:sqlite');
} catch {
  sqlite = null;
}

function getDbPath() {
  const args = process.argv.slice(2);

  // --db=<path> : direct sqlite file path
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--db=')) {
      return args[i].split('=').slice(1).join('=');
    }
    if (args[i] === '--db' && i + 1 < args.length) {
      return args[i + 1];
    }
  }

  // --data-dir=<dir> : directory containing myloggy.sqlite
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--data-dir=')) {
      const dir = args[i].split('=').slice(1).join('=');
      return path.join(dir, 'myloggy.sqlite');
    }
    if (args[i] === '--data-dir' && i + 1 < args.length) {
      return path.join(args[i + 1], 'myloggy.sqlite');
    }
  }

  const home = os.homedir();
  // macOS paths
  const candidates = [
    // Development (Electron)
    path.join(home, 'Library', 'Application Support', 'Electron', 'myloggy-data', 'myloggy.sqlite'),
    // Production
    path.join(home, 'Library', 'Application Support', 'myloggy', 'myloggy-data', 'myloggy.sqlite'),
    // Legacy / fallback
    path.join(home, 'Library', 'Application Support', 'myloggy', 'myloggy.sqlite'),
    path.join(home, '.config', 'myloggy', 'myloggy.sqlite'),
    path.join(home, '.local', 'share', 'myloggy', 'myloggy.sqlite'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function printHelp() {
  console.log(`
Usage: node scripts/query-analysis-logs.mjs [options] [command]

Options:
  --db=<path>        Direct path to myloggy.sqlite file
  --data-dir=<dir>   Directory containing myloggy.sqlite

Commands:
  list [N]           List latest N analysis logs (default: 20)
  show <id>          Show full prompt and response for a log entry
  errors             Show only error entries
  stats              Show statistics (provider, model, project_name counts)
  search <keyword>   Search in prompt_text or response_text
  dump               Dump all logs as JSON

Examples:
  node scripts/query-analysis-logs.mjs list 10
  node scripts/query-analysis-logs.mjs --db /Users/kiku28/Library/Application\\ Support/Electron/myloggy-data/myloggy.sqlite show alog-xxxxx
  node scripts/query-analysis-logs.mjs --data-dir /Users/kiku28/Library/Application\\ Support/Electron/myloggy-data list 5
`);
}

function querySqlite(dbPath, sql, mode = 'list') {
  if (sqlite) {
    const db = new sqlite.DatabaseSync(dbPath);
    try {
      if (mode === 'get') {
        return db.prepare(sql).get() ?? null;
      }
      return db.prepare(sql).all();
    } finally {
      db.close();
    }
  }

  // Fallback: use sqlite3 CLI
  const result = spawnSync('sqlite3', [dbPath, '-json', sql], { encoding: 'utf-8' });
  if (result.error) {
    console.error('sqlite3 CLI not found. Please install it (brew install sqlite3) or use Node.js with node:sqlite support.');
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('sqlite3 error:', result.stderr);
    process.exit(1);
  }
  const text = result.stdout.trim();
  if (!text) return mode === 'get' ? null : [];
  return JSON.parse(text);
}

function listLogs(dbPath, limit = 20) {
  const rows = querySqlite(
    dbPath,
    `SELECT id, created_at, provider, model, locale,
            substr(prompt_text, 1, 120) as prompt_preview,
            substr(response_text, 1, 120) as response_preview,
            error,
            project_name_result,
            duration_ms
     FROM analysis_logs
     ORDER BY created_at DESC
     LIMIT ${limit}`
  );
  console.table(rows);
}

function showLog(dbPath, id) {
  const row = querySqlite(
    dbPath,
    `SELECT * FROM analysis_logs WHERE id = '${id.replace(/'/g, "''")}'`,
    'get'
  );
  if (!row) {
    console.error('Log not found:', id);
    process.exit(1);
  }
  console.log('=== ID:', row.id);
  console.log('Created:', row.created_at);
  console.log('Provider:', row.provider);
  console.log('Model:', row.model);
  console.log('Locale:', row.locale);
  console.log('Project Name Result:', row.project_name_result);
  console.log('Duration (ms):', row.duration_ms);
  console.log('Error:', row.error);
  console.log('\n=== PROMPT ===');
  console.log(row.prompt_text);
  console.log('\n=== RESPONSE (raw) ===');
  console.log(row.response_text ?? '(null)');
  console.log('\n=== PARSED JSON ===');
  console.log(row.parsed_json ?? '(null)');
}

function listErrors(dbPath) {
  const rows = querySqlite(
    dbPath,
    `SELECT id, created_at, provider, model, error, project_name_result
     FROM analysis_logs
     WHERE error IS NOT NULL
     ORDER BY created_at DESC`
  );
  console.table(rows);
}

function showStats(dbPath) {
  console.log('--- Provider counts ---');
  console.table(querySqlite(dbPath, 'SELECT provider, COUNT(*) as count FROM analysis_logs GROUP BY provider'));
  console.log('--- Model counts ---');
  console.table(querySqlite(dbPath, 'SELECT model, COUNT(*) as count FROM analysis_logs GROUP BY model'));
  console.log('--- Project name result counts (top 20) ---');
  console.table(
    querySqlite(
      dbPath,
      'SELECT project_name_result, COUNT(*) as count FROM analysis_logs GROUP BY project_name_result ORDER BY count DESC LIMIT 20'
    )
  );
  console.log('--- Error counts ---');
  console.table(
    querySqlite(
      dbPath,
      'SELECT error, COUNT(*) as count FROM analysis_logs WHERE error IS NOT NULL GROUP BY error'
    )
  );
}

function searchLogs(dbPath, keyword) {
  const safe = keyword.replace(/'/g, "''");
  const rows = querySqlite(
    dbPath,
    `SELECT id, created_at, provider, model, project_name_result,
            substr(prompt_text, 1, 200) as prompt_preview,
            substr(response_text, 1, 200) as response_preview
     FROM analysis_logs
     WHERE prompt_text LIKE '%${safe}%' OR response_text LIKE '%${safe}%'
     ORDER BY created_at DESC
     LIMIT 50`
  );
  console.table(rows);
}

function dumpLogs(dbPath) {
  const rows = querySqlite(
    dbPath,
    'SELECT * FROM analysis_logs ORDER BY created_at DESC'
  ).map((r) => ({
    ...r,
    snapshot_ids_json: JSON.parse(r.snapshot_ids_json || '[]'),
  }));
  console.log(JSON.stringify(rows, null, 2));
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const dbPath = getDbPath();
if (!fs.existsSync(dbPath)) {
  console.error('Database not found:', dbPath);
  console.error('Use --data-dir= to specify the data directory.');
  process.exit(1);
}

const cmd = args.find((a) => !a.startsWith('--'));

switch (cmd) {
  case 'list': {
    const n = Number(args[args.indexOf('list') + 1]) || 20;
    listLogs(dbPath, n);
    break;
  }
  case 'show': {
    const id = args[args.indexOf('show') + 1];
    if (!id) {
      console.error('Usage: show <id>');
      process.exit(1);
    }
    showLog(dbPath, id);
    break;
  }
  case 'errors':
    listErrors(dbPath);
    break;
  case 'stats':
    showStats(dbPath);
    break;
  case 'search': {
    const keyword = args[args.indexOf('search') + 1];
    if (!keyword) {
      console.error('Usage: search <keyword>');
      process.exit(1);
    }
    searchLogs(dbPath, keyword);
    break;
  }
  case 'dump':
    dumpLogs(dbPath);
    break;
  default:
    console.error('Unknown command:', cmd);
    printHelp();
    process.exit(1);
}
