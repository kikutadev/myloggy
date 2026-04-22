import type { DatabaseConnection, SqlValue } from '../connection.js';
import { normalizeParams } from '../connection.js';

export abstract class BaseRepository {
  constructor(protected readonly conn: DatabaseConnection) {}

  protected _run(sql: string, ...params: unknown[]): void {
    const normalized = normalizeParams(...params) as Array<string | number | null>;
    this.conn.prepare(sql).run(...normalized);
  }

  protected _all(sql: string, ...params: unknown[]): Record<string, unknown>[] {
    const normalized = normalizeParams(...params) as Array<string | number | null>;
    return this.conn.prepare(sql).all(...normalized) as Record<string, unknown>[];
  }

  protected _get(sql: string, ...params: unknown[]): Record<string, unknown> | undefined {
    const normalized = normalizeParams(...params) as Array<string | number | null>;
    return this.conn.prepare(sql).get(...normalized) as Record<string, unknown> | undefined;
  }
}
