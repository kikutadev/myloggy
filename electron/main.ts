import path from 'node:path';
import fs from 'node:fs';

import { app, BrowserWindow, ipcMain, nativeImage, Tray } from 'electron';

import { normalizeLocale } from '../shared/localization.js';
import type { AppSettings } from '../shared/types.js';
import { TrackerService } from './core/tracker-service.js';
import { createMainWindow, createMiniWindow, createTray, broadcastSettingsChanged, getMainWindow } from './window-manager.js';
import { registerIpcHandlers } from './ipc-handlers.js';

// 開発モード判定: パッケージ化されていない場合は開発モード
const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

// アプリケーションの状態管理
let tracker: TrackerService | null = null;
let mainWindow: BrowserWindow | null = null;

// アプリケーション起動時の初期化
app.whenReady().then(() => {
  tracker = new TrackerService(path.join(app.getPath('userData'), 'myloggy-data'), normalizeLocale(app.getLocale()));
  tracker.start();

  createTray();
  mainWindow = createMainWindow(devServerUrl);

  // macOS: Dockアイコンクリック時にウィンドウを表示/作成
  app.on('activate', () => {
    if (!mainWindow) {
      mainWindow = createMainWindow(devServerUrl);
    } else {
      mainWindow.show();
    }
  });

  // IPCハンドラを登録（trackerが必要なのでここで呼び出し）
  registerIpcHandlers(
    tracker,
    () => mainWindow,
    (settings: AppSettings) => broadcastSettingsChanged(settings),
    () => { mainWindow = createMainWindow(devServerUrl); }
  );
});

// Windows/Linux: すべてのウィンドウが閉じたらアプリを終了
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 終了前にtrackerをクリーンアップ
app.on('before-quit', () => {
  tracker?.dispose();
});

// テスト用エクスポート
export { tracker };