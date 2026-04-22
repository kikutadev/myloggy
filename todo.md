# AI解析進捗リアルタイム表示機能 — テストリスト

## 型定義（shared/types.ts, shared/api.ts）
- [ ] `AnalysisPhase` が `'reset' | 'analyze' | 'complete' | 'error'` のユニオン型であること
- [ ] `AnalysisProgress` が `{ phase, current, total, message }` を持つこと
- [ ] `DesktopApi` に `onAnalysisProgress` メソッドが存在すること

## Preload API（electron/preload.ts, electron/preload.test.ts）
- [ ] `onAnalysisProgress` が `analysis:progress` イベントに登録すること
- [ ] `onAnalysisProgress` の返却関数が `ipcRenderer.off` を呼ぶこと
- [ ] イベント発火時に listener に `AnalysisProgress` オブジェクトが渡されること
- [ ] API完全性テストに `onAnalysisProgress` が含まれること

## IPC配信層（electron/ipc-handlers.ts, electron/main.ts）
- [ ] `registerIpcHandlers` が `broadcastAnalysisProgress` パラメータを受け取ること
- [ ] `broadcastAnalysisProgress` が `webContents.send('analysis:progress', progress)` を呼ぶこと
- [ ] ウィンドウがdestroyedの場合は送信しないこと
- [ ] `main.ts` が `broadcastAnalysisProgress` を `registerIpcHandlers` に渡すこと

## TrackerService（electron/core/tracker-service.ts, tracker-service.test.ts）
- [ ] `setProgressListener` でリスナーを設定できること
- [ ] `analyzeReadyWindows` 実行時に `analyze` フェーズが各ウィンドウごとに発行されること
- [ ] `analyzeReadyWindows` 完了後に `complete` フェーズが発行されること
- [ ] `analyzeReadyWindows` エラー時に `error` フェーズが発行されること
- [ ] `reanalyzeDate` 実行時に `reset` → `analyze` → `complete` の順に発行されること

## UIコンポーネント（AnalysisProgressBanner.tsx）
- [ ] `progress` が null のとき何も描画しないこと
- [ ] `phase='complete'` のとき何も描画しないこと
- [ ] `phase='analyze'` のときメッセージとプログレスバーを描画すること
- [ ] `phase='error'` のときエラー用スタイルが適用されること
- [ ] プログレスバーの `value` / `max` が正しいこと

## AppScreen統合（AppScreen.tsx）
- [ ] マウント時に `onAnalysisProgress` を購読すること
- [ ] 進捗イベント受信時に `progress` state が更新されること
- [ ] `complete` / `error` 後3秒で `progress` がクリアされること
- [ ] `AnalysisProgressBanner` に `progress` が渡されること
