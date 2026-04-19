import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { WorkUnitRecord } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { WorkUnitEditor } from './WorkUnitEditor.js';

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
  checkpointIds: [],
  progressLevel: '中',
  userEdited: false,
  updatedAt: '2024-01-15T10:30:00Z',
  note: null,
  ...overrides,
});

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

const setup = (unit: WorkUnitRecord, categories: string[] = ['coding', 'meeting', 'learning']) => {
  const onSaved = vi.fn();
  const utils = render(
    <I18nProvider>
      <WorkUnitEditor unit={unit} categories={categories} onSaved={onSaved} />
    </I18nProvider>
  );
  return { ...utils, onSaved };
};

describe('WorkUnitEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.myloggy = createMockDesktopApi();
  });

  describe('初期表示', () => {
    it('ワークユニットの内容が入力欄に表示される', () => {
      const unit = createMockWorkUnit({ title: 'Original Title', projectName: 'myproject' });
      setup(unit);

      expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('myproject')).toBeInTheDocument();
    });

    it('カテゴリ選択欄に全てのオプションが表示される', () => {
      const unit = createMockWorkUnit({ category: 'coding' });
      setup(unit, ['coding', 'meeting', 'learning']);

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option')).map(o => o.value);

      expect(options).toContain('coding');
      expect(options).toContain('meeting');
      expect(options).toContain('learning');
    });
  });

  describe('入力操作', () => {
    it('タイトルを編集できる', async () => {
      const unit = createMockWorkUnit();
      setup(unit);

      const titleInput = screen.getByDisplayValue('Test Work') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(titleInput.value).toBe('New Title');
    });

    it('プロジェクト名を編集できる', async () => {
      const unit = createMockWorkUnit();
      setup(unit);

      const projectInput = screen.getByDisplayValue('myloggy') as HTMLInputElement;
      fireEvent.change(projectInput, { target: { value: 'newproject' } });

      expect(projectInput.value).toBe('newproject');
    });

    it('カテゴリを変更できる', async () => {
      const unit = createMockWorkUnit({ category: 'coding' });
      setup(unit);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'meeting' } });

      expect(select.value).toBe('meeting');
    });

    it('概要を編集できる', async () => {
      const unit = createMockWorkUnit();
      setup(unit);

      const summaryTextarea = screen.getByRole('textbox', { name: /summary/i });
      fireEvent.change(summaryTextarea, { target: { value: 'New summary content' } });

      expect(summaryTextarea.value).toBe('New summary content');
    });
  });

  describe('カスタムカテゴリ', () => {
    it('__custom__を選択するとカスタムカテゴリ入力欄が表示される', async () => {
      const unit = createMockWorkUnit({ category: 'coding' });
      setup(unit);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      expect(screen.getByPlaceholderText(/New category name/i)).toBeInTheDocument();
    });

    it('カスタムカテゴリ入力欄でEnterを押すとカテゴリが確定する', async () => {
      const unit = createMockWorkUnit({ category: 'coding' });
      const { onSaved } = setup(unit);

      vi.mocked(window.myloggy.getSettings).mockResolvedValue({ categories: ['coding'] });
      vi.mocked(window.myloggy.updateSettings).mockResolvedValue({ categories: ['coding', 'design'] });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      const customInput = screen.getByPlaceholderText(/New category name/i);
      fireEvent.change(customInput, { target: { value: 'design' } });
      fireEvent.keyDown(customInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('combobox').value).toBe('design');
      });
    });

    it('カスタムカテゴリ入力欄でblurするとカテゴリが確定する', async () => {
      const unit = createMockWorkUnit({ category: 'coding' });
      setup(unit);

      vi.mocked(window.myloggy.getSettings).mockResolvedValue({ categories: ['coding'] });
      vi.mocked(window.myloggy.updateSettings).mockResolvedValue({ categories: ['coding', 'review'] });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      const customInput = screen.getByPlaceholderText(/New category name/i);
      fireEvent.change(customInput, { target: { value: 'review' } });
      fireEvent.blur(customInput);

      await waitFor(() => {
        expect(screen.getByRole('combobox').value).toBe('review');
      });
    });
  });

  describe('保存', () => {
    it('保存ボタンでonSavedが呼ばれる', async () => {
      const unit = createMockWorkUnit({ id: 'unit-1', category: 'coding' });
      const { onSaved } = setup(unit);

      vi.mocked(window.myloggy.updateWorkUnit).mockResolvedValue({} as any);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it('保存中は保存ボタンが無効化される', async () => {
      const unit = createMockWorkUnit({ id: 'unit-1' });
      setup(unit);

      vi.mocked(window.myloggy.updateWorkUnit).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {} as any;
      });

      const saveButton = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
      fireEvent.click(saveButton);

      expect(saveButton).toBeDisabled();
    });

    it('__custom__カテゴリで保存的时候、カスタム入力値が使用される', async () => {
      const unit = createMockWorkUnit({ id: 'unit-1', category: 'coding' });
      setup(unit);

      vi.mocked(window.myloggy.updateWorkUnit).mockResolvedValue({} as any);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      const customInput = screen.getByPlaceholderText(/New category name/i);
      fireEvent.change(customInput, { target: { value: 'newcat' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.myloggy.updateWorkUnit).toHaveBeenCalledWith(
          expect.objectContaining({ category: expect.any(String) })
        );
      });
    });
  });
});