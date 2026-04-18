import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class MockTray {
  setToolTip = vi.fn();
  on = vi.fn((event: string, handler: Function) => {
    if (event === 'click') {
      this._clickHandler = handler;
    }
  });
  _clickHandler?: Function;
}

const mockBrowserWindowInstances: any[] = [];

class MockBrowserWindow {
  loadURL = vi.fn(() => Promise.resolve());
  loadFile = vi.fn(() => Promise.resolve());
  openDevTools = vi.fn();
  on = vi.fn();
  show = vi.fn();
  hide = vi.fn();
  focus = vi.fn();
  isVisible = vi.fn(() => false);
  _isDestroyed = false;
  isDestroyed = vi.fn(() => this._isDestroyed);
  webContents = {
    send: vi.fn(),
    openDevTools: vi.fn(),
  };
  setPosition = vi.fn();
  getBounds = vi.fn(() => ({ x: 100, y: 100, width: 300, height: 200 }));

  constructor() {
    mockBrowserWindowInstances.push(this);
  }
}

let mockApp: any;
let mockIpcMain: any;

vi.mock('electron', () => {
  mockApp = {
    isPackaged: false,
    getPath: vi.fn(() => '/test/userData'),
    getLocale: vi.fn(() => 'en-US'),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
  };
  mockIpcMain = {
    handle: vi.fn(),
  };
  return {
    app: mockApp,
    BrowserWindow: MockBrowserWindow,
    ipcMain: mockIpcMain,
    nativeImage: {
      createFromPath: vi.fn(() => ({
        setTemplateImage: vi.fn(),
      })),
      createFromBuffer: vi.fn(() => ({
        toPNG: vi.fn(() => Buffer.from('png-data')),
      })),
    },
    Tray: MockTray,
  };
});

vi.mock('./core/tracker-service.js', () => ({
  TrackerService: class {
    start = vi.fn();
    dispose = vi.fn();
    getBootstrap = vi.fn(() => ({ locale: 'en', state: {}, settings: {} }));
    getDashboard = vi.fn(() => ({ date: '2024-01-01', totalMinutes: 0, units: [], categorySummary: [], projectSummary: [] }));
    getDayTimeline = vi.fn(() => ({ date: '2024-01-01', units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 }));
    getWeekTimeline = vi.fn(() => ({ startDate: '2024-01-01', endDate: '2024-01-07', units: [], categorySummary: [], projectSummary: [], longestUnits: [], totalMinutes: 0, distractedCount: 0 }));
    getMonthTimeline = vi.fn(() => ({ month: '2024-01', days: [], categorySummary: [], projectSummary: [], comment: '' }));
    getSettings = vi.fn(() => ({ isTracking: true, ollamaHost: 'http://localhost:11434' }));
    updateSettings = vi.fn(() => ({ isTracking: false, ollamaHost: 'http://localhost:11434', language: 'ja' }));
    setTracking = vi.fn(() => ({ isTracking: false }));
    captureNow = vi.fn(() => Promise.resolve({ isTracking: false }));
    analyzeNow = vi.fn(() => Promise.resolve({ isTracking: false }));
    clearPendingSnapshots = vi.fn(() => Promise.resolve({ isTracking: true }));
    clearErrors = vi.fn(() => ({ isTracking: true }));
    updateWorkUnit = vi.fn(() => ({ id: 'w1', title: 'Test', category: 'dev', progressLevel: 0, userEdited: false, updatedAt: '', note: '' } as any));
    getDebugData = vi.fn(() => ({ snapshots: [], errors: [] }));

    constructor() {}
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
  },
}));

vi.mock('../shared/localization.js', () => ({
  normalizeLocale: vi.fn(() => 'en'),
}));

describe('electron/main.ts 振る舞いテスト', () => {
  beforeEach(() => {
    mockBrowserWindowInstances.length = 0;
    vi.resetModules();
  });

  describe('IPCハンドラ登録', () => {
    it('全てのIPCハンドラが登録されている', async () => {
      await import('./main.js');

      const handlerNames = [
        'bootstrap',
        'dashboard:get',
        'timeline:day',
        'timeline:week',
        'timeline:month',
        'settings:get',
        'settings:update',
        'tracking:toggle',
        'tracking:capture-now',
        'tracking:analyze-now',
        'tracking:clear-pending',
        'tracking:clear-errors',
        'work-unit:update',
        'open-dashboard',
        'debug:data',
        'ollama:check',
        'ollama:test-model',
      ];

      for (const name of handlerNames) {
        const hasHandler = mockIpcMain.handle.mock.calls.some((call: any[]) => call[0] === name);
        expect(hasHandler).toBe(true);
      }
    });
  });

  describe('bootstrap ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'bootstrap')?.[1];

      const result = await handler(null, '2024-06-15');

      expect(result).toEqual({ locale: 'en', state: {}, settings: {} });
    });
  });

  describe('dashboard:get ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'dashboard:get')?.[1];

      const result = await handler(null, '2024-06-15');

      expect(result).toEqual({ date: '2024-01-01', totalMinutes: 0, units: [], categorySummary: [], projectSummary: [] });
    });
  });

  describe('settings:update ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'settings:update')?.[1];

      const result = await handler(null, { isTracking: false, language: 'ja' });

      expect(result).toEqual({ isTracking: false, ollamaHost: 'http://localhost:11434', language: 'ja' });
    });
  });

  describe('tracking:toggle ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'tracking:toggle')?.[1];

      const result = await handler(null, true);

      expect(result).toEqual({ isTracking: false });
    });
  });

  describe('tracking:capture-now ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'tracking:capture-now')?.[1];

      const result = await handler(null);

      expect(result).toEqual({ isTracking: false });
    });
  });

  describe('tracking:analyze-now ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'tracking:analyze-now')?.[1];

      const result = await handler(null);

      expect(result).toEqual({ isTracking: false });
    });
  });

  describe('tracking:clear-pending ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'tracking:clear-pending')?.[1];

      const result = await handler(null);

      expect(result).toEqual({ isTracking: true });
    });
  });

  describe('tracking:clear-errors ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'tracking:clear-errors')?.[1];

      const result = await handler(null);

      expect(result).toEqual({ isTracking: true });
    });
  });

  describe('work-unit:update ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'work-unit:update')?.[1];

      const patch = { id: 'w1', title: 'Updated Title' };
      const result = await handler(null, patch);

      expect(result).toEqual({ id: 'w1', title: 'Test', category: 'dev', progressLevel: 0, userEdited: false, updatedAt: '', note: '' });
    });
  });

  describe('open-dashboard ハンドラ', () => {
    it('ウィンドウを作成する', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'open-dashboard')?.[1];

      await handler();

      expect(mockBrowserWindowInstances.length).toBeGreaterThan(0);
    });
  });

  describe('timeline ハンドラ', () => {
    it('timeline:day 正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'timeline:day')?.[1];

      const result = await handler(null, '2024-06-15');

      expect(result).toEqual({ date: '2024-01-01', units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 });
    });

    it('timeline:week 正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'timeline:week')?.[1];

      const result = await handler(null, '2024-06-15');

      expect(result).toEqual({ startDate: '2024-01-01', endDate: '2024-01-07', units: [], categorySummary: [], projectSummary: [], longestUnits: [], totalMinutes: 0, distractedCount: 0 });
    });

    it('timeline:month 正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'timeline:month')?.[1];

      const result = await handler(null, '2024-06');

      expect(result).toEqual({ month: '2024-01', days: [], categorySummary: [], projectSummary: [], comment: '' });
    });
  });

  describe('debug:data ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'debug:data')?.[1];

      const result = await handler(null);

      expect(result).toEqual({ snapshots: [], errors: [] });
    });
  });

  describe('settings:get ハンドラ', () => {
    it('正しい戻り値を返す', async () => {
      await import('./main.js');

      const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'settings:get')?.[1];

      const result = await handler(null);

      expect(result).toEqual({ isTracking: true, ollamaHost: 'http://localhost:11434' });
    });
  });
});

describe('ollama:check ハンドラ', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await import('./main.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Ollamaが起動している場合running:trueとモデルリストを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama2' }, { name: 'codellama' }] }),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    const result = await handler(null);

    expect(result).toEqual({ running: true, models: ['llama2', 'codellama'] });
  });

  it('Ollamaが起動していない場合running:falseを返す', async () => {
    fetchMock.mockRejectedValue(new Error('Connection refused'));

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    const result = await handler(null);

    expect(result).toEqual({ running: false, models: [] });
  });

  it('Ollamaがエラーレスポンスを返した場合running:falseを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    const result = await handler(null);

    expect(result).toEqual({ running: false, models: [] });
  });

  it('modelsがない場合は空配列を返す', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    const result = await handler(null);

    expect(result).toEqual({ running: true, models: [] });
  });

  it('settingsのollamaHostを使用する', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    await handler(null);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.any(Object)
    );
  });
});

describe('ollama:test-model ハンドラ', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await import('./main.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('モデルをテストして成功した場合ok:trueを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'OK' }),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: true, message: 'Model responded successfully.' });
  });

  it('APIに正しいリクエストを送信する', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'OK' }),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const fetchCall = fetchMock.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.model).toBe('llama2');
    expect(body.prompt).toBe('Reply with OK.');
    expect(body.stream).toBe(false);
    expect(body.options).toEqual({ temperature: 0, num_predict: 8 });
  });

  it('エラーレスポンスの場合ok:falseを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Model not found' }),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'nonexistent', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: false, message: 'Model not found' });
  });

  it('HTTPエラーの場合ステータスコードをメッセージに含める', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: false, message: 'HTTP 404' });
  });

  it('例外が発生した場合ok:falseを返す', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: false, message: 'Network error' });
  });
});