import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DashboardData, WorkUnitRecord, CheckpointRecord } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { DayView } from './DayView.jsx';

const createMockWorkUnit = (overrides: Partial<WorkUnitRecord> = {}): WorkUnitRecord => ({
  id: 'u1',
  title: 'Test Work',
  projectName: 'myloggy',
  category: 'coding',
  summary: 'Test summary',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T10:30:00Z',
  durationMinutes: 90,
  isDistracted: false,
  checkpointIds: ['c1'],
  progressLevel: '中',
  userEdited: false,
  updatedAt: '2024-01-15T10:30:00Z',
  note: null,
  ...overrides,
});

const createMockCheckpoint = (overrides: Partial<CheckpointRecord> = {}): CheckpointRecord => ({
  id: 'c1',
  startAt: '2024-01-15T09:00:00Z',
  endAt: '2024-01-15T09:30:00Z',
  projectName: 'myloggy',
  taskLabel: 'Write tests',
  category: 'coding',
  stateSummary: 'In progress',
  evidence: [],
  continuity: 'continue',
  confidence: 0.8,
  sourceSnapshotIds: [],
  llmModel: 'gemma4:26b',
  createdAt: '2024-01-15T09:00:00Z',
  isDistracted: false,
  status: 'completed',
  appSummary: [],
  urlSummary: [],
  ...overrides,
});

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

const mockDashboard: DashboardData = {
  state: mockAppState,
  today: {
    date: '2024-01-15',
    units: [createMockWorkUnit()],
    checkpoints: [createMockCheckpoint()],
    categorySummary: [{ category: 'coding', minutes: 90 }],
    projectSummary: [{ projectName: 'myloggy', minutes: 90 }],
    totalMinutes: 90,
  },
  week: {
    startDate: '2024-01-14',
    endDate: '2024-01-20',
    units: [],
    categorySummary: [],
    projectSummary: [],
    longestUnits: [],
    totalMinutes: 0,
    distractedCount: 0,
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

describe('DayView', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
  });

  it('should render work unit title', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('heading', { name: 'Test Work' })).toBeInTheDocument();
  });

  it('should render work unit time range', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText(/18:00 - 19:30/)).toBeInTheDocument();
  });

  it('should render project name in heading area', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('myloggy', { selector: '.muted.small' })).toBeInTheDocument();
  });

  it('should render category tag', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getAllByText('Development').length).toBeGreaterThan(0);
  });

  it('should render summary', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('Test summary')).toBeInTheDocument();
  });

  it('should show "No work log yet" when no units', () => {
    const emptyDashboard: DashboardData = {
      ...mockDashboard,
      today: { ...mockDashboard.today, units: [], totalMinutes: 0 },
    };
    render(
      <I18nProvider locale="en">
        <DayView dashboard={emptyDashboard} categories={[]} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('No work log yet')).toBeInTheDocument();
  });

  it('should render edit button', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('should render Japanese text', () => {
    render(
      <I18nProvider locale="ja">
        <DayView dashboard={mockDashboard} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('編集')).toBeInTheDocument();
  });
});