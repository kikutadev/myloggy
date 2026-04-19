import fs from 'node:fs/promises';

import { z } from 'zod';

import {
  UNKNOWN_LABEL,
  localizeInsufficientInfoSummary,
  localizeUnknownTaskLabel,
  toStoredProjectName,
  type SupportedLocale,
} from '../../shared/localization.js';
import type { AppSettings, CheckpointRecord, SnapshotRecord } from '../../shared/types.js';
import { normalizeCheckpointLlmOutput, extractJsonBlock } from './llm-response.js';
import { createId, trimText } from './utils.js';

function createCheckpointSchema(locale: SupportedLocale) {
  return z.object({
    project_name: z.string().default(locale === 'ja' ? UNKNOWN_LABEL : 'Unknown'),
    task_label: z.string().default(localizeUnknownTaskLabel(locale)),
    state_summary: z.string().default(localizeInsufficientInfoSummary(locale)),
    evidence: z.array(z.string()).default([locale === 'ja' ? 'メタ情報不足' : 'Insufficient metadata']),
    continuity: z.enum(['continue', 'switch', 'unclear']).default('unclear'),
    confidence: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(0).max(1)).default(0.3),
    is_distracted: z.boolean().default(false),
  });
}

function buildPrompt(
  snapshots: SnapshotRecord[],
  settings: AppSettings,
  previousCheckpoint: CheckpointRecord | null,
  locale: SupportedLocale,
): string {
  const snapshotLines = snapshots.map((snapshot, index) => {
    return [
      `snapshot_${index + 1}:`,
      `captured_at=${snapshot.capturedAt}`,
      `active_app=${snapshot.activeApp ?? 'unknown'}`,
      `window_title=${snapshot.windowTitle ?? 'unknown'}`,
      `page_title=${snapshot.pageTitle ?? 'unknown'}`,
      `url=${snapshot.url ?? 'unknown'}`,
      `cursor_display_index=${snapshot.cursorDisplayIndex ?? 'unknown'}`,
      `cursor_relative=${snapshot.cursorRelativeX ?? 'unknown'},${snapshot.cursorRelativeY ?? 'unknown'}`,
      `metadata=${snapshot.metadataJson ?? '{}'}`,
    ].join('\n');
  });

  const previousBlock = previousCheckpoint
    ? locale === 'ja'
      ? `
previous_checkpoint:
project_name=${previousCheckpoint.projectName}
task_label=${previousCheckpoint.taskLabel}
state_summary=${previousCheckpoint.stateSummary}
continuity=${previousCheckpoint.continuity}
`
      : `
previous_checkpoint:
project_name=${previousCheckpoint.projectName}
task_label=${previousCheckpoint.taskLabel}
state_summary=${previousCheckpoint.stateSummary}
continuity=${previousCheckpoint.continuity}
`
    : locale === 'ja'
      ? 'previous_checkpoint: none'
      : 'previous_checkpoint: none';

  if (locale === 'ja') {
    return `
あなたはローカル作業ログアプリの分類器です。
目的は「直近10分を観測して、主作業を1つだけ分類すること」です。
過剰推測は禁止です。見えている事実を優先してください。

${previousBlock}

観測データ:
${snapshotLines.join('\n\n')}

出力要件:
- JSONのみを返す
- キーは project_name, task_label, state_summary, evidence, continuity, confidence, is_distracted
- evidence は 2〜10件
- task_label は短く具体的な自然な日本語
- state_summary と evidence も自然な日本語
- continuity は continue / switch / unclear のみ
- confidence は 0.0〜1.0
- is_distracted は作業と無関係な脱線をしている場合に true
- project_name が不明なら "不明"
- cursor は補助信号にすぎないので、active_app / window_title / 画面内容のほうを優先する

モデル: ${settings.llmModel}
`;
  }

  return `
You are the classifier for a local work log app.
Your goal is to identify exactly one primary work activity from the last 10 minutes.
Do not over-infer. Prioritize directly visible facts.

${previousBlock}

Observations:
${snapshotLines.join('\n\n')}

Output requirements:
- Return JSON only
- Use the keys project_name, task_label, state_summary, evidence, continuity, confidence, is_distracted
- evidence must contain 2 to 10 items
- task_label must be short, specific, and natural English
- state_summary and evidence must also be concise natural English
- continuity must be one of continue / switch / unclear
- confidence must be between 0.0 and 1.0
- is_distracted must be true only when the activity is unrelated and off-task
- If project_name is unknown, use "Unknown"
- Cursor data is only a supporting signal; prioritize active_app, window_title, and visible screen content

Model: ${settings.llmModel}
`;
}

export async function analyzeWindow(params: {
  snapshots: SnapshotRecord[];
  settings: AppSettings;
  locale: SupportedLocale;
  previousCheckpoint: CheckpointRecord | null;
}): Promise<CheckpointRecord> {
  const { snapshots, settings, locale, previousCheckpoint } = params;
  const prompt = buildPrompt(snapshots, settings, previousCheckpoint, locale);
  const images = await Promise.all(
    snapshots
      .flatMap((snapshot) => (snapshot.imagePaths.length ? snapshot.imagePaths : snapshot.imagePath ? [snapshot.imagePath] : []))
      .filter((value): value is string => Boolean(value))
      .map(async (filePath) => (await fs.readFile(filePath)).toString('base64')),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.analysisTimeoutMs);

  const isLmStudio = settings.llmProvider === 'lmstudio';
  const baseUrl = isLmStudio ? settings.lmstudioHost : settings.ollamaHost;
  const endpoint = isLmStudio ? '/v1/chat/completions' : '/api/generate';
  const requestUrl = `${baseUrl}${endpoint}`;
  console.log(`[Analysis] Request to ${isLmStudio ? 'LM Studio' : 'Ollama'}:`, {
    url: requestUrl,
    model: settings.llmModel,
    provider: settings.llmProvider,
  });

  try {
    let response: Response;
    if (isLmStudio) {
      const contentWithImages = images.length
        ? [
            { type: 'text', text: prompt },
            ...images.map((img) => ({
              type: 'image_url' as const,
              image_url: { url: `data:image/png;base64,${img}` },
            })),
          ]
        : prompt;
      console.log('[Analysis] LM Studio request body:', {
        model: settings.llmModel,
        messages: [{ role: 'user', content: typeof contentWithImages === 'string' ? contentWithImages.substring(0, 100) + '...' : '[content with images]' }],
        temperature: 0.1,
      });
      response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.llmModel,
          messages: [{ role: 'user', content: contentWithImages }],
          temperature: 0.1,
        }),
      });
      console.log('[Analysis] LM Studio response status:', response.status);
    } else {
      response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.llmModel,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
          },
          images,
        }),
      });
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => 'Unable to read error body');
      console.error(`[Analysis] ${isLmStudio ? 'LM Studio' : 'Ollama'} request failed:`, response.status, errBody);
      throw new Error(`${isLmStudio ? 'LM Studio' : 'Ollama'} request failed with ${response.status}`);
    }

    let data = await response.json();
    console.log('[Analysis] Raw response data (first 200 chars):', JSON.stringify(data).substring(0, 200));
    if (isLmStudio && data && typeof data === 'object' && 'choices' in data && Array.isArray(data.choices)) {
      const content = data.choices[0]?.message?.content;
      if (typeof content === 'string') {
        data = JSON.parse(extractJsonBlock(content));
      }
    }
    const parsed = createCheckpointSchema(locale).parse(normalizeCheckpointLlmOutput(data));

    const startAt = snapshots[0]?.capturedAt ?? new Date().toISOString();
    const endAt = snapshots.at(-1)?.capturedAt ?? startAt;
    const appSummary = [...new Set(snapshots.map((item) => trimText(item.activeApp)).filter(Boolean))];
    const urlSummary = [...new Set(snapshots.map((item) => trimText(item.url)).filter(Boolean))];

    return {
      id: createId('cp'),
      startAt,
      endAt,
      projectName: toStoredProjectName(trimText(parsed.project_name)),
      taskLabel: trimText(parsed.task_label) || localizeUnknownTaskLabel(locale),
      category: UNKNOWN_LABEL,
      stateSummary: trimText(parsed.state_summary) || localizeInsufficientInfoSummary(locale),
      evidence: parsed.evidence.filter(Boolean).slice(0, 10),
      continuity: parsed.continuity,
      confidence: parsed.confidence,
      sourceSnapshotIds: snapshots.map((snapshot) => snapshot.id),
      llmModel: settings.llmModel,
      createdAt: new Date().toISOString(),
      isDistracted: parsed.is_distracted,
      status: 'completed',
      appSummary,
      urlSummary,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Analysis] Error:', errMsg);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
