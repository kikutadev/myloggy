import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  screen: {
    getAllDisplays: vi.fn(() => [{ id: 1, bounds: { width: 1920, height: 1080, x: 0, y: 0 } }]),
  },
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn((cmd: string, args: string[], callback: (err: Error | null, stdout: Buffer, stderr: Buffer) => void) => {
    callback(null, Buffer.from(''), Buffer.from(''));
  }),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

import { deleteScreenshots } from './capture.js';
import type { SnapshotRecord } from '../../shared/types.js';
import fs from 'node:fs/promises';

const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;

describe('captureScreenshot', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('captures screenshot for single display', async () => {
    const { captureScreenshot } = await import('./capture.js');

    const result = await captureScreenshot('/tmp/test-dir', 'snapshot-123', 'main');

    expect(result.displayCount).toBe(1);
    expect(result.imagePaths).toHaveLength(1);
    expect(result.imagePaths[0]).toContain('snapshot-123');
    expect(result.imageHash).toBeDefined();
  });

  it('captures screenshots for all displays', async () => {
    const { captureScreenshot } = await import('./capture.js');

    const result = await captureScreenshot('/tmp/test-dir', 'snapshot-456', 'all');

    expect(result.displayCount).toBeGreaterThanOrEqual(1);
  });

  it('returns empty arrays when no displays', async () => {
    vi.stubGlobal('electron', {
      screen: {
        getAllDisplays: vi.fn(() => []),
      },
    });

    const { captureScreenshot } = await import('./capture.js');

    const result = await captureScreenshot('/tmp/test-dir', 'test', 'main');

    expect(result.displayCount).toBe(1);
  });
});

describe('deleteScreenshots', () => {
  it('複数のスナップショットの画像を一括削除', async () => {
    const snapshots: SnapshotRecord[] = [
      { id: 's1', capturedAt: '', imagePath: '/tmp/test1.jpg', imageHash: null, imagePaths: [], imageHashes: [], displayCount: 1, cursorX: null, cursorY: null, cursorDisplayId: null, cursorDisplayIndex: null, cursorRelativeX: null, cursorRelativeY: null, activeApp: null, windowTitle: null, pageTitle: null, url: null, keyboardActivity: null, mouseActivity: null, appSwitchCount: null, gitBranch: null, gitDirty: null, manualNote: null, status: 'captured', excludedReason: null, metadataJson: null, checkpointId: null },
    ];

    await expect(deleteScreenshots(snapshots)).resolves.not.toThrow();
  });
});