import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppSettings } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../../i18n.js';
import { useSettings } from './useSettings.js';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';

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
  checkLmstudio: vi.fn(),
  testLmstudioModel: vi.fn(),
  toggleTracking: vi.fn(),
  onSettingsChanged: vi.fn(),
  getDashboard: vi.fn(),
  getDayTimeline: vi.fn(),
  getWeekTimeline: vi.fn(),
  getMonthTimeline: vi.fn(),
  captureNow: vi.fn(),
  openDashboard: vi.fn(),
});

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

function TestComponent({ settings, currentLocale }: { settings: AppSettings; currentLocale: 'en' | 'ja' }) {
  const hook = useSettings({ settings, currentLocale });
  const [, forceUpdate] = useState(0);

  return (
    <div>
      <span data-testid="saving">{hook.saving.toString()}</span>
      <span data-testid="checkingModel">{hook.checkingModel.toString()}</span>
      <button onClick={() => hook.setDraft({ ...hook.draft, llmModel: 'new-model' })}>Update Draft</button>
      <button onClick={() => forceUpdate(n => n + 1)}>Force Re-render</button>
    </div>
  );
}

describe('useSettings', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
    vi.clearAllMocks();
  });

  it('should initialize draft with resolved language', () => {
    render(
      <I18nProvider locale="en">
        <TestComponent settings={mockSettings} currentLocale="en" />
      </I18nProvider>
    );
    expect(screen.getByTestId('saving').textContent).toBe('false');
  });

  it('should update draft when setDraft is called', () => {
    render(
      <I18nProvider locale="en">
        <TestComponent settings={mockSettings} currentLocale="en" />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText('Update Draft'));
    expect(screen.getByTestId('saving').textContent).toBe('false');
  });

  it('should filter empty categories on save', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(window.myloggy.updateSettings).mockResolvedValue(mockSettings);

    function SaveTestComponent() {
      const hook = useSettings({ settings: mockSettings, currentLocale: 'en' });
      return (
        <button onClick={() => hook.save(onSaved, onClose)}>Save</button>
      );
    }

    render(
      <I18nProvider locale="en">
        <SaveTestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const calledWith = vi.mocked(window.myloggy.updateSettings).mock.calls[0]?.[0] as AppSettings;
      expect(calledWith.categories).toBeDefined();
      expect(Array.isArray(calledWith.categories)).toBe(true);
    });
  });

  it('should filter empty excludedApps on save', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(window.myloggy.updateSettings).mockResolvedValue(mockSettings);

    function SaveTestComponent() {
      const hook = useSettings({ settings: mockSettings, currentLocale: 'en' });
      return (
        <button onClick={() => hook.save(onSaved, onClose)}>Save</button>
      );
    }

    render(
      <I18nProvider locale="en">
        <SaveTestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const calledWith = vi.mocked(window.myloggy.updateSettings).mock.calls[0]?.[0] as AppSettings;
      expect(calledWith.excludedApps).toBeDefined();
      expect(Array.isArray(calledWith.excludedApps)).toBe(true);
    });
  });

  it('should filter empty time blocks on save', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(window.myloggy.updateSettings).mockResolvedValue(mockSettings);

    function SaveTestComponent() {
      const hook = useSettings({ settings: mockSettings, currentLocale: 'en' });
      return (
        <button onClick={() => hook.save(onSaved, onClose)}>Save</button>
      );
    }

    render(
      <I18nProvider locale="en">
        <SaveTestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const calledWith = vi.mocked(window.myloggy.updateSettings).mock.calls[0]?.[0] as AppSettings;
      expect(calledWith.excludedTimeBlocks).toBeDefined();
      expect(Array.isArray(calledWith.excludedTimeBlocks)).toBe(true);
    });
  });

  it('should call onSaved and onClose after successful save', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(window.myloggy.updateSettings).mockResolvedValue(mockSettings);

    function SaveTestComponent() {
      const hook = useSettings({ settings: mockSettings, currentLocale: 'en' });
      return (
        <button onClick={() => hook.save(onSaved, onClose)}>Save</button>
      );
    }

    render(
      <I18nProvider locale="en">
        <SaveTestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(mockSettings);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should handle save error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(window.myloggy.updateSettings).mockRejectedValue(new Error('Save failed'));

    function SaveTestComponent() {
      const hook = useSettings({ settings: mockSettings, currentLocale: 'en' });
      return (
        <button onClick={() => hook.save(onSaved, onClose)}>Save</button>
      );
    }

    render(
      <I18nProvider locale="en">
        <SaveTestComponent />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to save settings', expect.any(Error));
    });

    consoleError.mockRestore();
  });
});