import { describe, it, expect } from 'vitest';

import { getDomain, shouldExcludeSnapshot } from './exclusions.js';
import type { AppSettings } from '../../shared/types.js';

const createSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  isTracking: true,
  captureIntervalMinutes: 1,
  checkIntervalMinutes: 10,
  llmModel: 'gemma4:26b',
  ollamaHost: 'http://127.0.0.1:11434',
  llmProvider: 'ollama',
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
});

describe('getDomain', () => {
  it('有効なURLからドメインを抽出', () => {
    const result = getDomain('https://github.com/user/repo');
    expect(result).toBe('github.com');
  });

  it('www付きURLからwwwを除去', () => {
    const result = getDomain('https://www.example.com/page');
    expect(result).toBe('example.com');
  });

  it('無効なURLはnullを返す', () => {
    expect(getDomain('not-a-url')).toBeNull();
  });
});

describe('shouldExcludeSnapshot', () => {
  it('除外アプリに一致', () => {
    const settings = createSettings({ excludedApps: ['slack'] });
    const result = shouldExcludeSnapshot(settings, {
      activeApp: 'Slack',
      url: null,
      capturedAt: '2024-01-15T10:00:00Z',
    });

    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('app:slack');
  });

  it('除外ドメインに一致', () => {
    const settings = createSettings({ excludedDomains: ['youtube.com'] });
    const result = shouldExcludeSnapshot(settings, {
      activeApp: 'Chrome',
      url: 'https://www.youtube.com/watch?v=abc',
      capturedAt: '2024-01-15T10:00:00Z',
    });

    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('domain:youtube.com');
  });

  it('除外時間帯に一致 (通常)', () => {
    const settings = createSettings({
      excludedTimeBlocks: [{ start: '09:00', end: '12:00' }],
    });
    const result = shouldExcludeSnapshot(settings, {
      activeApp: 'Chrome',
      url: null,
      capturedAt: '2024-01-15T01:30:00Z', // 10:30 JST
    });

    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('time:09:00-12:00');
  });

  it('除外時間帯に一致 (日を跨ぐ)', () => {
    const settings = createSettings({
      excludedTimeBlocks: [{ start: '22:00', end: '06:00' }],
    });
    const result = shouldExcludeSnapshot(settings, {
      activeApp: 'Chrome',
      url: null,
      capturedAt: '2024-01-15T16:00:00Z', // 01:00 JST next day
    });

    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('time:22:00-06:00');
  });

  it('除外条件なしは除外しない', () => {
    const settings = createSettings();
    const result = shouldExcludeSnapshot(settings, {
      activeApp: 'Chrome',
      url: 'https://github.com',
      capturedAt: '2024-01-15T10:00:00Z',
    });

    expect(result.excluded).toBe(false);
    expect(result.reason).toBeNull();
  });
});