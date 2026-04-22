// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type DatabaseConnection } from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { CategoryRuleRepository } from '../db/repositories/category-rules.js';

describe('db/repositories/category-rules', () => {
  let conn: DatabaseConnection;
  let repo: CategoryRuleRepository;

  beforeEach(() => {
    conn = createConnection('/tmp', true);
    initializeSchema(conn);
    repo = new CategoryRuleRepository(conn);
  });

  afterEach(() => {
    conn.close();
  });

  it('returns null for unregistered project', () => {
    expect(repo.get('unknown-project')).toBeNull();
  });

  it('upserts and retrieves a category rule', () => {
    repo.upsert('proj-a', '開発');
    expect(repo.get('proj-a')).toBe('開発');
  });

  it('updates an existing category rule', () => {
    repo.upsert('proj-b', '開発');
    repo.upsert('proj-b', '調査・情報収集');
    expect(repo.get('proj-b')).toBe('調査・情報収集');
  });
});
