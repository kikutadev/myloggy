import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { ExclusionListEditor } from './ExclusionListEditor.jsx';

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

describe('ExclusionListEditor', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
  });

  it('should render items', () => {
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE', 'Slack']} placeholder="App name" onChange={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('LINE')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
  });

  it('should add item on button click', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE']} placeholder="App name" onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('App name');
    fireEvent.change(input, { target: { value: 'Slack' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onChange).toHaveBeenCalledWith(['LINE', 'Slack']);
  });

  it('should add item on Enter key', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE']} placeholder="App name" onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('App name');
    fireEvent.change(input, { target: { value: 'Slack' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['LINE', 'Slack']);
  });

  it('should not add duplicate item', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE']} placeholder="App name" onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('App name');
    fireEvent.change(input, { target: { value: 'LINE' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should not add empty item', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE']} placeholder="App name" onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('App name');
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should clear input after adding item', () => {
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE']} placeholder="App name" onChange={vi.fn()} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('App name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Slack' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('');
  });

  it('should remove item when delete button clicked', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <ExclusionListEditor items={['LINE', 'Slack']} placeholder="App name" onChange={onChange} />
      </I18nProvider>
    );
    const deleteButtons = screen.getAllByText('✕');
    fireEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['Slack']);
  });
});