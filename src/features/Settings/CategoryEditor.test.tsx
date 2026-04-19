import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AppSettings } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { CategoryEditor } from './CategoryEditor.jsx';

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

describe('CategoryEditor', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
  });

  it('should render categories with localized labels', () => {
    const categories = ['開発', '調査・情報収集', '事務作業'];
    render(
      <I18nProvider locale="ja">
        <CategoryEditor categories={categories} onChange={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('開発')).toBeInTheDocument();
    expect(screen.getByText('調査・情報収集')).toBeInTheDocument();
    expect(screen.getByText('事務作業')).toBeInTheDocument();
  });

  it('should add new category on button click', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development']} onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('New category');
    fireEvent.change(input, { target: { value: 'Research' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onChange).toHaveBeenCalledWith(['Development', '調査・情報収集']);
  });

  it('should add new category on Enter key', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development']} onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('New category');
    fireEvent.change(input, { target: { value: 'Research' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Development', '調査・情報収集']);
  });

  it('should not add duplicate category', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development']} onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('New category');
    fireEvent.change(input, { target: { value: 'Development' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should not add empty category', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development']} onChange={onChange} />
      </I18nProvider>
    );
    const input = screen.getByPlaceholderText('New category');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should remove category when delete button clicked', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development', 'Research']} onChange={onChange} />
      </I18nProvider>
    );
    const deleteButtons = screen.getAllByText('✕');
    fireEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['Research']);
  });

  it('should move category up when up button clicked', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development', 'Research']} onChange={onChange} />
      </I18nProvider>
    );
    const upButtons = screen.getAllByText('↑');
    fireEvent.click(upButtons[1]);
    expect(onChange).toHaveBeenCalledWith(['Research', 'Development']);
  });

  it('should move category down when down button clicked', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development', 'Research']} onChange={onChange} />
      </I18nProvider>
    );
    const downButtons = screen.getAllByText('↓');
    fireEvent.click(downButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['Research', 'Development']);
  });

  it('should disable up button for first category', () => {
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development', 'Research']} onChange={vi.fn()} />
      </I18nProvider>
    );
    const upButtons = screen.getAllByText('↑');
    expect(upButtons[0]).toBeDisabled();
  });

  it('should disable down button for last category', () => {
    render(
      <I18nProvider locale="en">
        <CategoryEditor categories={['Development', 'Research']} onChange={vi.fn()} />
      </I18nProvider>
    );
    const downButtons = screen.getAllByText('↓');
    expect(downButtons[1]).toBeDisabled();
  });
});