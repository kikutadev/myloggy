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
  });
});