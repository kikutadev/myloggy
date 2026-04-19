import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AppSettings } from '../../../shared/types.js';
import type { DesktopApi } from '../../../shared/api.js';
import { I18nProvider } from '../../i18n.js';
import { SettingsModal } from './SettingsModal.jsx';

const mockSettings: AppSettings = {
  isTracking: false,
  captureIntervalMinutes: 15,
  checkIntervalMinutes: 30,
  llmModel: 'gemma4:26b',
  ollamaHost: 'http://localhost:11434',
  llmProvider: 'ollama',
  lmstudioHost: 'http://localhost:1234',
  displayCaptureMode: 'all',
  language: 'en',
  excludedApps: ['LINE'],
  excludedDomains: ['youtube.com'],
  excludedTimeBlocks: [{ start: '12:00', end: '13:00' }],
  excludedCaptureMode: 'skip',
  analysisTimeoutMs: 60000,
  maxAnalysisRetries: 3,
  idleGapMinutes: 5,
  categories: ['coding', 'meeting', 'planning'],
  onboardingCompleted: true,
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

describe('SettingsModal', () => {
  beforeEach(() => {
    window.myloggy = createMockDesktopApi();
    vi.mocked(window.myloggy.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(window.myloggy.updateSettings).mockResolvedValue(mockSettings);
  });

  it('should render settings title', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('should display current provider and model at top', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText(/Ollama.*gemma4/)).toBeInTheDocument();
  });

  it('should display LM Studio when provider is lmstudio', () => {
    const lmStudioSettings = { ...mockSettings, llmProvider: 'lmstudio' as const, llmModel: 'llama-3.1-8b' };
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={lmStudioSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText(/LM Studio.*llama-3.1-8b/)).toBeInTheDocument();
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

  it('should add new category', async () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    const categorySection = screen.getByText('Categories').parentElement;
    const input = categorySection?.querySelector('input');
    const addButton = categorySection?.querySelector('.category-add button');
    fireEvent.change(input!, { target: { value: 'new-category' } });
    fireEvent.click(addButton!);
    expect(screen.getByText('new-category')).toBeInTheDocument();
  });

  it('should remove category', () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByText('Development')).toBeInTheDocument();
    const categorySection = screen.getByText('Categories').parentElement;
    const deleteButton = categorySection?.querySelector('.category-item:first-child .category-actions button.btn-danger-text');
    fireEvent.click(deleteButton!);
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });

  it('should add excluded app', async () => {
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    const inputs = screen.getAllByPlaceholderText('App name (e.g. LINE)');
    const excludedAppInput = inputs[0];
    fireEvent.change(excludedAppInput, { target: { value: 'Slack' } });
    fireEvent.keyDown(excludedAppInput, { key: 'Enter' });
    expect(screen.getByText('Slack')).toBeInTheDocument();
  });

  it('should save settings on save button click', () => {
    const onSaved = vi.fn();
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={onSaved} onClose={vi.fn()} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(window.myloggy.updateSettings).toHaveBeenCalled();
  });

  it('should call onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(
      <I18nProvider locale="en">
        <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={onClose} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

it('should call onClose when overlay clicked', () => {
  const onClose = vi.fn();
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={onClose} />
    </I18nProvider>
  );
  const overlay = document.querySelector('.modal-overlay');
  fireEvent.click(overlay!);
  expect(onClose).toHaveBeenCalled();
});

it('should switch to LM Studio provider and show LM Studio host field', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const lmstudioLabel = screen.getByText('LM Studio').parentElement as HTMLLabelElement;
  const lmstudioRadio = lmstudioLabel.querySelector('input[type="radio"]') as HTMLInputElement;
  fireEvent.click(lmstudioRadio);
  expect(screen.getByDisplayValue('http://localhost:1234')).toBeInTheDocument();
});

it('should switch to Ollama provider and show Ollama host field', () => {
  const lmStudioSettings = { ...mockSettings, llmProvider: 'lmstudio' as const };
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={lmStudioSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const ollamaLabel = screen.getByText('Ollama').parentElement as HTMLLabelElement;
  const ollamaRadio = ollamaLabel.querySelector('input[type="radio"]') as HTMLInputElement;
  fireEvent.click(ollamaRadio);
  expect(screen.getByDisplayValue('http://localhost:11434')).toBeInTheDocument();
});

it('should update Ollama host when changed', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const hostInput = screen.getByDisplayValue('http://localhost:11434') as HTMLInputElement;
  fireEvent.change(hostInput, { target: { value: 'http://localhost:11435' } });
  expect(hostInput.value).toBe('http://localhost:11435');
});

it('should update LM Studio host when changed', () => {
  const lmStudioSettings = { ...mockSettings, llmProvider: 'lmstudio' as const };
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={lmStudioSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const hostInput = screen.getByDisplayValue('http://localhost:1234') as HTMLInputElement;
  fireEvent.change(hostInput, { target: { value: 'http://localhost:1235' } });
  expect(hostInput.value).toBe('http://localhost:1235');
});

it('should update LLM model when changed', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const modelInput = screen.getByDisplayValue('gemma4:26b') as HTMLInputElement;
  fireEvent.change(modelInput, { target: { value: 'llama-3.1-8b' } });
  expect(modelInput.value).toBe('llama-3.1-8b');
});

it('should update display capture mode when changed', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const select = screen.getByLabelText('Capture target') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: 'main' } });
  expect(select.value).toBe('main');
});

it('should test model and show checking state', async () => {
  vi.mocked(window.myloggy.testModel).mockImplementation(() => new Promise(() => {}));
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const testButton = screen.getByRole('button', { name: 'Check model' });
  fireEvent.click(testButton);
  expect(screen.getByText('Checking...')).toBeInTheDocument();
});

it('should display model check result when successful', async () => {
  vi.mocked(window.myloggy.testModel).mockResolvedValue({ ok: true, message: 'Model is ready' });
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const testButton = screen.getByRole('button', { name: 'Check model' });
  fireEvent.click(testButton);
  await vi.waitFor(() => {
    expect(screen.getByText(/Model responded/)).toBeInTheDocument();
  });
});

it('should display model check result when failed', async () => {
  vi.mocked(window.myloggy.testModel).mockResolvedValue({ ok: false, message: 'Connection failed' });
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const testButton = screen.getByRole('button', { name: 'Check model' });
  fireEvent.click(testButton);
  await vi.waitFor(() => {
    expect(screen.getByText(/Model check failed/)).toBeInTheDocument();
  });
});

it('should update excluded time block start time', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const timeInputs = document.querySelectorAll('input[type="time"]');
  const startInput = timeInputs[0] as HTMLInputElement;
  fireEvent.change(startInput, { target: { value: '13:00' } });
  expect(startInput.value).toBe('13:00');
});

it('should update excluded time block end time', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const timeInputs = document.querySelectorAll('input[type="time"]');
  const endInput = timeInputs[1] as HTMLInputElement;
  fireEvent.change(endInput, { target: { value: '14:00' } });
  expect(endInput.value).toBe('14:00');
});

it('should update language when changed', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const languageSelect = screen.getByLabelText('Language') as HTMLSelectElement;
  fireEvent.change(languageSelect, { target: { value: 'ja' } });
  expect(languageSelect).toHaveValue('ja');
});

it('should save settings and call onSaved callback', async () => {
  const onSaved = vi.fn();
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={onSaved} onClose={vi.fn()} />
    </I18nProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => {
    expect(onSaved).toHaveBeenCalled();
  });
});

it('should reset model check when provider changes', () => {
  render(
    <I18nProvider locale="en">
      <SettingsModal settings={mockSettings} currentLocale="en" onSaved={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>
  );
  const lmstudioLabel = screen.getByText('LM Studio').parentElement as HTMLLabelElement;
  const lmstudioRadio = lmstudioLabel.querySelector('input[type="radio"]') as HTMLInputElement;
  fireEvent.click(lmstudioRadio);
  expect(screen.queryByText('Model not checked')).toBeInTheDocument();
});
});