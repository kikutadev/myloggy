# AI解析進捗リアルタイム表示機能 — テストリスト

## 型定義（shared/types.ts, shared/api.ts）
- [x] `AnalysisPhase` が `'reset' | 'analyze' | 'complete' | 'error'` のユニオン型であること
- [x] `AnalysisProgress` が `{ phase, current, total, message }` を持つこと
- [x] `DesktopApi` に `onAnalysisProgress` メソッドが存在すること

## Preload API（electron/preload.ts, electron/preload.test.ts）
- [x] `onAnalysisProgress` が `analysis:progress` イベントに登録すること
- [x] `onAnalysisProgress` の返却関数が `ipcRenderer.off` を呼ぶこと
- [x] イベント発火時に listener に `AnalysisProgress` オブジェクトが渡されること
- [x] API完全性テストに `onAnalysisProgress` が含まれること

## IPC配信層（electron/ipc-handlers.ts, electron/main.ts）
- [x] `registerIpcHandlers` が `broadcastAnalysisProgress` パラメータを受け取ること
- [x] `broadcastAnalysisProgress` が `webContents.send('analysis:progress', progress)` を呼ぶこと
- [x] ウィンドウがdestroyedの場合は送信しないこと
- [x] `main.ts` が `broadcastAnalysisProgress` を `registerIpcHandlers` に渡すこと

## TrackerService（electron/core/tracker-service.ts, tracker-service.test.ts）
- [x] `setProgressListener` でリスナーを設定できること
- [x] `analyzeReadyWindows` 実行時に `analyze` フェーズが各ウィンドウごとに発行されること
- [x] `analyzeReadyWindows` 完了後に `complete` フェーズが発行されること
- [x] `analyzeReadyWindows` エラー時に `error` フェーズが発行されること
- [x] `reanalyzeDate` 実行時に `reset` → `analyze` → `complete` の順に発行されること

## UIコンポーネント（AnalysisProgressBanner.tsx）
- [x] `progress` が null のとき何も描画しないこと
- [x] `phase='complete'` のとき何も描画しないこと
- [x] `phase='analyze'` のときメッセージとプログレスバーを描画すること
- [x] `phase='error'` のときエラー用スタイルが適用されること
- [x] プログレスバーの `value` / `max` が正しいこと

## AppScreen統合（AppScreen.tsx）
- [x] マウント時に `onAnalysisProgress` を購読すること
- [x] 進捗イベント受信時に `progress` state が更新されること
- [x] `complete` / `error` 後3秒で `progress` がクリアされること
- [x] `AnalysisProgressBanner` に `progress` が渡されること
