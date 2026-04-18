import path from 'node:path';
import fs from 'node:fs';
import { BrowserWindow, nativeImage, Tray } from 'electron';
import type { AppSettings } from '../shared/types.js';

const isDev = process.env.NODE_ENV !== 'production' || !require('electron').app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

export function broadcastSettingsChanged(settings: AppSettings): void {
  for (const win of [mainWindow, miniWindow]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('settings:changed', settings);
    }
  }
}

export function getTrayIconPath(): string {
  const electron = require('electron');
  const app = electron.app;
  const resourceDir = isDev
    ? path.join(__dirname, '../../resources')
    : path.join(process.resourcesPath, 'resources');
  const iconPath = path.join(resourceDir, 'trayIconTemplate.png');
  if (!fs.existsSync(iconPath)) {
    fs.mkdirSync(resourceDir, { recursive: true });
    const size = 22;
    const buf = Buffer.alloc(size * size * 4, 0);
    const cx = size / 2;
    const cy = size / 2;
    const r = 4;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= r) {
          const idx = (y * size + x) * 4;
          buf[idx] = 0;
          buf[idx + 1] = 0;
          buf[idx + 2] = 0;
          buf[idx + 3] = 255;
        }
      }
    }
    const img = nativeImage.createFromBuffer(buf, { width: size, height: size });
    fs.writeFileSync(iconPath, img.toPNG());
  }
  return iconPath;
}

export function createMainWindow(devServerUrl?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 680,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f4f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = devServerUrl ?? process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';

  if (isDev) {
    void win.loadURL(url);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.on('closed', () => { mainWindow = null; });
  mainWindow = win;
  return win;
}

export function createMiniWindow(devServerUrl?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 300,
    height: 200,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = devServerUrl ?? process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';

  if (isDev) {
    void win.loadURL(`${url}/mini.html`);
  } else {
    void win.loadFile(path.join(__dirname, '../../dist/mini.html'));
  }

  win.on('blur', () => { win.hide(); });
  win.on('closed', () => { miniWindow = null; });
  miniWindow = win;
  return win;
}

export function createTray(): void {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('My Loggy');

  tray.on('click', (_event, bounds) => {
    if (!miniWindow) {
      miniWindow = createMiniWindow();
    }
    if (miniWindow.isVisible()) {
      miniWindow.hide();
      return;
    }
    const { x, y } = bounds;
    const { width } = miniWindow.getBounds();
    miniWindow.setPosition(Math.round(x - width / 2), y);
    miniWindow.show();
  });
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getMiniWindow(): BrowserWindow | null {
  return miniWindow;
}