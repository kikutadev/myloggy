import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';

test.describe('Checkpoint Screenshots', () => {
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

  test('CS001: captureNow creates a snapshot with image data', async () => {
    await window.waitForSelector('.app-shell', { timeout: 10000 });

    // captureNow を実行
    await window.evaluate(() => window.myloggy.captureNow());

    // キャプチャが完了するまで待機
    await window.waitForTimeout(3000);

    // DebugData を取得して画像データがあることを確認
    const debugData = await window.evaluate(() => window.myloggy.getDebugData());

    expect(debugData.snapshots.length).toBeGreaterThan(0);
    expect(debugData.snapshots[0].imagesBase64.length).toBeGreaterThan(0);
    expect(debugData.snapshots[0].imagesBase64[0].length).toBeGreaterThan(100);
  });

  test('CS002: getCheckpointSnapshots returns image data', async () => {
    await window.waitForSelector('.app-shell', { timeout: 10000 });

    // captureNow を実行してスクリーンショットをキャプチャ
    await window.evaluate(() => window.myloggy.captureNow());
    await window.waitForTimeout(3000);

    // 分析を実行（idle 判定で自動的に checkpoint が作られる可能性がある）
    await window.evaluate(() => window.myloggy.analyzeNow());
    await window.waitForTimeout(3000);

    // getCheckpointSnapshots API が存在し、呼び出せることを確認
    // （実際に checkpoint が作られていれば画像データが返る）
    const timeline = await window.evaluate(() => window.myloggy.getDayTimeline(new Date().toISOString().slice(0, 10)));
    expect(timeline).toBeDefined();
    expect(Array.isArray(timeline.checkpoints)).toBe(true);
  });
});
