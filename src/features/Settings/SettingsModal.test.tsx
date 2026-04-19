import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AppSettings } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { SettingsModal } from './SettingsModal.jsx';

const mockSettings: AppSettings = {
  isTracking: false,
  captureIntervalMinutes: 15,
  checkIntervalMinutes: 30,
  llmModel: 'gemma4:26b',
  ollamaHost: 'http://localhost:11434',
  llmProvider: 'ollama',
  lmstudioHost: 'http://localhost:1234',
  displayCaptureMode: 'all',
  language: 'en',
  excludedApps: ['LINE'],
  excludedDomains: ['youtube.com'],
  excludedTimeBlocks: [{ start: '12:00', end: '13:00' }],
  excludedCaptureMode: 'skip',
  analysisTimeoutMs: 60000,
  maxAnalysisRetries: 3,
  idleGapMinutes: 5,
  categories: ['coding', 'meeting', 'planning'],
  onboardingCompleted: true,
};

const createMockDesktopApi = (): DesktopApi => ({
  bootstrap: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateWorkUnit: vi.fn(),
  analyzeNow: vi.fn(),
  getDebugData: vi.fn(),
  clearErrors: vi.fn(),
  clearPendingSnapshots: vi.fn(),
  checkOllama: vi.fn(),
  testModel: vi.fn(),
  toggleTracking: vi.fn(),
  onSettingsChanged: vi.fn(),
  getDashboard: vi.fn(),
  getDayTimeline: vi.fn(),
  getWeekTimeline: vi.fn(),
  getMonthTimeline: vi.fn(),
  captureNow: vi.fn(),
  openDashboard: vi.fn(),
});

describe('SettingsModal', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
    vi.mocked(window.myloggy.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(window.myloggy.updateSettings).mockResolvedValue(mockSettings);
  });

  it('should render settings title', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('should render categories section', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('should render language selector', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('should render model input', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByDisplayValue('gemma4:26b')).toBeInTheDocument();
  });

  it('should render cancel and save buttons', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('should render header close button', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    const header = document.querySelector('.modal-header');
    expect(header?.querySelector('button')).toBeInTheDocument();
  });
});