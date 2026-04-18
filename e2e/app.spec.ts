import { test, expect } from '@playwright/test';

test.describe('Vite Dev Server', () => {
  test('SERVER001: Dev serverが起動してHTMLを返す', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const body = page.locator('body');
    const content = await body.textContent();
    expect(content?.length).toBeGreaterThan(0);
  });

  test('SERVER002: index.htmlのタイトルが確認できる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('HTML構造', () => {
  test('HTML001: #root要素が存在する', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});

test.describe('アセット読み込み', () => {
  test('ASSET001: JSファイルが読み込める', async ({ page }) => {
    const responses: string[] = [];
    page.on('response', response => {
      if (response.url().endsWith('.js') || response.url().includes('/src/')) {
        responses.push(response.url());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    expect(responses.length).toBeGreaterThan(0);
  });
});

test.describe('コンソールエラー', () => {
  test('ERROR001: 致命的なコンソールエラーがない', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const fatalErrors = errors.filter(e => 
      !e.includes('net::') && 
      !e.includes('Failed to load resource') &&
      !e.includes('CORS') &&
      !e.includes('favicon') &&
      !e.includes('myloggy') &&
      !e.includes('bootstrap')
    );
    
    expect(fatalErrors.length).toBe(0);
  });
});