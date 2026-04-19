vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  },
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppSettings, SnapshotRecord } from '../../../shared/types.js';
import { analyzeWindow } from '../llm.js';

const TEST_SNAPSHOT: SnapshotRecord = {
  id: 's1',
  capturedAt: '2024-01-01T00:00:00Z',
  imagePath: null,
  imageHash: null,
  imagePaths: [],
  imageHashes: [],
  displayCount: 1,
  cursorX: null,
  cursorY: null,
  cursorDisplayId: null,
  cursorDisplayIndex: null,
  cursorRelativeX: null,
  cursorRelativeY: null,
  activeApp: 'test-app',
  windowTitle: 'Test Window',
  pageTitle: null,
  url: null,
  keyboardActivity: null,
  mouseActivity: null,
  appSwitchCount: null,
  gitBranch: null,
  gitDirty: null,
  manualNote: null,
  status: 'captured',
  excludedReason: null,
  metadataJson: null,
  checkpointId: null,
};

const TEST_SNAPSHOT_WITH_IMAGE: SnapshotRecord = {
  ...TEST_SNAPSHOT,
  id: 's2',
  imagePath: '/test/screenshot.png',
};

function createSettings(provider: 'ollama' | 'lmstudio', overrides?: Partial<AppSettings>): AppSettings {
  return {
    isTracking: true,
    captureIntervalMinutes: 1,
    checkIntervalMinutes: 10,
    llmModel: 'gemma4:26b',
    ollamaHost: 'http://127.0.0.1:11434',
    llmProvider: provider,
    lmstudioHost: 'http://127.0.0.1:1234',
    displayCaptureMode: 'all',
    excludedApps: [],
    excludedDomains: [],
    excludedTimeBlocks: [],
    excludedCaptureMode: 'skip',
    analysisTimeoutMs: 30000,
    maxAnalysisRetries: 3,
    idleGapMinutes: 20,
    categories: [],
    onboardingCompleted: false,
    ...overrides,
  };
}

describe('LLM Provider 切替えた時の振る舞い', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Ollama選択時、OllamaのAPIエンドポイントにリクエスト送信', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('ollama');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        project_name: 'test',
        task_label: 'test',
        state_summary: 'test',
        evidence: [],
        continuity: 'unclear',
        confidence: 0.5,
        is_distracted: false,
      }),
    } as unknown as Response);

    await analyzeWindow({ snapshots: [TEST_SNAPSHOT], settings, locale: 'en', previousCheckpoint: null });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/generate',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('LM Studio選択時、LM StudioのAPIエンドポイントにリクエスト送信', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('lmstudio');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"project_name":"test","task_label":"test","state_summary":"test","evidence":[],"continuity":"unclear","confidence":0.5,"is_distracted":false}' } }],
      }),
    } as unknown as Response);

    await analyzeWindow({ snapshots: [TEST_SNAPSHOT], settings, locale: 'en', previousCheckpoint: null });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:1234/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('Ollama選択時、リクエストボディはprompt形式', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('ollama');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        project_name: 'test',
        task_label: 'test',
        state_summary: 'test',
        evidence: [],
        continuity: 'unclear',
        confidence: 0.5,
        is_distracted: false,
      }),
    } as unknown as Response);

    await analyzeWindow({ snapshots: [TEST_SNAPSHOT], settings, locale: 'en', previousCheckpoint: null });

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);

    expect(body).toHaveProperty('prompt');
    expect(body.prompt).toContain('You are the classifier');
  });

  it('LM Studio選択時、リクエストボディはmessages形式', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('lmstudio');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"project_name":"test","task_label":"test","state_summary":"test","evidence":[],"continuity":"unclear","confidence":0.5,"is_distracted":false}' } }],
      }),
    } as unknown as Response);

    await analyzeWindow({ snapshots: [TEST_SNAPSHOT], settings, locale: 'en', previousCheckpoint: null });

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);

    expect(body).toHaveProperty('messages');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  it('カスタムLM Studioホスト使用時、カスタムホストにリクエスト送信', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('lmstudio', {
      lmstudioHost: 'http://192.168.1.100:8080',
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"project_name":"test","task_label":"test","state_summary":"test","evidence":[],"continuity":"unclear","confidence":0.5,"is_distracted":false}' } }],
      }),
    } as unknown as Response);

    await analyzeWindow({ snapshots: [TEST_SNAPSHOT], settings, locale: 'en', previousCheckpoint: null });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.100:8080/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('LM StudioレスポンスからJSON抽出してパース', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('lmstudio');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"project_name":"myloggy","task_label":"coding","state_summary":"working on feature","evidence":["coding"],"continuity":"continue","confidence":0.9,"is_distracted":false}' } }],
      }),
    } as unknown as Response);

    const result = await analyzeWindow({ snapshots: [TEST_SNAPSHOT], settings, locale: 'en', previousCheckpoint: null });

    expect(result.projectName).toBe('myloggy');
    expect(result.taskLabel).toBe('coding');
    expect(result.stateSummary).toBe('working on feature');
    expect(result.confidence).toBe(0.9);
  });

  it('LM Studio選択時、画像Base64がリクエストに含まれる', async () => {
    const fetchMock = vi.mocked(fetch);
    const settings = createSettings('lmstudio');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"project_name":"test","task_label":"test","state_summary":"test","evidence":[],"continuity":"unclear","confidence":0.5,"is_distracted":false}' } }],
      }),
    } as unknown as Response);

    await analyzeWindow({ snapshots: [TEST_SNAPSHOT_WITH_IMAGE], settings, locale: 'en', previousCheckpoint: null });

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);

    expect(body).toHaveProperty('messages');
    expect(body.messages[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
        }),
      ])
    );
  });
});