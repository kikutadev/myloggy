import { describe, it, expect } from 'vitest';

import { z } from 'zod';

import { normalizeCheckpointLlmOutput } from './llm-response.js';

const checkpointSchema = z.object({
  project_name: z.string().default('Unknown'),
  task_label: z.string().default('Unknown task'),
  state_summary: z.string().default('Insufficient metadata'),
  evidence: z.array(z.string()).default(['Insufficient metadata']),
  continuity: z.enum(['continue', 'switch', 'unclear']).default('unclear'),
  confidence: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(0).max(1)).default(0.3),
  is_distracted: z.boolean().default(false),
});

describe('normalizeCheckpointLlmOutput', () => {
  it('normalizes valid JSON string responses without changing their meaning', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput(`
      \`\`\`json
      {
        "project_name": "myloggy",
        "task_label": "エラー調査",
        "state_summary": "LLMレスポンスの不正型を確認している。",
        "evidence": ["エラーログを確認した。", "正規化関数を見直した。"],
        "continuity": "continue",
        "confidence": 0.92,
        "is_distracted": false
      }
      \`\`\`
    `));

    expect(parsed.project_name).toBe('myloggy');
    expect(parsed.task_label).toBe('エラー調査');
    expect(parsed.evidence).toEqual(['エラーログを確認した。', '正規化関数を見直した。']);
    expect(parsed.continuity).toBe('continue');
    expect(parsed.confidence).toBe(0.92);
    expect(parsed.is_distracted).toBe(false);
  });

  it('normalizes structured object fields before the string schema parses them', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({
      response: {
        projectName: { value: 'aidrivensales' },
        taskLabel: { text: 'PRレビュー' },
        stateSummary: {
          summary: '差分を確認している',
          description: '関連コメントも読んでいる',
        },
        evidence: [
          { text: 'PR画面を開いた' },
          { title: '差分を確認した' },
          { description: 'レビューコメントを確認した' },
        ],
        continuity: { value: 'switch' },
        confidence: { score: '0.67' },
        isDistracted: { value: 'false' },
      },
    }));

    expect(parsed.project_name).toBe('aidrivensales');
    expect(parsed.task_label).toBe('PRレビュー');
    expect(parsed.state_summary).toBe('差分を確認している / 関連コメントも読んでいる');
    expect(parsed.evidence).toEqual([
      'PR画面を開いた',
      '差分を確認した',
      'レビューコメントを確認した',
    ]);
    expect(parsed.continuity).toBe('switch');
    expect(parsed.confidence).toBe(0.67);
    expect(parsed.is_distracted).toBe(false);
  });

  it('normalizes the reproduced evidence object array that previously triggered five invalid_type errors', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({
      response: JSON.stringify({
        project_name: 'myloggy',
        task_label: '再現確認',
        state_summary: 'structured evidence を処理している',
        evidence: [
          { text: '項目1' },
          { title: '項目2' },
          { description: '項目3' },
          { content: '項目4' },
          { value: '項目5' },
        ],
        continuity: 'continue',
        confidence: '0.51',
        is_distracted: false,
      }),
    }));

    expect(parsed.evidence).toEqual(['項目1', '項目2', '項目3', '項目4', '項目5']);
    expect(parsed.confidence).toBe(0.51);
    expect(parsed.continuity).toBe('continue');
  });
});
