import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockIpcMain: any;

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/test/userData'),
    getLocale: vi.fn(() => 'en-US'),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: class {
    loadURL = vi.fn(() => Promise.resolve());
    loadFile = vi.fn(() => Promise.resolve());
    openDevTools = vi.fn();
    on = vi.fn();
    show = vi.fn();
    hide = vi.fn();
    focus = vi.fn();
    isVisible = vi.fn(() => false);
    webContents = { send: vi.fn(), openDevTools: vi.fn() };
    setPosition = vi.fn();
    getBounds = vi.fn(() => ({ x: 100, y: 100, width: 300, height: 200 }));
  },
  ipcMain: {
    handle: vi.fn(),
  },
  nativeImage: {
    createFromPath: vi.fn(() => ({ setTemplateImage: vi.fn() })),
    createFromBuffer: vi.fn(() => ({ toPNG: vi.fn(() => Buffer.from('png-data')) })),
  },
  Tray: class {
    setToolTip = vi.fn();
    on = vi.fn();
  },
}));

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

describe('ipc-handlers.ts', () => {
  let mockTracker: any;

  beforeEach(() => {
    mockIpcMain = { handle: vi.fn() };
    vi.resetModules();
    vi.doMock('electron', () => ({
      app: {
        isPackaged: false,
        getPath: vi.fn(() => '/test/userData'),
        getLocale: vi.fn(() => 'en-US'),
        whenReady: vi.fn(() => Promise.resolve()),
        on: vi.fn(),
        quit: vi.fn(),
      },
      BrowserWindow: class {
        loadURL = vi.fn(() => Promise.resolve());
        on = vi.fn();
        show = vi.fn();
        webContents = { send: vi.fn() };
      },
      ipcMain: mockIpcMain,
      nativeImage: { createFromPath: vi.fn(() => ({ setTemplateImage: vi.fn() })) },
      Tray: class { setToolTip = vi.fn(); on = vi.fn() },
    }));
    mockTracker = {
      getBootstrap: vi.fn(() => ({ locale: 'en', state: {}, settings: {} })),
      getDashboard: vi.fn(() => ({ date: '2024-01-01', totalMinutes: 0, units: [], categorySummary: [], projectSummary: [] })),
      getDayTimeline: vi.fn(() => ({ date: '2024-01-01', units: [], checkpoints: [], categorySummary: [], projectSummary: [], totalMinutes: 0 })),
      getWeekTimeline: vi.fn(() => ({ startDate: '2024-01-01', endDate: '2024-01-07', units: [], categorySummary: [], projectSummary: [], longestUnits: [], totalMinutes: 0, distractedCount: 0 })),
      getMonthTimeline: vi.fn(() => ({ month: '2024-01', days: [], categorySummary: [], projectSummary: [], comment: '' })),
      getSettings: vi.fn(() => ({ isTracking: true, ollamaHost: 'http://localhost:11434' })),
      updateSettings: vi.fn(() => ({ isTracking: false, ollamaHost: 'http://localhost:11434', language: 'ja' })),
      setTracking: vi.fn(() => ({ isTracking: false })),
      captureNow: vi.fn(() => Promise.resolve({ isTracking: false })),
      analyzeNow: vi.fn(() => Promise.resolve({ isTracking: false })),
      clearPendingSnapshots: vi.fn(() => Promise.resolve({ isTracking: true })),
      clearErrors: vi.fn(() => ({ isTracking: true })),
      updateWorkUnit: vi.fn(() => ({ id: 'w1', title: 'Test' } as any)),
      getDebugData: vi.fn(() => ({ snapshots: [], errors: [] })),
    };
  });

  it('registerIpcHandlersが全てのIPCハンドラを登録する', async () => {
    const { registerIpcHandlers } = await import('./ipc-handlers.js');

    registerIpcHandlers(mockTracker, () => null, vi.fn());

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

  it('bootstrapハンドラがtracker.getBootstrapを呼ぶ', async () => {
    const { registerIpcHandlers } = await import('./ipc-handlers.js');

    registerIpcHandlers(mockTracker, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'bootstrap')?.[1];
    const result = await handler(null, '2024-06-15');

    expect(mockTracker.getBootstrap).toHaveBeenCalledWith('2024-06-15');
    expect(result).toEqual({ locale: 'en', state: {}, settings: {} });
  });

  it('settings:updateハンドラが更新後にbroadcastSettingsChangedを呼ぶ', async () => {
    const broadcast = vi.fn();
    const { registerIpcHandlers } = await import('./ipc-handlers.js');

    registerIpcHandlers(mockTracker, () => null, broadcast);

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'settings:update')?.[1];
    await handler(null, { isTracking: false });

    expect(mockTracker.updateSettings).toHaveBeenCalledWith({ isTracking: false });
    expect(broadcast).toHaveBeenCalledWith({ isTracking: false, ollamaHost: 'http://localhost:11434', language: 'ja' });
  });

  it('tracking:toggleハンドラがtracker.setTrackingを呼ぶ', async () => {
    const { registerIpcHandlers } = await import('./ipc-handlers.js');

    registerIpcHandlers(mockTracker, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'tracking:toggle')?.[1];
    await handler(null, false);

    expect(mockTracker.setTracking).toHaveBeenCalledWith(false);
  });

  it('dashboard:getハンドラがtracker.getDashboardを呼ぶ', async () => {
    const { registerIpcHandlers } = await import('./ipc-handlers.js');

    registerIpcHandlers(mockTracker, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'dashboard:get')?.[1];
    const result = await handler(null, '2024-06-15');

    expect(mockTracker.getDashboard).toHaveBeenCalledWith('2024-06-15');
  });

  it('timeline:dayハンドラがtracker.getDayTimelineを呼ぶ', async () => {
    const { registerIpcHandlers } = await import('./ipc-handlers.js');

    registerIpcHandlers(mockTracker, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'timeline:day')?.[1];
    const result = await handler(null, '2024-06-15');

    expect(mockTracker.getDayTimeline).toHaveBeenCalledWith('2024-06-15');
  });
});

describe('ollama:check ハンドラ', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockIpcMain = { handle: vi.fn() };
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.doMock('electron', () => ({
      app: { isPackaged: false, getPath: vi.fn(() => '/test/userData'), getLocale: vi.fn(() => 'en-US'), whenReady: vi.fn(() => Promise.resolve()), on: vi.fn(), quit: vi.fn() },
      BrowserWindow: class { loadURL = vi.fn(() => Promise.resolve()); on = vi.fn(); show = vi.fn(); webContents = { send: vi.fn() } },
      ipcMain: mockIpcMain,
      nativeImage: { createFromPath: vi.fn(() => ({ setTemplateImage: vi.fn() })) },
      Tray: class { setToolTip = vi.fn(); on = vi.fn() },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Ollamaが起動している場合running:trueとモデルリストを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama2' }, { name: 'codellama' }] }),
    });

    const { registerIpcHandlers } = await import('./ipc-handlers.js');
    const mockTracker = { getSettings: vi.fn(() => ({ ollamaHost: 'http://localhost:11434' })) };
    registerIpcHandlers(mockTracker as any, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    const result = await handler(null);

    expect(result).toEqual({ running: true, models: ['llama2', 'codellama'] });
  });

  it('Ollamaが起動していない場合running:falseを返す', async () => {
    fetchMock.mockRejectedValue(new Error('Connection refused'));
    const { registerIpcHandlers } = await import('./ipc-handlers.js');
    const mockTracker = { getSettings: vi.fn(() => ({ ollamaHost: 'http://localhost:11434' })) };
    registerIpcHandlers(mockTracker as any, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:check')?.[1];
    const result = await handler(null);

    expect(result).toEqual({ running: false, models: [] });
  });
});

describe('ollama:test-model ハンドラ', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockIpcMain = { handle: vi.fn() };
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.doMock('electron', () => ({
      app: { isPackaged: false, getPath: vi.fn(() => '/test/userData'), getLocale: vi.fn(() => 'en-US'), whenReady: vi.fn(() => Promise.resolve()), on: vi.fn(), quit: vi.fn() },
      BrowserWindow: class { loadURL = vi.fn(() => Promise.resolve()); on = vi.fn(); show = vi.fn(); webContents = { send: vi.fn() } },
      ipcMain: mockIpcMain,
      nativeImage: { createFromPath: vi.fn(() => ({ setTemplateImage: vi.fn() })) },
      Tray: class { setToolTip = vi.fn(); on = vi.fn() },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('モデルをテストして成功した場合ok:trueを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'OK' }),
    });

    const { registerIpcHandlers } = await import('./ipc-handlers.js');
    registerIpcHandlers({ getSettings: vi.fn() } as any, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: true, message: 'Model responded successfully.' });
  });

  it('エラーレスポンスの場合ok:falseを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Model not found' }),
    });

    const { registerIpcHandlers } = await import('./ipc-handlers.js');
    registerIpcHandlers({ getSettings: vi.fn() } as any, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'nonexistent', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: false, message: 'Model not found' });
  });

  it('例外が発生した場合ok:falseを返す', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    const { registerIpcHandlers } = await import('./ipc-handlers.js');
    registerIpcHandlers({ getSettings: vi.fn() } as any, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    const result = await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    expect(result).toEqual({ ok: false, message: 'Network error' });
  });

  it('低温設定でリクエストを送信する', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'OK' }),
    });

    const { registerIpcHandlers } = await import('./ipc-handlers.js');
    registerIpcHandlers({ getSettings: vi.fn() } as any, () => null, vi.fn());

    const handler = mockIpcMain.handle.mock.calls.find((call: any[]) => call[0] === 'ollama:test-model')?.[1];
    await handler(null, { model: 'llama2', ollamaHost: 'http://localhost:11434' });

    const fetchCall = fetchMock.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.options).toEqual({ temperature: 0, num_predict: 8 });
  });
});