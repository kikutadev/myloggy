import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

import fs from 'node:fs/promises';
import { z } from 'zod';

import { analyzeWindow } from './llm.js';
import type { SnapshotRecord, AppSettings, CheckpointRecord } from '../../shared/types.js';
import {
  toStoredProjectName,
  localizeUnknownTaskLabel,
  localizeInsufficientInfoSummary,
} from '../../shared/localization.js';

const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;

describe('buildPrompt', () => {
  const baseSnapshots: SnapshotRecord[] = [
    {
      id: 's1',
      capturedAt: '2026-04-18T10:00:00Z',
      imagePath: '/tmp/s1.jpg',
      imageHash: 'abc123',
      imagePaths: [],
      imageHashes: [],
      displayCount: 1,
      activeApp: 'VS Code',
      windowTitle: 'myloggy.ts',
      pageTitle: 'myloggy',
      url: 'file:///src/myloggy.ts',
      cursorX: 100,
      cursorY: 200,
      cursorDisplayId: 1,
      cursorDisplayIndex: 0,
      cursorRelativeX: 100,
      cursorRelativeY: 200,
      keyboardActivity: 'typing',
      mouseActivity: 'click',
      appSwitchCount: 0,
      gitBranch: 'main',
      gitDirty: false,
      manualNote: null,
      status: 'captured',
      excludedReason: null,
      metadataJson: null,
      checkpointId: null,
    },
  ];

  const baseSettings: AppSettings = {
    llmProvider: 'ollama',
    llmModel: 'llama3',
    ollamaHost: 'http://localhost:11434',
    lmstudioHost: 'http://localhost:1234',
    analysisTimeoutMs: 60000,
    checkpointRetentionDays: 90,
    autoStartCapture: false,
    captureIntervalMs: 60000,
    excludedApps: [],
    maxImageWidth: 1920,
    maxImageHeight: 1080,
    maxWorkUnitLabelLength: 50,
    idleThresholdPx: 10,
    idleThresholdMs: 300000,
    gitRemote: null,
    gitToken: null,
    categories: ['開発', '調査・情報収集', '事務作業', '打ち合わせ', '休憩', 'サボり'],
  } as AppSettings;

  describe('analyzeWindow', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns checkpoint with default values on empty response', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: baseSettings,
        locale: 'en',
        previousCheckpoint: null,
      });

      expect(result.projectName).toBe(toStoredProjectName(null));
      expect(result.taskLabel).toBe(localizeUnknownTaskLabel('en'));
      expect(result.stateSummary).toBe(localizeInsufficientInfoSummary('en'));
      expect(result.confidence).toBe(0.3);
    });

    it('uses LM Studio provider when configured', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: '{}' } }] }),
        }),
      );
      global.fetch = fetchMock as ReturnType<typeof vi.fn>;

      await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:1234'),
        expect.any(Object)
      );
    });

it('handles error response with non-ok status', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        }),
      ) as unknown as typeof fetch;

      await expect(
        analyzeWindow({
          snapshots: baseSnapshots,
          settings: baseSettings,
          locale: 'en',
          previousCheckpoint: null,
        })
      ).rejects.toThrow('Ollama request failed with 500');
    });

    it('handles LM Studio response with markdown code block wrapper', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: `\`\`\`json
{
  "project_name": "myloggy",
  "task_label": "エラー調査",
  "state_summary": "エラーの原因を调查中",
  "evidence": ["エラーログを確認した"],
  "continuity": "continue",
  "confidence": 0.9,
  "is_distracted": false
}
\`\`\``,
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
      });

      expect(result.projectName).toBe('myloggy');
      expect(result.taskLabel).toBe('エラー調査');
      expect(result.confidence).toBe(0.9);
    });

    it('extracts image data from snapshots', async () => {
      const snapshotsWithImage: SnapshotRecord[] = [
        {
          ...baseSnapshots[0],
          imagePath: '/tmp/s1.jpg',
          imagePaths: ['/tmp/s1-display-1.jpg', '/tmp/s1-display-2.jpg'],
        },
      ];

      mockReadFile
        .mockResolvedValueOnce(Buffer.from('img1').toString('base64'))
        .mockResolvedValueOnce(Buffer.from('img2').toString('base64'));

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );
      global.fetch = fetchMock as ReturnType<typeof vi.fn>;

      await analyzeWindow({
        snapshots: snapshotsWithImage,
        settings: baseSettings,
        locale: 'en',
        previousCheckpoint: null,
      });

      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it('falls back to previous checkpoint project name when current is unknown and continuity is continue', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const previousCheckpoint: CheckpointRecord = {
        id: 'cp1',
        startAt: '2026-04-18T09:50:00Z',
        endAt: '2026-04-18T10:00:00Z',
        projectName: 'myloggy',
        taskLabel: 'コーディング',
        category: '開発',
        stateSummary: '作業中',
        evidence: ['VS Codeを開いた'],
        continuity: 'continue',
        confidence: 0.9,
        sourceSnapshotIds: ['s0'],
        llmModel: 'llama3',
        createdAt: '2026-04-18T10:00:00Z',
        isDistracted: false,
        status: 'completed',
        appSummary: ['VS Code'],
        urlSummary: [],
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      project_name: 'Unknown',
                      task_label: '調査',
                      state_summary: '調査中',
                      evidence: ['ログを確認した'],
                      continuity: 'continue',
                      confidence: 0.8,
                      is_distracted: false,
                    }),
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint,
      });

      expect(result.projectName).toBe('myloggy');
      expect(result.continuity).toBe('continue');
    });

    it('does not fall back when continuity is switch', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const previousCheckpoint: CheckpointRecord = {
        id: 'cp1',
        startAt: '2026-04-18T09:50:00Z',
        endAt: '2026-04-18T10:00:00Z',
        projectName: 'myloggy',
        taskLabel: 'コーディング',
        category: '開発',
        stateSummary: '作業中',
        evidence: ['VS Codeを開いた'],
        continuity: 'continue',
        confidence: 0.9,
        sourceSnapshotIds: ['s0'],
        llmModel: 'llama3',
        createdAt: '2026-04-18T10:00:00Z',
        isDistracted: false,
        status: 'completed',
        appSummary: ['VS Code'],
        urlSummary: [],
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      project_name: 'Unknown',
                      task_label: '調査',
                      state_summary: '調査中',
                      evidence: ['ログを確認した'],
                      continuity: 'switch',
                      confidence: 0.8,
                      is_distracted: false,
                    }),
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint,
      });

      expect(result.projectName).toBe('不明');
      expect(result.continuity).toBe('switch');
    });

    it('includes knownProjects in the prompt for LM Studio', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '{}' } }],
            }),
        }),
      );
      global.fetch = fetchMock as ReturnType<typeof vi.fn>;

      await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
        knownProjects: ['myloggy', 'aidrivensales'],
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const promptText = requestBody.messages[0].content[0].text;
      expect(promptText).toContain('Known projects:');
      expect(promptText).toContain('- myloggy');
      expect(promptText).toContain('- aidrivensales');
    });

    it('includes knownProjects in Japanese prompt', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '{}' } }],
            }),
        }),
      );
      global.fetch = fetchMock as ReturnType<typeof vi.fn>;

      await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'ja',
        previousCheckpoint: null,
        knownProjects: ['myloggy', '社内管理システム'],
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const promptText = requestBody.messages[0].content[0].text;
      expect(promptText).toContain('既知のプロジェクト:');
      expect(promptText).toContain('- myloggy');
      expect(promptText).toContain('- 社内管理システム');
    });

    it('includes categories in the prompt', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '{}' } }],
            }),
        }),
      );
      global.fetch = fetchMock as ReturnType<typeof vi.fn>;

      await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const promptText = requestBody.messages[0].content[0].text;
      expect(promptText).toContain('Existing categories:');
      expect(promptText).toContain('- 開発');
      expect(promptText).toContain('- 調査・情報収集');
    });

    it('includes categories in Japanese prompt', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '{}' } }],
            }),
        }),
      );
      global.fetch = fetchMock as ReturnType<typeof vi.fn>;

      await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'ja',
        previousCheckpoint: null,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const promptText = requestBody.messages[0].content[0].text;
      expect(promptText).toContain('既存カテゴリ:');
      expect(promptText).toContain('- 開発');
      expect(promptText).toContain('- 調査・情報収集');
    });

    it('normalizes LLM-returned category using toStoredCategoryLabel', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      project_name: 'myloggy',
                      task_label: 'coding',
                      category: 'Development',
                      state_summary: 'working on feature',
                      evidence: ['coding'],
                      continuity: 'continue',
                      confidence: 0.9,
                      is_distracted: false,
                    }),
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
      });

      expect(result.category).toBe('開発');
    });

    it('falls back to UNKNOWN_LABEL when LLM does not return a category', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      project_name: 'myloggy',
                      task_label: 'coding',
                      state_summary: 'working on feature',
                      evidence: ['coding'],
                      continuity: 'continue',
                      confidence: 0.9,
                      is_distracted: false,
                    }),
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
      });

      expect(result.category).toBe('不明');
    });

    it('rejects unknown project name when autoCreateProject is false', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      project_name: 'brand-new-project',
                      task_label: 'coding',
                      category: '開発',
                      state_summary: 'working on feature',
                      evidence: ['coding'],
                      continuity: 'continue',
                      confidence: 0.9,
                      is_distracted: false,
                    }),
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
        knownProjects: ['myloggy'],
        autoCreateProject: false,
      });

      expect(result.projectName).toBe('不明');
    });

    it('rejects unknown category when autoCreateCategory is false', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test').toString('base64') as never);

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      project_name: 'myloggy',
                      task_label: 'coding',
                      category: 'Design',
                      state_summary: 'working on feature',
                      evidence: ['coding'],
                      continuity: 'continue',
                      confidence: 0.9,
                      is_distracted: false,
                    }),
                  },
                },
              ],
            }),
        }),
      ) as ReturnType<typeof vi.fn>;

      const result = await analyzeWindow({
        snapshots: baseSnapshots,
        settings: { ...baseSettings, llmProvider: 'lmstudio' },
        locale: 'en',
        previousCheckpoint: null,
        autoCreateCategory: false,
      });

      expect(result.category).toBe('不明');
    });
  });
});