import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { Onboarding } from './Onboarding.jsx';

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

describe('Onboarding', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
    vi.mocked(window.myloggy.checkOllama).mockResolvedValue({ running: true, models: ['gemma4:26b'] });
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

  it('should advance to step 1 when Start setup is clicked', () => {
    render(
      <I18nProvider locale="en">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start setup' }));
    expect(screen.getByText('Install Ollama')).toBeInTheDocument();
  });

  it('should render 4 progress dots', () => {
    render(
      <I18nProvider locale="en">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    const dots = document.querySelectorAll('.onboarding-dot');
    expect(dots).toHaveLength(4);
  });

  it('should have first dot active at step 0', () => {
    render(
      <I18nProvider locale="en">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    const dots = document.querySelectorAll('.onboarding-dot');
    expect(dots[0]).toHaveClass('active');
    expect(dots[1]).not.toHaveClass('active');
    expect(dots[2]).not.toHaveClass('active');
    expect(dots[3]).not.toHaveClass('active');
  });

  it('should navigate back from step 1 to step 0', () => {
    render(
      <I18nProvider locale="en">
        <Onboarding onComplete={vi.fn()} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start setup' }));
    expect(screen.getByText('Install Ollama')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText(/My Loggy/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start setup' })).toBeInTheDocument();
  });
});