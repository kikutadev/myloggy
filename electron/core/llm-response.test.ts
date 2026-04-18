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

  it('handles empty string input', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput(''));
    expect(parsed.project_name).toBe('Unknown');
  });

  it('handles null input', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput(null));
    expect(parsed.project_name).toBe('Unknown');
  });

  it('handles undefined input', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput(undefined));
    expect(parsed.project_name).toBe('Unknown');
  });

  it('handles plain array input', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput([{ project_name: 'test' }]));
    expect(parsed.project_name).toBe('test');
  });

  it('extracts JSON from response envelope', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({
      response: { output: { data: { project_name: 'envelope-test' } } },
    }));
    expect(parsed.project_name).toBe('envelope-test');
  });

  it('extracts JSON from content envelope', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({
      content: { project_name: 'content-envelope' },
    }));
    expect(parsed.project_name).toBe('content-envelope');
  });

  it('parses nested JSON in string', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput('{"response":{"project_name":"nested-string"}}'));
    expect(parsed.project_name).toBe('nested-string');
  });

  it('handles confidence as string with decimals', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ confidence: '0.85' }));
    expect(parsed.confidence).toBe(0.85);
  });

  it('does not clamp confidence > 1 (schema does clamping)', () => {
    const output = normalizeCheckpointLlmOutput({ confidence: 1.5 });
    expect(output.confidence).toBe(1.5);
  });

  it('handles is_distracted as string', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ is_distracted: 'true' }));
    expect(parsed.is_distracted).toBe(true);
  });

  it('handles is_distracted as numeric non-zero', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ is_distracted: 1 }));
    expect(parsed.is_distracted).toBe(true);
  });

  it('handles is_distracted as zero', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ is_distracted: 0 }));
    expect(parsed.is_distracted).toBe(false);
  });

  it('handles continuity in Japanese', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ continuity: '継続' }));
    expect(parsed.continuity).toBe('continue');
  });

  it('handles continuity as switch in Japanese', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ continuity: '切り替' }));
    expect(parsed.continuity).toBe('switch');
  });

  it('handles continuity as unclear in Japanese', () => {
    const parsed = checkpointSchema.parse(normalizeCheckpointLlmOutput({ continuity: '判断不能' }));
    expect(parsed.continuity).toBe('unclear');
  });
});
