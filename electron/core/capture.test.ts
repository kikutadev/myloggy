import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  screen: {
    getAllDisplays: vi.fn(() => [{ id: 1, bounds: { width: 1920, height: 1080, x: 0, y: 0 } }]),
  },
}));

import { deleteScreenshots } from './capture.js';
import type { SnapshotRecord } from '../../shared/types.js';

describe('captureScreenshot', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.skip('snapshot IDを使ってスクリーンショットを保存', async () => {
    // screencaptureはCI/ヘッドレス環境で失敗するためスキップ
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