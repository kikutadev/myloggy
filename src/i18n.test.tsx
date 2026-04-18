import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider, useI18n } from './i18n.js';

describe('I18nProvider', () => {
  it('should render children', () => {
    render(
      <I18nProvider locale="ja">
        <div>Child Content</div>
      </I18nProvider>
    );
    expect(screen.getByText('Child Content')).toBeDefined();
  });

  it('should set document lang attribute to ja', () => {
    render(
      <I18nProvider locale="ja">
        <div>Test</div>
      </I18nProvider>
    );
    expect(document.documentElement.lang).toBe('ja');
  });

  it('should set document lang attribute to en', () => {
    render(
      <I18nProvider locale="en">
        <div>Test</div>
      </I18nProvider>
    );
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('useI18n', () => {
  it('should throw error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('I18nProvider is missing');
    
    consoleError.mockRestore();
  });

  it('should provide i18n context with English locale', () => {
    const TestComponent = () => {
      const { locale, text } = useI18n();
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <span data-testid="title">{text.title}</span>
          <span data-testid="save">{text.save}</span>
        </div>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toBe('Title');
    expect(screen.getByTestId('save').textContent).toBe('Save');
  });

  it('should provide Japanese text when locale is ja', () => {
    const TestComponent = () => {
      const { text } = useI18n();
      return (
        <div>
          <span data-testid="title">{text.title}</span>
          <span data-testid="save">{text.save}</span>
        </div>
      );
    };

    render(
      <I18nProvider locale="ja">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('title').textContent).toBe('タイトル');
    expect(screen.getByTestId('save').textContent).toBe('保存');
  });

  it('should provide weekdays for English locale', () => {
    const TestComponent = () => {
      const { weekdays } = useI18n();
      return <span data-testid="weekdays">{weekdays.join(',')}</span>;
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('weekdays').textContent).toBe('Sun,Mon,Tue,Wed,Thu,Fri,Sat');
  });

  it('should provide weekdays for Japanese locale', () => {
    const TestComponent = () => {
      const { weekdays } = useI18n();
      return <span data-testid="weekdays">{weekdays.join(',')}</span>;
    };

    render(
      <I18nProvider locale="ja">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('weekdays').textContent).toBe('日,月,火,水,木,金,土');
  });

  it('should provide formatMinutes function', () => {
    const TestComponent = () => {
      const { formatMinutes } = useI18n();
      return (
        <div>
          <span data-testid="minutes1">{formatMinutes(30)}</span>
          <span data-testid="minutes2">{formatMinutes(90)}</span>
        </div>
      );
    };

    render(
      <I18nProvider locale="ja">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('minutes1').textContent).toBe('30分');
    expect(screen.getByTestId('minutes2').textContent).toBe('1時間30分');
  });

  it('should provide formatTime function', () => {
    const TestComponent = () => {
      const { formatTime } = useI18n();
      return <span data-testid="time">{formatTime('2024-01-15T09:30:00')}</span>;
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('time').textContent).toBe('09:30');
  });

  it('should provide formatTimeRange function', () => {
    const TestComponent = () => {
      const { formatTimeRange } = useI18n();
      return (
        <span data-testid="range">
          {formatTimeRange('2024-01-15T09:00:00', '2024-01-15T10:30:00')}
        </span>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('range').textContent).toBe('09:00 - 10:30');
  });

  it('should provide formatDateForView function for day view', () => {
    const TestComponent = () => {
      const { formatDateForView } = useI18n();
      return (
        <span data-testid="date">
          {formatDateForView('day', '2024-01-15')}
        </span>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    const dateText = screen.getByTestId('date').textContent;
    expect(dateText).toContain('Jan');
    expect(dateText).toContain('15');
  });

  it('should provide formatDateForView function for week view', () => {
    const TestComponent = () => {
      const { formatDateForView } = useI18n();
      return (
        <span data-testid="date">
          {formatDateForView('week', '2024-01-15')}
        </span>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    const dateText = screen.getByTestId('date').textContent;
    expect(dateText).toContain('–');
  });

  it('should provide formatDateForView function for month view', () => {
    const TestComponent = () => {
      const { formatDateForView } = useI18n();
      return (
        <span data-testid="date">
          {formatDateForView('month', '2024-01-15')}
        </span>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    const dateText = screen.getByTestId('date').textContent;
    expect(dateText).toContain('January');
    expect(dateText).toContain('2024');
  });

  it('should provide text functions like checkpoints', () => {
    const TestComponent = () => {
      const { text } = useI18n();
      return <span data-testid="checkpoints">{text.checkpoints(5)}</span>;
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('checkpoints').textContent).toBe('5 checkpoints');
  });

  it('should provide Japanese checkpoints format', () => {
    const TestComponent = () => {
      const { text } = useI18n();
      return <span data-testid="checkpoints">{text.checkpoints(5)}</span>;
    };

    render(
      <I18nProvider locale="ja">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('checkpoints').textContent).toBe('チェックポイント 5件');
  });

  it('should provide miniElapsed function', () => {
    const TestComponent = () => {
      const { text } = useI18n();
      return <span data-testid="elapsed">{text.miniElapsed(30)}</span>;
    };

    render(
      <I18nProvider locale="ja">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('elapsed').textContent).toBe('30分経過');
  });

  it('should provide tabs object', () => {
    const TestComponent = () => {
      const { text } = useI18n();
      return (
        <div>
          <span data-testid="tab-day">{text.tabs.day}</span>
          <span data-testid="tab-week">{text.tabs.week}</span>
          <span data-testid="tab-month">{text.tabs.month}</span>
        </div>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('tab-day').textContent).toBe('Day');
    expect(screen.getByTestId('tab-week').textContent).toBe('Week');
    expect(screen.getByTestId('tab-month').textContent).toBe('Month');
  });

  it('should provide tracking status strings', () => {
    const TestComponent = () => {
      const { text } = useI18n();
      return (
        <div>
          <span data-testid="tracking-on">{text.trackingOn}</span>
          <span data-testid="tracking-off">{text.trackingOff}</span>
        </div>
      );
    };

    render(
      <I18nProvider locale="en">
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('tracking-on').textContent).toBe('● Tracking');
    expect(screen.getByTestId('tracking-off').textContent).toBe('■ Stopped');
  });
});

const TestComponent = () => {
  const { text } = useI18n();
  return <div>{text.title}</div>;
};