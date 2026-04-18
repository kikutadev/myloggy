import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MiniApp from './MiniApp.js';
import type { BootstrapPayload, AppState, WorkUnitRecord } from '../shared/types.js';

const mockWorkUnit: WorkUnitRecord = {
  id: '1',
  startAt: new Date().toISOString(),
  endAt: new Date().toISOString(),
  durationMinutes: 30,
  projectName: 'Test Project',
  title: 'Test Task',
  category: 'coding',
  summary: 'summary',
  progressLevel: '中',
  isDistracted: false,
  checkpointIds: [],
  userEdited: false,
  updatedAt: new Date().toISOString(),
  note: null,
};

const createMockPayload = (overrides: Partial<AppState> = {}): BootstrapPayload => ({
  locale: 'ja',
  state: {
    isTracking: false,
    isAnalyzing: false,
    pendingSnapshots: 0,
    pendingWindows: 0,
    lastCaptureAt: null,
    lastCheckpointAt: null,
    lastError: null,
    currentWorkUnit: null,
    ...overrides,
  },
  settings: { language: 'auto', theme: 'light' },
  dashboard: { date: '2024-01-01', items: [] },
});

describe('MiniApp', () => {
  beforeEach(() => {
    window.myloggy = {
      bootstrap: vi.fn().mockResolvedValue(createMockPayload()),
      toggleTracking: vi.fn().mockResolvedValue(undefined),
      openDashboard: vi.fn(),
      onSettingsChanged: vi.fn(() => () => {}),
    } as typeof window.myloggy;
  });

  it('shows loading state when data is null', async () => {
    (window.myloggy.bootstrap as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );
    render(<MiniApp />);
    await waitFor(() => {
      expect(screen.getByText(/Loading|読み込み中/i)).toBeInTheDocument();
    });
  });

  it('shows header with My Loggy name', async () => {
    render(<MiniApp />);
    await waitFor(() => {
      expect(screen.getByText('My Loggy')).toBeInTheDocument();
    });
  });

  it('shows tracking button with Stopped text when not tracking', async () => {
    render(<MiniApp />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Stopped|停止中/i })).toBeInTheDocument();
    });
  });

  it('shows tracking button with 記録中 text when tracking', async () => {
    const payload = createMockPayload({ isTracking: true, currentWorkUnit: mockWorkUnit });
    (window.myloggy.bootstrap as ReturnType<typeof vi.fn>).mockResolvedValue(payload);
    render(<MiniApp />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /記録中|Tracking/i })).toBeInTheDocument();
    });
  });

  it('calls toggleTracking when clicking tracking button', async () => {
    const payload = createMockPayload({ isTracking: false, currentWorkUnit: mockWorkUnit });
    (window.myloggy.bootstrap as ReturnType<typeof vi.fn>).mockResolvedValue(payload);
    render(<MiniApp />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Stopped|停止中/i }));
    });

    expect(window.myloggy.toggleTracking).toHaveBeenCalledWith(true);
  });

  it('shows current work unit when exists', async () => {
    const payload = createMockPayload({ isTracking: true, currentWorkUnit: mockWorkUnit });
    (window.myloggy.bootstrap as ReturnType<typeof vi.fn>).mockResolvedValue(payload);
    render(<MiniApp />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  it('shows miniNoWork when no current work unit', async () => {
    const payload = createMockPayload({ isTracking: false, currentWorkUnit: null });
    (window.myloggy.bootstrap as ReturnType<typeof vi.fn>).mockResolvedValue(payload);
    render(<MiniApp />);

    await waitFor(() => {
      expect(screen.getByText(/作業なし|No active work/i)).toBeInTheDocument();
    });
  });

  it('calls openDashboard when clicking open button', async () => {
    render(<MiniApp />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /ダッシュボード|Open dashboard/i }));
    });

    expect(window.myloggy.openDashboard).toHaveBeenCalled();
  });

  it('fetches data on mount', async () => {
    render(<MiniApp />);
    expect(window.myloggy.bootstrap).toHaveBeenCalled();
  });

  it.skip('refreshes data every 20 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MiniApp />);
    await vi.runAllTimersAsync();
    await waitFor(() => {
      expect(window.myloggy.bootstrap).toHaveBeenCalled();
    });
    vi.advanceTimersByTime(20_000);
    await vi.runAllTimersAsync();
    expect(window.myloggy.bootstrap).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});