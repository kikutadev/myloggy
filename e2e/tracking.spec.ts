import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';

test.describe('Tracking', () => {
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

  test.describe('T001-T003: Tracking Toggle', () => {
    test('T001: Tracking button shows correct state', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const trackingBtn = window.locator('.top-bar-right button.btn-sm').last();
      await expect(trackingBtn).toBeVisible();
      const text = await trackingBtn.textContent();
      expect(text).toMatch(/停止中|Stopped|記録中|Tracking/);
    });

    test('T002: Toggle tracking state changes button text', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const trackingBtn = window.locator('.top-bar-right button.btn-sm').last();
      const initialText = await trackingBtn.textContent();
      const isInitiallyOn = /記録中|Tracking/.test(initialText ?? '');
      await trackingBtn.click();
      await window.waitForTimeout(500);
      const newText = await trackingBtn.textContent();
      if (isInitiallyOn) {
        expect(newText).toMatch(/停止中|Stopped/);
      } else {
        expect(newText).toMatch(/記録中|Tracking/);
      }
    });

    test('T003: Toggle tracking again reverts state', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const trackingBtn = window.locator('.top-bar-right button.btn-sm').last();
      const firstText = await trackingBtn.textContent();
      const wasInitiallyOn = /記録中|Tracking/.test(firstText ?? '');
      await trackingBtn.click();
      await window.waitForTimeout(500);
      await trackingBtn.click();
      await window.waitForTimeout(500);
      const finalText = await trackingBtn.textContent();
      if (wasInitiallyOn) {
        expect(finalText).toMatch(/記録中|Tracking/);
      } else {
        expect(finalText).toMatch(/停止中|Stopped/);
      }
    });
  });

  test.describe('C001-C002: Capture/Analysis', () => {
    test('C001: Analyze button is visible', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const analyzeBtn = window.locator('.top-bar-right button.btn-ghost.btn-sm', { hasText: /AI処理|AI/ });
      await expect(analyzeBtn).toBeVisible();
    });
  });

  test.describe('S001-S007: Settings Modal', () => {
    test('S001: Settings gear icon opens modal', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const settingsBtn = window.locator('button.btn-ghost.btn-icon', { hasText: '⚙' });
      await settingsBtn.click();
      const modal = window.locator('.modal-overlay .modal-content');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('S002: Language selector changes language', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const settingsBtn = window.locator('button.btn-ghost.btn-icon', { hasText: '⚙' });
      await settingsBtn.click();
      await window.waitForSelector('.modal-content', { timeout: 5000 });
      const langSelect = window.locator('.modal-content select').first();
      const initialLang = await langSelect.inputValue();
      await langSelect.selectOption(initialLang === 'ja' ? 'en' : 'ja');
      await window.waitForTimeout(300);
      const newLang = await langSelect.inputValue();
      expect(newLang).not.toBe(initialLang);
    });

    test('S006: X button closes modal', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const settingsBtn = window.locator('button.btn-ghost.btn-icon', { hasText: '⚙' });
      await settingsBtn.click();
      await window.waitForSelector('.modal-content', { timeout: 5000 });
      const closeBtn = window.locator('.modal-header button.btn-ghost', { hasText: /✕/ });
      await closeBtn.click();
      await window.waitForTimeout(300);
      const modal = window.locator('.modal-overlay .modal-content');
      await expect(modal).not.toBeVisible();
    });

    test('S007: Clicking overlay closes modal', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const settingsBtn = window.locator('button.btn-ghost.btn-icon', { hasText: '⚙' });
      await settingsBtn.click();
      await window.waitForSelector('.modal-content', { timeout: 5000 });
      const overlay = window.locator('.modal-overlay');
      await overlay.click({ position: { x: 10, y: 10 } });
      await window.waitForTimeout(300);
      const modal = window.locator('.modal-overlay .modal-content');
      await expect(modal).not.toBeVisible();
    });
  });
});