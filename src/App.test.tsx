import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { compactText, formatIssueLabel, navigateDate, ratioWidth, summarizeErrorMessage, translateStructuredIssue } from './App.js';
import type { DashboardData } from '../shared/types.js';
import { I18nProvider } from './i18n.js';
import type { AppSettings } from '../shared/types.js';
import { LoadingScreen, DayView, WeekView, MonthView, SettingsModal, Onboarding } from './App.js';

describe('compactText', () => {
  it('should collapse multiple whitespaces to single space', () => {
    expect(compactText('a  b    c')).toBe('a b c');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(compactText('  hello  ')).toBe('hello');
  });

  it('should handle newlines', () => {
    expect(compactText('a\nb')).toBe('a b');
  });
});

describe('ratioWidth', () => {
  it('should return 50% for value 50 and total 100', () => {
    expect(ratioWidth(50, 100)).toBe('50%');
  });

  it('should return 0% when total is 0', () => {
    expect(ratioWidth(0, 0)).toBe('0%');
  });
});

describe('navigateDate', () => {
  it('should navigate by day forward', () => {
    expect(navigateDate(1, 'day', '2024-01-15')).toBe('2024-01-16');
  });

  it('should navigate by day backward', () => {
    expect(navigateDate(-1, 'day', '2024-01-15')).toBe('2024-01-14');
  });

  it('should navigate by week forward', () => {
    expect(navigateDate(1, 'week', '2024-01-15')).toBe('2024-01-22');
  });

  it('should navigate by week backward', () => {
    expect(navigateDate(-1, 'week', '2024-01-15')).toBe('2024-01-08');
  });

  it('should navigate by month forward', () => {
    expect(navigateDate(1, 'month', '2024-01-15')).toBe('2024-02-15');
  });

  it('should navigate by month backward', () => {
    expect(navigateDate(-1, 'month', '2024-01-15')).toBe('2023-12-15');
  });
});

describe('formatIssueLabel', () => {
  it('should translate evidence to Japanese', () => {
    expect(formatIssueLabel(['evidence'], 'ja')).toBe('根拠データ');
  });

  it('should translate confidence to English', () => {
    expect(formatIssueLabel(['confidence'], 'en')).toBe('confidence');
  });
});

describe('translateStructuredIssue', () => {
  it('should translate invalid_type object error to Japanese', () => {
    const issue = { code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] };
    expect(translateStructuredIssue(issue, 'ja')).toBe('根拠データがテキストではなくオブジェクトで返されました');
  });

  it('should translate invalid_type object error to English', () => {
    const issue = { code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] };
    expect(translateStructuredIssue(issue, 'en')).toBe('evidence came back as an object instead of text');
  });

  it('should translate too_big error to Japanese', () => {
    const issue = { code: 'too_big', maximum: 10, path: ['items'] };
    expect(translateStructuredIssue(issue, 'ja')).toBe('itemsが多すぎます（最大10件）');
  });

  it('should translate too_big error to English', () => {
    const issue = { code: 'too_big', maximum: 10, path: ['items'] };
    expect(translateStructuredIssue(issue, 'en')).toBe('items has too many items (max 10)');
  });
});

describe('summarizeErrorMessage', () => {
  it('should parse JSON array and translate first error', () => {
    const message = JSON.stringify([{ code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] }]);
    expect(summarizeErrorMessage(message, 'ja')).toBe('根拠データがテキストではなくオブジェクトで返されました');
  });

  it('should include count suffix when multiple errors', () => {
    const message = JSON.stringify([
      { code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] },
      { code: 'invalid_type', expected: 'number', path: ['count'] },
    ]);
    expect(summarizeErrorMessage(message, 'en')).toBe('evidence came back as an object instead of text (+1)');
  });

  it('should return plain text for non-JSON message', () => {
    expect(summarizeErrorMessage('Something went wrong', 'en')).toBe('Something went wrong');
  });

  it('should return empty string for empty message', () => {
    expect(summarizeErrorMessage('', 'en')).toBe('');
  });
});

describe('LoadingScreen', () => {
  it('should render loading text', () => {
    render(
      <I18nProvider locale="en">
        <LoadingScreen />
      </I18nProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render loading text in Japanese', () => {
    render(
      <I18nProvider locale="ja">
        <LoadingScreen />
      </I18nProvider>
    );
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });
});

const mockDashboardEn: DashboardData = {
  today: {
    units: [
      {
        id: 'u1',
        title: 'Coding',
        projectName: 'myloggy',
        category: 'coding',
        summary: 'Working on tests',
        startAt: '2024-01-15T09:00:00Z',
        endAt: '2024-01-15T10:30:00Z',
        durationMinutes: 90,
        isDistracted: false,
        checkpointIds: ['c1'],
      },
    ],
    checkpoints: [{ id: 'c1', startAt: '2024-01-15T09:00:00Z', endAt: '2024-01-15T09:30:00Z', category: 'coding', taskLabel: 'Write tests', stateSummary: 'In progress' }],
    categorySummary: [{ category: 'coding', minutes: 90 }],
    projectSummary: [{ projectName: 'myloggy', minutes: 90 }],
    totalMinutes: 90,
  },
  week: { units: [], categorySummary: [], projectSummary: [], longestUnits: [], totalMinutes: 0 },
  month: { days: [], categorySummary: [], projectSummary: [], month: '2024-01' },
  errors: [],
};

const mockDashboardEnWeek: DashboardData = {
  today: { units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 },
  week: {
    units: [],
    categorySummary: [{ category: 'coding', minutes: 300 }, { category: 'meeting', minutes: 60 }],
    projectSummary: [{ projectName: 'myloggy', minutes: 360 }],
    longestUnits: [
      { id: 'u1', title: 'Deep work', projectName: 'myloggy', category: 'coding', summary: 'Focus time', startAt: '2024-01-15T09:00:00Z', endAt: '2024-01-15T12:00:00Z', durationMinutes: 180, isDistracted: false, checkpointIds: [] },
    ],
    totalMinutes: 360,
  },
  month: { days: [], categorySummary: [], projectSummary: [], month: '2024-01' },
  errors: [],
};

const mockDashboardEnMonth: DashboardData = {
  today: { units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 },
  week: { units: [], categorySummary: [], projectSummary: [], longestUnits: [], totalMinutes: 0 },
  month: {
    days: [
      { date: '2024-01-01', totalMinutes: 60, representativeUnit: { id: 'u1', title: 'Planning', projectName: 'myloggy', category: 'planning', summary: '', startAt: '2024-01-01T09:00:00Z', endAt: '2024-01-01T10:00:00Z', durationMinutes: 60, isDistracted: false, checkpointIds: [] } },
      { date: '2024-01-02', totalMinutes: 120, representativeUnit: { id: 'u2', title: 'Coding', projectName: 'myloggy', category: 'coding', summary: '', startAt: '2024-01-02T09:00:00Z', endAt: '2024-01-02T11:00:00Z', durationMinutes: 120, isDistracted: false, checkpointIds: [] } },
      { date: '2024-01-03', totalMinutes: 0, representativeUnit: null },
      { date: '2024-01-06', totalMinutes: 90, representativeUnit: { id: 'u3', title: 'Meeting', projectName: 'myloggy', category: 'meeting', summary: '', startAt: '2024-01-06T14:00:00Z', endAt: '2024-01-06T15:30:00Z', durationMinutes: 90, isDistracted: false, checkpointIds: [] } },
      { date: '2024-01-07', totalMinutes: 0, representativeUnit: null },
    ],
    categorySummary: [{ category: 'coding', minutes: 120 }, { category: 'meeting', minutes: 90 }, { category: 'planning', minutes: 60 }],
    projectSummary: [{ projectName: 'myloggy', minutes: 270 }],
    month: '2024-01',
  },
  errors: [],
};

describe('DayView', () => {
  beforeEach(() => {
    window.myloggy = {
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
    } as typeof window.myloggy;
  });

  it('should render work unit title', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('heading', { name: 'Coding' })).toBeInTheDocument();
  });

  it('should render work unit time range', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText(/18:00 - 19:30/)).toBeInTheDocument();
  });

  it('should render project name in heading area', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('myloggy', { selector: '.muted.small' })).toBeInTheDocument();
  });

  it('should render category tag', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getAllByText('Development').length).toBeGreaterThan(0);
  });

  it('should render summary', () => {
    render(
      <I18nProvider locale="en">
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('Working on tests')).toBeInTheDocument();
  });

  it('should show "No work log yet" when no units', () => {
    const emptyDashboard: DashboardData = {
      ...mockDashboardEn,
      today: { ...mockDashboardEn.today, units: [], totalMinutes: 0 },
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
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('should render Japanese text', () => {
    render(
      <I18nProvider locale="ja">
        <DayView dashboard={mockDashboardEn} categories={['coding']} onRefresh={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('編集')).toBeInTheDocument();
  });
});

describe('WeekView', () => {
  it('should render total work time', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardEnWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Total time')).toBeInTheDocument();
  });

  it('should render categories', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardEnWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('should render projects', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardEnWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should render longest work sessions', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardEnWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Longest sessions')).toBeInTheDocument();
  });

  it('should render longest unit title', () => {
    render(
      <I18nProvider locale="en">
        <WeekView dashboard={mockDashboardEnWeek} />
      </I18nProvider>
    );
    expect(screen.getByText('Deep work')).toBeInTheDocument();
  });
});

describe('MonthView', () => {
  it('should render categories', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardEnMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('should render projects', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardEnMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should render calendar grid', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardEnMonth} />
      </I18nProvider>
    );
    const cells = screen.getAllByText(/\d+/);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should render weekday headers', () => {
    render(
      <I18nProvider locale="en">
        <MonthView dashboard={mockDashboardEnMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('should render Japanese weekday headers', () => {
    render(
      <I18nProvider locale="ja">
        <MonthView dashboard={mockDashboardEnMonth} />
      </I18nProvider>
    );
    expect(screen.getByText('日')).toBeInTheDocument();
  });
});

const mockSettings: AppSettings = {
  categories: ['coding', 'meeting', 'planning'],
  language: 'en',
  llmModel: 'gemma4:26b',
  ollamaHost: 'http://localhost:11434',
  displayCaptureMode: 'all',
  excludedApps: ['LINE'],
  excludedDomains: ['youtube.com'],
  excludedTimeBlocks: [{ start: '12:00', end: '13:00' }],
  onboardingCompleted: true,
  theme: 'system',
};

describe('SettingsModal', () => {
  beforeEach(() => {
    window.myloggy = {
      bootstrap: vi.fn(),
      getSettings: vi.fn().mockResolvedValue(mockSettings),
      updateSettings: vi.fn().mockResolvedValue(mockSettings),
      updateWorkUnit: vi.fn(),
      analyzeNow: vi.fn(),
      getDebugData: vi.fn(),
      clearErrors: vi.fn(),
      clearPendingSnapshots: vi.fn(),
      checkOllama: vi.fn(),
      testModel: vi.fn(),
      toggleTracking: vi.fn(),
      onSettingsChanged: vi.fn(),
    } as typeof window.myloggy;
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

describe('Onboarding', () => {
  beforeEach(() => {
    window.myloggy = {
      bootstrap: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      updateWorkUnit: vi.fn(),
      analyzeNow: vi.fn(),
      getDebugData: vi.fn(),
      clearErrors: vi.fn(),
      clearPendingSnapshots: vi.fn(),
      checkOllama: vi.fn().mockResolvedValue({ running: true, models: ['gemma4:26b'] }),
      testModel: vi.fn(),
      toggleTracking: vi.fn(),
      onSettingsChanged: vi.fn(),
    } as typeof window.myloggy;
  });

  it('should render onboarding title', () => {
    render(
      <I18nProvider locale="en">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText(/My Loggy/)).toBeInTheDocument();
  });

  it('should render start setup button', () => {
    render(
      <I18nProvider locale="en">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Start setup' })).toBeInTheDocument();
  });

  it('should render Japanese text', () => {
    render(
      <I18nProvider locale="ja">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText(/My Loggy/)).toBeInTheDocument();
  });
});