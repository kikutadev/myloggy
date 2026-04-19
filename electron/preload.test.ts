import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('preload.ts', () => {
  let contextBridgeMock: any;
  let ipcRendererMock: any;
  let exposedApi: any;

  beforeEach(async () => {
    vi.resetModules();

    const wrappedListeners = new Map();

    ipcRendererMock = {
      invoke: vi.fn(),
      on: vi.fn((channel: string, listener: (...args: any[]) => void) => {
        wrappedListeners.set(channel, listener);
      }),
      off: vi.fn((channel: string, listener: (...args: any[]) => void) => {
        wrappedListeners.delete(channel);
      }),
    };

    contextBridgeMock = {
      exposeInMainWorld: vi.fn((worldName: string, api: any) => {
        exposedApi = api;
      }),
    };

    vi.doMock('electron', () => ({
      contextBridge: contextBridgeMock,
      ipcRenderer: ipcRendererMock,
    }));

    await import('./preload.js');
  });

  it('window.myloggyにAPIが exposeされる', () => {
    expect(contextBridgeMock.exposeInMainWorld).toHaveBeenCalledWith('myloggy', expect.any(Object));
  });

  it('bootstrapメソッドが正しいチャンネル名でinvokeする', () => {
    exposedApi.bootstrap('2024-06-15');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('bootstrap', '2024-06-15');
  });

  it('getDashboardメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.getDashboard('2024-06-15');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('dashboard:get', '2024-06-15');
  });

  it('getDayTimelineメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.getDayTimeline('2024-06-15');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('timeline:day', '2024-06-15');
  });

  it('getWeekTimelineメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.getWeekTimeline('2024-06-15');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('timeline:week', '2024-06-15');
  });

  it('getMonthTimelineメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.getMonthTimeline('2024-06-15');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('timeline:month', '2024-06-15');
  });

  it('getSettingsメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.getSettings();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('settings:get');
  });

  it('updateSettingsメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.updateSettings({ isTracking: false });
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('settings:update', { isTracking: false });
  });

  it('toggleTrackingメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.toggleTracking(false);
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('tracking:toggle', false);
  });

  it('captureNowメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.captureNow();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('tracking:capture-now');
  });

  it('analyzeNowメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.analyzeNow();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('tracking:analyze-now');
  });

  it('clearPendingSnapshotsメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.clearPendingSnapshots();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('tracking:clear-pending');
  });

  it('clearErrorsメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.clearErrors();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('tracking:clear-errors');
  });

  it('updateWorkUnitメソッドが正しいチャンネル名でinvokeする', async () => {
    const patch = { id: 'w1', title: 'Updated' };
    await exposedApi.updateWorkUnit(patch);
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('work-unit:update', patch);
  });

  it('openDashboardメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.openDashboard();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('open-dashboard');
  });

  it('checkOllamaメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.checkOllama();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('ollama:check');
  });

  it('testModelメソッドが正しいチャンネル名でinvokeする', async () => {
    const params = { model: 'llama2', ollamaHost: 'http://localhost:11434' };
    await exposedApi.testModel(params);
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('ollama:test-model', params);
  });

  it('getDebugDataメソッドが正しいチャンネル名でinvokeする', async () => {
    await exposedApi.getDebugData();
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('debug:data');
  });

  describe('onSettingsChanged', () => {
    it('settings:changedイベントに登録する', () => {
      const listener = vi.fn();
      exposedApi.onSettingsChanged(listener);
      expect(ipcRendererMock.on).toHaveBeenCalledWith('settings:changed', expect.any(Function));
    });

    it('リスナー登録解除関数を返す', () => {
      const listener = vi.fn();
      const unsub = exposedApi.onSettingsChanged(listener);
      expect(typeof unsub).toBe('function');
    });

    it('登録解除関数を呼ぶとoffが呼ばれる', () => {
      const listener = vi.fn();
      const unsub = exposedApi.onSettingsChanged(listener);
      unsub();
      expect(ipcRendererMock.off).toHaveBeenCalledWith('settings:changed', expect.any(Function));
    });

    it('イベント発火時にリスナーにsettingsを渡す', () => {
      const listener = vi.fn();
      exposedApi.onSettingsChanged(listener);

      const registeredListener = ipcRendererMock.on.mock.calls.find(
        (call: any[]) => call[0] === 'settings:changed'
      )?.[1];

      const mockEvent = {} as Electron.IpcRendererEvent;
      const mockSettings = { isTracking: true, language: 'ja' };
      registeredListener(mockEvent, mockSettings);

      expect(listener).toHaveBeenCalledWith(mockSettings);
    });
  });

  describe('API完全性', () => {
    const requiredMethods = [
      'bootstrap',
      'getDashboard',
      'getDayTimeline',
      'getWeekTimeline',
      'getMonthTimeline',
      'onSettingsChanged',
      'getSettings',
      'updateSettings',
      'toggleTracking',
      'captureNow',
      'analyzeNow',
      'clearPendingSnapshots',
      'clearErrors',
      'updateWorkUnit',
      'openDashboard',
      'checkOllama',
      'testModel',
      'getDebugData',
    ];

    it('DesktopApiの全メソッドが存在する', () => {
      for (const method of requiredMethods) {
        expect(typeof exposedApi[method]).toBe('function');
      }
    });
  });
});