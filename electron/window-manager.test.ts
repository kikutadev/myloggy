import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('electron', () => {
  return {
    app: {
      isPackaged: false,
      getPath: vi.fn(() => '/test/userData'),
      getLocale: vi.fn(() => 'en-US'),
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      quit: vi.fn(),
    },
    BrowserWindow: MockBrowserWindow,
    ipcMain: { handle: vi.fn() },
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