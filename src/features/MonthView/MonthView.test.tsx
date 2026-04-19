import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DashboardData, WorkUnitRecord } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { MonthView } from './MonthView.jsx';

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
  title: 'Test Work',
  projectName: 'myloggy',
  category: 'coding',
  summary: '',
  startAt: '2024-01-01T09:00:00Z',
  endAt: '2024-01-01T10:00:00Z',
  durationMinutes: 60,
  isDistracted: false,
  checkpointIds: [],
  progressLevel: '中',
  userEdited: false,
  updatedAt: '2024-01-01T10:00:00Z',
  note: null,
  ...overrides,
});

const mockDashboardMonth: DashboardData = {
  state: mockAppState,
  today: { date: '2024-01-15', units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 },
  week: { startDate: '2024-01-14', endDate: '2024-01-20', units: [], categorySummary: [], projectSummary: [], longestUnits: [], totalMinutes: 0, distractedCount: 0 },
  month: {
    month: '2024-01',
    days: [
      { date: '2024-01-01', totalMinutes: 60, representativeUnit: createMockWorkUnit({ id: 'u1', title: 'Planning', projectName: 'myloggy', category: 'planning', summary: '', startAt: '2024-01-01T09:00:00Z', endAt: '2024-01-01T10:00:00Z', durationMinutes: 60, checkpointIds: [] }) },
      { date: '2024-01-02', totalMinutes: 120, representativeUnit: createMockWorkUnit({ id: 'u2', title: 'Coding', projectName: 'myloggy', category: 'coding', summary: '', startAt: '2024-01-02T09:00:00Z', endAt: '2024-01-02T11:00:00Z', durationMinutes: 120, checkpointIds: [] }) },
      { date: '2024-01-03', totalMinutes: 0, representativeUnit: null },
      { date: '2024-01-06', totalMinutes: 90, representativeUnit: createMockWorkUnit({ id: 'u3', title: 'Meeting', projectName: 'myloggy', category: 'meeting', summary: '', startAt: '2024-01-06T14:00:00Z', endAt: '2024-01-06T15:30:00Z', durationMinutes: 90, checkpointIds: [] }) },
      { date: '2024-01-07', totalMinutes: 0, representativeUnit: null },
    ],
    categorySummary: [{ category: 'coding', minutes: 120 }, { category: 'meeting', minutes: 90 }, { category: 'planning', minutes: 60 }],
    projectSummary: [{ projectName: 'myloggy', minutes: 270 }],
    comment: '',
  },
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
  toggleTracking: vi.fn(),
  onSettingsChanged: vi.fn(),
  getDashboard: vi.fn(),
  getDayTimeline: vi.fn(),
  getWeekTimeline: vi.fn(),
  getMonthTimeline: vi.fn(),
  captureNow: vi.fn(),
  openDashboard: vi.fn(),
});

describe('MonthView', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
  });

  it('should render categories', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('should render projects', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should render calendar grid', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardMonth} />
      </I18nProvider>
    );
    const cells = screen.getAllByText(/\d+/);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should render weekday headers', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('should render Japanese weekday headers', () => {
    render(
      <I18nProvider locale="ja">
        <MonthView dashboard={mockDashboardMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('日')).toBeInTheDocument();
  });
});