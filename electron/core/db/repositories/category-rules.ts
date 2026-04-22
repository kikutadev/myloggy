import { BaseRepository } from './base-repository.js';

export class CategoryRuleRepository extends BaseRepository {
  get(projectName: string): string | null {
    const row = this._get('SELECT category FROM category_rules WHERE project_name = ?', projectName);
    return row ? String(row.category) : null;
  }

  upsert(projectName: string, category: string): void {
    this._run(
      `INSERT INTO category_rules (project_name, category, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(project_name) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at`,
      projectName,
      category,
      new Date().toISOString(),
    );
  }
}
