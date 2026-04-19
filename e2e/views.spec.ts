import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';

test.describe('Views', () => {
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

  test.describe('V001-V004: View Switching', () => {
    test('V001: Default view is Day', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const dayTab = window.locator('button.tab.active');
      await expect(dayTab).toBeVisible();
      const dayTabText = await dayTab.textContent();
      expect(dayTabText).toMatch(/日次|Day/);
    });

    test('V002: Week tab switches to Week view', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const weekTab = window.locator('button.tab', { hasText: /週次|Week/ });
      await weekTab.click();
      const weekTabActive = window.locator('button.tab.active', { hasText: /週次|Week/ });
      await expect(weekTabActive).toBeVisible();
    });

    test('V003: Month tab switches to Month view', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const monthTab = window.locator('button.tab', { hasText: /月次|Month/ });
      await monthTab.click();
      const monthTabActive = window.locator('button.tab.active', { hasText: /月次|Month/ });
      await expect(monthTabActive).toBeVisible();
    });

    test('V004: Day tab returns to Day view', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const weekTab = window.locator('button.tab', { hasText: /週次|Week/ });
      await weekTab.click();
      const dayTab = window.locator('button.tab', { hasText: /日次|Day/ });
      await dayTab.click();
      const dayTabActive = window.locator('button.tab.active', { hasText: /日次|Day/ });
      await expect(dayTabActive).toBeVisible();
    });
  });

  test.describe('N001-N003: Date Navigation', () => {
    test('N001: Left arrow navigates to previous day', async () => {
      await window.waitForSelector('.app-shell', { timeout: 10000 });
      const dateLabel = window.locator('.date-label');
      const initialDate = await dateLabel.textContent();
      const leftBtn = window.locator('button.btn-ghost.btn-icon').first();
      await leftBtn.click();
      const newDate = await dateLabel.textContent();
      expect(newDate).not.toBe(initialDate);
    });

test('N002: Right arrow navigates to next day', async () => {
    await window.waitForSelector('.app-shell', { timeout: 10000 });
    await window.waitForLoadState('networkidle');
    const dateLabel = window.locator('.date-label');
    const initialDate = await dateLabel.textContent();
    const rightBtn = window.locator('.top-bar-center button.btn-ghost.btn-icon').last();
    await rightBtn.click();
    await window.waitForTimeout(500);
    const newDate = await dateLabel.textContent();
    expect(newDate).not.toBe(initialDate);
  });

  test('N003: Today button navigates to today', async () => {
    await window.waitForSelector('.app-shell', { timeout: 10000 });
    const leftBtn = window.locator('button.btn-ghost.btn-icon').first();
    await leftBtn.click();
    await window.waitForTimeout(300);
    await leftBtn.click();
    await window.waitForTimeout(300);
    await leftBtn.click();
    await window.waitForTimeout(300);
    const todayBtn = window.locator('button.btn-ghost.btn-sm', { hasText: /今日|Today/ });
    await todayBtn.click();
    await window.waitForTimeout(500);
    const dateLabel = window.locator('.date-label');
    const dateText = await dateLabel.textContent();
    const today = new Date();
    const todayStr = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    expect(dateText).toBe(todayStr);
  });
  });
});