import { BaseRepository } from './base-repository.js';
import type { ErrorLogRecord } from '../../../../shared/types.js';
import { createId } from '../../utils.js';
import { rowToErrorLog } from '../mappers.js';

export class ErrorLogRepository extends BaseRepository {
  insert(scope: string, message: string, detail?: string | null): ErrorLogRecord {
    const error: ErrorLogRecord = {
      id: createId('err'),
      createdAt: new Date().toISOString(),
      scope,
      message,
      detail: detail ?? null,
    };
    this._run(
      'INSERT INTO error_logs (id, created_at, scope, message, detail) VALUES (?, ?, ?, ?, ?)',
      error.id,
      error.createdAt,
      error.scope,
      error.message,
      error.detail,
    );
    return error;
  }

  list(limit = 20): ErrorLogRecord[] {
    return (
      this._all('SELECT * FROM error_logs ORDER BY created_at DESC LIMIT ?', limit) as Record<string, unknown>[]
    ).map(rowToErrorLog);
  }

  clear(): void {
    this.conn.prepare('DELETE FROM error_logs').run();
  }
}
