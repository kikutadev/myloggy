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

describe('window-manager.ts', () => {
  beforeEach(() => {
    mockBrowserWindowInstances.length = 0;
    vi.resetModules();
  });

  describe('broadcastSettingsChanged', () => {
    it('両ウィンドウに設定変更を送信する', async () => {
      const { broadcastSettingsChanged, createMainWindow, createMiniWindow } = await import('./window-manager.js');

      createMainWindow();
      createMiniWindow();

      const win1 = mockBrowserWindowInstances[0];
      const win2 = mockBrowserWindowInstances[1];

      broadcastSettingsChanged({ isTracking: true } as any);

      expect(win1.webContents.send).toHaveBeenCalledWith('settings:changed', { isTracking: true });
      expect(win2.webContents.send).toHaveBeenCalledWith('settings:changed', { isTracking: true });
    });

    it('破棄されたウィンドウには送信しない', async () => {
      const { broadcastSettingsChanged, createMainWindow } = await import('./window-manager.js');

      const win = createMainWindow();
      win._isDestroyed = true;

      broadcastSettingsChanged({ isTracking: true } as any);

      expect(win.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('getTrayIconPath', () => {
    it('resourcesディレクトリのパスを返す', async () => {
      const { getTrayIconPath } = await import('./window-manager.js');

      const path = getTrayIconPath();

      expect(path).toContain('resources');
      expect(path).toContain('trayIconTemplate.png');
    });

    it('アイコンが存在しない場合は作成する', async () => {
      const fs = await import('node:fs');
      const { getTrayIconPath } = await import('./window-manager.js');

      getTrayIconPath();

      expect(fs.default.mkdirSync).toHaveBeenCalled();
      expect(fs.default.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('createMainWindow', () => {
    it('メインウィンドウを作成する', async () => {
      const { createMainWindow } = await import('./window-manager.js');

      const win = createMainWindow();

      expect(win).toBeDefined();
      expect(win.loadURL).toHaveBeenCalled();
    });

    it('ウィンドウを返す', async () => {
      const { createMainWindow, getMainWindow } = await import('./window-manager.js');

      const win = createMainWindow();
      const retrievedWin = getMainWindow();

      expect(win).toBe(retrievedWin);
    });
  });

  describe('createMiniWindow', () => {
    it('ミニウィンドウを作成する', async () => {
      const { createMiniWindow } = await import('./window-manager.js');

      const win = createMiniWindow();

      expect(win).toBeDefined();
      expect(win.loadURL).toHaveBeenCalledWith(expect.stringContaining('mini.html'));
    });

    it('フォーカスを失ったときに非表示にする', async () => {
      const { createMiniWindow } = await import('./window-manager.js');

      const win = createMiniWindow();

      const blurHandler = win.on.mock.calls.find((call: any[]) => call[0] === 'blur')?.[1];
      expect(blurHandler).toBeDefined();

      blurHandler();
      expect(win.hide).toHaveBeenCalled();
    });
  });

  describe('createTray', () => {
    it('トレイアイコンを作成し、ツールチップを設定する', async () => {
      const electron = await import('electron');
      const { createTray } = await import('./window-manager.js');

      createTray();

      expect(electron.nativeImage.createFromPath).toHaveBeenCalled();
      expect(electron.nativeImage.createFromPath).toHaveBeenCalledWith(expect.any(String));
    });
  });
});

describe('ipc-handlers.ts', () => {
  let mockTracker: any;

  beforeEach(() => {
    mockBrowserWindowInstances.length = 0;
    mockIpcMain.handle = vi.fn();
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
    vi.resetModules();
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
    mockBrowserWindowInstances.length = 0;
    mockIpcMain.handle = vi.fn();
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
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
    mockBrowserWindowInstances.length = 0;
    mockIpcMain.handle = vi.fn();
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
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