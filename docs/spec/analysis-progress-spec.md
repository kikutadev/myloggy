# AI解析進捗リアルタイム表示機能 仕様書

## 1. 概要

AI解析（`analyzeNow` / `reanalyzeDate`）実行中の進捗状況を、Main Process から Renderer Process へリアルタイムに通知し、UI 上に表示する機能。

### 1.1 目的

- ユーザーが解析処理の進行状況を可視化できるようにする
- 長時間解析（再解析）中に「フリーズしたか？」という不安を解消する
- 処理の段階（削除→解析→完了）と、何件目を処理中かを表示

### 1.2 対象範囲

- `analyzeNow()` — 通常の「今すぐAI処理」
- `reanalyzeDate(date)` — 特定日の再解析

---

## 2. 技術スタック

- **Electron IPC（Main → Renderer）**: `webContents.send` を利用した one-way イベント
- **React**: 進捗状態の表示

---

## 3. 進捗イベント設計

### 3.1 進捗データ型

```typescript
export type AnalysisPhase = 'reset' | 'analyze' | 'complete' | 'error';

export interface AnalysisProgress {
  phase: AnalysisPhase;
  current: number;
  total: number;
  message: string;
}
```

### 3.2 各フェーズの定義

| phase | 意味 | current / total の意味 |
|-------|------|------------------------|
| `reset` | 既存データを削除・巻き戻し中 | 削除済みチェックポイント数 / 対象総数 |
| `analyze` | AI解析実行中 | 処理済みウィンドウ数 / 対象ウィンドウ総数 |
| `complete` | 完了 | 最終的な処理件数 |
| `error` | エラー発生 | エラーが起きた段階の件数 |

### 3.3 メッセージ例（JA）

| phase | message 例 |
|-------|-----------|
| reset | `既存解析結果を削除中...` |
| analyze | `AI解析中... (3/10)` |
| complete | `完了 (10件処理)` |
| error | `エラー: モデル応答なし` |

---

## 4. アーキテクチャ

### 4.1 Main Process 側

```
TrackerService
  ├── analyzeReadyWindows(force)
  │     └── onProgress コールバックを呼び出し
  └── reanalyzeDate(date)
        ├── db.resetAnalysisForDate()  → phase='reset'
        └── analyzeReadyWindows(true)  → phase='analyze'
```

#### 進捗通知の流れ

1. `TrackerService` に `onProgress` コールバック（または EventEmitter）を追加
2. `analyzeReadyWindows` 内で、各ウィンドウ処理の前後に進捗イベントを発行
3. `ipc-handlers.ts` で `getMainWindow()` を取得し、`webContents.send('analysis:progress', progress)` を送信

### 4.2 Renderer Process 側

```
AppScreen
  ├── useAnalyze(onReload)
  │     └── window.myloggy.onAnalysisProgress で進捗を購読
  ├── useReanalyze(onReload)
  │     └── window.myloggy.onAnalysisProgress で進捗を購読
  └── ProgressBanner コンポーネントで表示
```

---

## 5. API 設計

### 5.1 Preload API（Renderer 公開）

```typescript
interface DesktopApi {
  // ... 既存 ...
  onAnalysisProgress(listener: (progress: AnalysisProgress) => void): () => void;
}
```

```typescript
// preload.ts
onAnalysisProgress: (listener) => {
  const wrapped = (_event: Electron.IpcRendererEvent, progress: AnalysisProgress) => {
    listener(progress);
  };
  ipcRenderer.on('analysis:progress', wrapped);
  return () => {
    ipcRenderer.off('analysis:progress', wrapped);
  };
},
```

### 5.2 IPC ハンドラー（Main Process）

進捗通知は `invoke/handle` ではなく `webContents.send` で行う（one-way）。

```typescript
// ipc-handlers.ts 登録時
function broadcastAnalysisProgress(progress: AnalysisProgress) {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('analysis:progress', progress);
  }
}

// TrackerService に注入
registerIpcHandlers(
  tracker,
  () => mainWindow,
  ...,
  broadcastAnalysisProgress,
);
```

### 5.3 TrackerService 変更

```typescript
export class TrackerService {
  private onProgress: ((progress: AnalysisProgress) => void) | null = null;

  setProgressListener(listener: ((progress: AnalysisProgress) => void) | null): void {
    this.onProgress = listener;
  }

  private emitProgress(progress: AnalysisProgress): void {
    this.onProgress?.(progress);
  }

  async reanalyzeDate(date: string): Promise<AppState> {
    const start = dayjs(date).startOf('day').toISOString();
    const end = dayjs(date).endOf('day').toISOString();

    this.emitProgress({ phase: 'reset', current: 0, total: 0, message: '既存解析結果を削除中...' });
    const result = this.db.resetAnalysisForDate(start, end);
    this.emitProgress({ phase: 'reset', current: result.deletedCheckpoints, total: result.deletedCheckpoints, message: `既存解析結果を削除しました (${result.deletedCheckpoints}件)` });

    await this.analyzeReadyWindows(true);
    return this.getState();
  }

  private async analyzeReadyWindows(force = false): Promise<void> {
    // ... existing guard ...
    this.isAnalyzing = true;

    try {
      const windows = this.db.getReadySnapshotWindows(...);
      const total = windows.length;

      this.emitProgress({ phase: 'analyze', current: 0, total, message: `AI解析中... (0/${total})` });

      for (let i = 0; i < windows.length; i++) {
        const windowSnapshots = windows[i];
        // ... existing analysis logic ...
        this.emitProgress({ phase: 'analyze', current: i + 1, total, message: `AI解析中... (${i + 1}/${total})` });
      }

      this.emitProgress({ phase: 'complete', current: total, total, message: `完了 (${total}件処理)` });
    } catch (error) {
      this.emitProgress({ phase: 'error', current: 0, total: 0, message: error instanceof Error ? error.message : '解析エラー' });
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }
}
```

---

## 6. UI 設計

### 6.1 進捗バナー

`AnalysisErrorBanner` の下に `AnalysisProgressBanner` を配置する。

```tsx
// AnalysisProgressBanner.tsx
interface AnalysisProgressBannerProps {
  progress: AnalysisProgress | null;
}

export function AnalysisProgressBanner({ progress }: AnalysisProgressBannerProps) {
  if (!progress) return null;
  if (progress.phase === 'complete') return null; // 完了後は非表示

  return (
    <div className={`progress-banner progress-banner--${progress.phase}`}>
      <span className="progress-spinner">⟳</span>
      <span className="progress-message">{progress.message}</span>
      {progress.total > 0 ? (
        <progress value={progress.current} max={progress.total} />
      ) : null}
    </div>
  );
}
```

### 6.2 スタイル

```css
.progress-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #e3f2fd;
  border-bottom: 1px solid #bbdefb;
  font-size: 13px;
}
.progress-banner--error {
  background: #ffebee;
  border-bottom-color: #ef9a9a;
}
.progress-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 6.3 AppScreen 統合

```tsx
// AppScreen.tsx
const [progress, setProgress] = useState<AnalysisProgress | null>(null);

useEffect(() => {
  return window.myloggy.onAnalysisProgress((p) => {
    setProgress(p);
    if (p.phase === 'complete' || p.phase === 'error') {
      // 完了・エラー後は少し待ってから消す
      setTimeout(() => setProgress(null), 3000);
    }
  });
}, []);

// JSX
<AnalysisProgressBanner progress={progress} />
```

---

## 7. 既存フックの変更

### useAnalyze

`runAnalyzeNow` 実行中に進捗を受け取れるようにするが、フック自体のインターフェースは変更しない。`AppScreen` 側で一元管理する。

### useReanalyze

同上。`AppScreen` 側で `onAnalysisProgress` を購読し、`progress` state を更新する。

---

## 8. テスト戦略

### 8.1 Preload テスト

- `onAnalysisProgress` が `ipcRenderer.on('analysis:progress')` を登録すること
- 返却した unsubscribe 関数が `ipcRenderer.off` を呼ぶこと
- イベント発火時に listener に `AnalysisProgress` が渡されること

### 8.2 TrackerService テスト

- `setProgressListener` 後、`analyzeReadyWindows` 実行で進捗イベントが発行されること
- `reanalyzeDate` 実行で `reset` → `analyze` → `complete` の順にイベントが発行されること

### 8.3 UI テスト

- `phase='analyze'` 時にバナーが表示されること
- `phase='complete'` 時にバナーが非表示になること（または3秒後に消えること）
- プログレスバーの `value/max` が正しいこと

---

## 9. 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `shared/types.ts` | `AnalysisProgress`, `AnalysisPhase` 型追加 |
| `shared/api.ts` | `onAnalysisProgress` メソッド追加 |
| `electron/preload.ts` | `onAnalysisProgress` 実装 |
| `electron/preload.test.ts` | テスト追加 |
| `electron/ipc-handlers.ts` | `broadcastAnalysisProgress` 注入、TrackerService に渡す |
| `electron/main.ts` | `broadcastAnalysisProgress` を `registerIpcHandlers` に渡す |
| `electron/core/tracker-service.ts` | `setProgressListener`, `emitProgress`, `analyzeReadyWindows` / `reanalyzeDate` に進捗発行を追加 |
| `electron/core/__tests__/tracker-service.test.ts` | 進捗イベントのテスト追加 |
| `src/features/shared/AnalysisProgressBanner.tsx` | 新規コンポーネント |
| `src/features/AppScreen/AppScreen.tsx` | 進捗購読・バナー表示を追加 |
| `src/styles.css` | 進捗バナー用スタイル追加 |
| `src/i18n.tsx` | 進捗メッセージ用テキスト追加（必要に応じて） |

---

## 10. ロードマップ

1. **型定義・Preload API**（0.5h）
2. **TrackerService 進捗発行**（1h）
3. **IPC 配信層**（0.5h）
4. **UI コンポーネント**（1h）
5. **統合テスト**（1h）

---

**文書バージョン**: 1.0  
**最終更新日**: 2026-04-22
