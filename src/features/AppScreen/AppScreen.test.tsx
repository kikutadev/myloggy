import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { DesktopApi } from '../../../shared/api.js';
import type { BootstrapPayload } from '../../../shared/types.js';
import { I18nProvider } from '../../i18n.js';
import { AppScreen } from './AppScreen.jsx';

const createMockDesktopApi = (): DesktopApi => ({
  bootstrap: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateWorkUnit: vi.fn(),
  analyzeNow: vi.fn(),
  reanalyzeDate: vi.fn(),
  getCheckpointSnapshots: vi.fn(() => Promise.resolve([])),
  getDebugData: vi.fn(),
  clearErrors: vi.fn(),
  clearPendingSnapshots: vi.fn(),
  checkOllama: vi.fn(),
  testModel: vi.fn(),
  checkLmstudio: vi.fn(),
  testLmstudioModel: vi.fn(),
  toggleTracking: vi.fn(),
  onSettingsChanged: vi.fn(),
  onAnalysisProgress: vi.fn(() => vi.fn()),
  getDashboard: vi.fn(),
  getDayTimeline: vi.fn(),
  getWeekTimeline: vi.fn(),
  getMonthTimeline: vi.fn(),
  captureNow: vi.fn(),
  openDashboard: vi.fn(),
});

const mockBootstrap: BootstrapPayload = {
  locale: 'ja',
  state: {
    isTracking: true,
    isAnalyzing: false,
    pendingSnapshots: 0,
    pendingWindows: 0,
    lastCaptureAt: null,
    lastCheckpointAt: null,
    lastError: null,
    currentWorkUnit: null,
  },
  settings: {
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
    analysisTimeoutMs: 120000,
    maxAnalysisRetries: 3,
    idleGapMinutes: 20,
    categories: ['開発', '会議'],
    autoCreateProject: true,
    autoCreateCategory: true,
    onboardingCompleted: true,
  },
  dashboard: {
    state: {
      isTracking: true,
      isAnalyzing: false,
      pendingSnapshots: 0,
      pendingWindows: 0,
      lastCaptureAt: null,
      lastCheckpointAt: null,
      lastError: null,
      currentWorkUnit: null,
    },
    today: {
      date: '2024-01-15',
      units: [],
      checkpoints: [],
      totalMinutes: 0,
      categorySummary: [],
      projectSummary: [],
    },
    week: {
      startDate: '2024-01-15',
      endDate: '2024-01-21',
      units: [],
      totalMinutes: 0,
      categorySummary: [],
      projectSummary: [],
      distractedCount: 0,
      longestUnits: [],
    },
    month: {
      month: '2024-01',
      days: [],
      categorySummary: [],
      projectSummary: [],
      comment: '',
    },
    recentUnits: [],
    errors: [],
  },
};

describe('AppScreen', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
  });

  it('マウント時にonAnalysisProgressを購読する', () => {
    render(
      <I18nProvider locale="ja">
        <AppScreen
          bootstrap={mockBootstrap}
          today="2024-01-15"
          selectedDate="2024-01-15"
          setSelectedDate={vi.fn()}
          view="day"
          setView={vi.fn()}
          settingsOpen={false}
          setSettingsOpen={vi.fn()}
          debugOpen={false}
          setDebugOpen={vi.fn()}
          onReload={vi.fn()}
          setBootstrap={vi.fn()}
        />
      </I18nProvider>
    );

    expect(window.myloggy.onAnalysisProgress).toHaveBeenCalled();
  });

  it('進捗イベント受信時にAnalysisProgressBannerが表示される', () => {
    let progressListener: ((progress: any) => void) | null = null;
    vi.mocked(window.myloggy.onAnalysisProgress).mockImplementation((listener) => {
      progressListener = listener;
      return vi.fn();
    });

    render(
      <I18nProvider locale="ja">
        <AppScreen
          bootstrap={mockBootstrap}
          today="2024-01-15"
          selectedDate="2024-01-15"
          setSelectedDate={vi.fn()}
          view="day"
          setView={vi.fn()}
          settingsOpen={false}
          setSettingsOpen={vi.fn()}
          debugOpen={false}
          setDebugOpen={vi.fn()}
          onReload={vi.fn()}
          setBootstrap={vi.fn()}
        />
      </I18nProvider>
    );

    act(() => {
      progressListener!({ phase: 'analyze', current: 1, total: 5, message: 'AI解析中... (1/5)' });
    });

    expect(screen.getByText('AI解析中... (1/5)')).toBeInTheDocument();
  });

  it('complete後3秒でバナーが消える', async () => {
    vi.useFakeTimers();
    let progressListener: ((progress: any) => void) | null = null;
    vi.mocked(window.myloggy.onAnalysisProgress).mockImplementation((listener) => {
      progressListener = listener;
      return vi.fn();
    });

    render(
      <I18nProvider locale="ja">
        <AppScreen
          bootstrap={mockBootstrap}
          today="2024-01-15"
          selectedDate="2024-01-15"
          setSelectedDate={vi.fn()}
          view="day"
          setView={vi.fn()}
          settingsOpen={false}
          setSettingsOpen={vi.fn()}
          debugOpen={false}
          setDebugOpen={vi.fn()}
          onReload={vi.fn()}
          setBootstrap={vi.fn()}
        />
      </I18nProvider>
    );

    act(() => {
      progressListener!({ phase: 'analyze', current: 1, total: 5, message: 'AI解析中... (1/5)' });
    });
    expect(screen.getByText('AI解析中... (1/5)')).toBeInTheDocument();

    act(() => {
      progressListener!({ phase: 'complete', current: 5, total: 5, message: '完了 (5件処理)' });
    });
    // complete phase hides banner immediately
    expect(screen.queryByText('AI解析中... (1/5)')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // after 3s progress state is cleared
    expect(screen.queryByText('完了 (5件処理)')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
