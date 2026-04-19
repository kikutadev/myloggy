import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';

test.describe('Electron App', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>;
  let window: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../dist-electron/electron/main.js')],
      executablePath: require('electron'),
    });
    window = await electronApp.firstWindow();
    await window.waitForTimeout(2000);
    const allWindows = await electronApp.windows();
    const appWindow = allWindows.find(w => !w.url().startsWith('devtools'));
    if (appWindow) window = appWindow;
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('SERVER001: Dev serverが起動してHTMLを返す', async () => {
    const body = window.locator('body');
    const content = await body.textContent();
    expect(content?.length).toBeGreaterThan(0);
  });

  test('SERVER002: index.htmlのタイトルが確認できる', async () => {
    const title = await window.title();
    expect(title).toBeTruthy();
    expect(title).toBe('My Loggy');
  });

  test('HTML001: #root要素が存在する', async () => {
    const root = window.locator('#root');
    await expect(root).toBeAttached({ timeout: 10000 });
  });

  test('ASSET001: JSファイルが読み込める', async () => {
    const responses: string[] = [];
    window.on('response', response => {
      if (response.url().endsWith('.js') || response.url().includes('/src/')) {
        responses.push(response.url());
      }
    });
    await window.goto(window.url());
    await window.waitForLoadState('networkidle');
    expect(responses.length).toBeGreaterThan(0);
  });

  test('ERROR001: 致命的なコンソールエラーがない', async () => {
    const errors: string[] = [];
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
    const fatalErrors = errors.filter(e =>
      !e.includes('net::') &&
      !e.includes('Failed to load resource') &&
      !e.includes('CORS') &&
      !e.includes('favicon') &&
      !e.includes('myloggy') &&
      !e.includes('bootstrap') &&
      !e.includes('DevTools') &&
      !e.includes('Extension context') &&
      !e.includes('protocol') &&
      !e.includes('webContents')
    );
    expect(fatalErrors.length).toBe(0);
  });
});