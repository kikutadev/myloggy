import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DashboardData, WorkUnitRecord } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { WeekView } from './WeekView.jsx';

const mockAppState = {
  isTracking: false,
  isAnalyzing: false,
  pendingSnapshots: 0,
  pendingWindows: 0,
  lastCaptureAt: null,
  lastCheckpointAt: null,
  lastError: null,
  currentWorkUnit: null,
};

const createMockWorkUnit = (overrides: Partial<WorkUnitRecord> = {}): WorkUnitRecord => ({
  id: 'u1',
  title: 'Deep work',
  projectName: 'myloggy',
  category: 'coding',
  summary: 'Focus time',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T12:00:00Z',
  durationMinutes: 180,
  isDistracted: false,
  checkpointIds: [],
  progressLevel: '高',
  userEdited: false,
  updatedAt: '2024-01-15T12:00:00Z',
  note: null,
  ...overrides,
});

const mockDashboardWeek: DashboardData = {
  state: mockAppState,
  today: { date: '2024-01-15', units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 },
  week: {
    startDate: '2024-01-14',
    endDate: '2024-01-20',
    units: [],
    categorySummary: [{ category: 'coding', minutes: 300 }, { category: 'meeting', minutes: 60 }],
    projectSummary: [{ projectName: 'myloggy', minutes: 360 }],
    longestUnits: [createMockWorkUnit()],
    totalMinutes: 360,
    distractedCount: 0,
  },
  month: { month: '2024-01', days: [], categorySummary: [], projectSummary: [], comment: '' },
  recentUnits: [],
  errors: [],
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

describe('WeekView', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
  });

  it('should render total work time', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Total time')).toBeInTheDocument();
  });

  it('should render categories', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('should render projects', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should render longest work sessions', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Longest sessions')).toBeInTheDocument();
  });

  it('should render longest unit title', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Deep work')).toBeInTheDocument();
  });
});