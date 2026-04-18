import { describe, it, expect, vi, beforeEach } from 'vitest';

const execFileMock = vi.fn();

vi.mock('electron', () => ({
  screen: {
    getCursorScreenPoint: vi.fn(() => ({ x: 100, y: 200 })),
    getAllDisplays: vi.fn(() => [
      { id: 1, bounds: { width: 1920, height: 1080, x: 0, y: 0 } },
    ]),
    getDisplayNearestPoint: vi.fn(() => ({ id: 1, bounds: { width: 1920, height: 1080, x: 0, y: 0 } })),
  },
}));

vi.mock('node:child_process', () => ({
  default: {
    execFile: (...args: any[]) => execFileMock(...args),
  },
}));

vi.mock('node:util', () => ({
  default: {
    promisify: (fn: Function) => fn,
  },
}));

import { collectMetadata } from './metadata.js';

describe('collectMetadata', () => {
  beforeEach(() => {
    execFileMock.mockClear();
    execFileMock.mockImplementation(() => Promise.resolve({ stdout: '', stderr: '' }));
  });

  it('カーソル位置を取得', async () => {
    const result = await collectMetadata();

    expect(result.cursorX).toBe(100);
    expect(result.cursorY).toBe(200);
    expect(result.cursorDisplayId).toBe(1);
    expect(result.cursorDisplayIndex).toBe(1);
  });

  it('metadataJsonにJSON形式で情報が格納される', async () => {
    const result = await collectMetadata();
    const parsed = JSON.parse(result.metadataJson);

    expect(parsed.cursorX).toBe(100);
    expect(parsed.cursorY).toBe(200);
  });

  it('アクティブなアプリとウィンドウを取得', async () => {
    execFileMock.mockImplementationOnce(() => 
      Promise.resolve({ stdout: 'VS Code\ntest.ts', stderr: '' })
    );

    const result = await collectMetadata();

    expect(result.activeApp).toBe('VS Code');
    expect(result.windowTitle).toBe('test.ts');
  });

  it('ブラウザのURLとタイトルを取得 (Chrome)', async () => {
    let callCount = 0;
    execFileMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ stdout: 'Google Chrome\n-', stderr: '' });
      }
      return Promise.resolve({ stdout: 'https://github.com\nGitHub', stderr: '' });
    });

    const result = await collectMetadata();

    expect(result.activeApp).toBe('Google Chrome');
    expect(result.url).toBe('https://github.com');
    expect(result.pageTitle).toBe('GitHub');
  });

  it('SafariのURLとタイトルを取得', async () => {
    let callCount = 0;
    execFileMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ stdout: 'Safari\n-', stderr: '' });
      }
      return Promise.resolve({ stdout: 'https://example.com\nExample', stderr: '' });
    });

    const result = await collectMetadata();

    expect(result.activeApp).toBe('Safari');
    expect(result.url).toBe('https://example.com');
    expect(result.pageTitle).toBe('Example');
  });

  it('非ブラウザ 앱はURL null', async () => {
    execFileMock.mockImplementationOnce(() => 
      Promise.resolve({ stdout: 'Terminal\nbash', stderr: '' })
    );

    const result = await collectMetadata();

    expect(result.url).toBeNull();
    expect(result.pageTitle).toBeNull();
  });

  it('AppleScriptエラー時はnullを返す', async () => {
    execFileMock.mockRejectedValueOnce(new Error('script failed'));

    const result = await collectMetadata();

    expect(result.activeApp).toBeNull();
    expect(result.windowTitle).toBeNull();
  });
});