# 特定日のAI処理再実行機能 仕様書

## 1. 概要

過去の特定の日付のスナップショット・チェックポイント・ワークユニットを一度削除し、その日のスナップショットを未解析状態に戻してからAI解析をやり直す機能を提供する。

### 1.1 目的

- AI解析結果に明らかな誤りがあった日・モデルを変更した後の再解析・手動編集前の状態に戻したい場面に対応
- その日の `checkpoints` / `work_units` を一括削除し、紐づく `snapshots` を未処理に戻して再解析パイプラインを流す

### 1.2 非目的

- 単一の `checkpoint` または `work_unit` のみを再解析する機能（粒度が細かすぎてUI・データ整合性が複雑化するため）
- スナップショット画像の再撮影（既存の `temp-snaps` / `checkpoint-snaps` 内の画像を再利用する）

---

## 2. 技術スタック

既存の技術スタックをそのまま利用する。

- **Electron IPC**: Main ↔ Renderer 通信
- **SQLite**: ローカルデータベース
- **TypeScript / React**: UI 実装

---

## 3. 機能要件

### 3.1 再解析対象の定義

- **対象日付**: `YYYY-MM-DD` 形式で指定。対象日の `00:00:00.000Z` から `23:59:59.999Z` の範囲に含まれるレコードが対象。
- **削除対象テーブル**:
  - `work_units`: `start_at < 翌日00:00` かつ `end_at >= 当日00:00` のレコード
  - `checkpoints`: `start_at < 翌日00:00` かつ `end_at >= 当日00:00` かつ `status = 'completed'` のレコード
- **巻き戻し対象テーブル**:
  - `snapshots`: 上記 `checkpoints` に紐づいていた（`checkpoint_id` が対象 `checkpoints.id` のいずれか）レコード

### 3.2 スナップショットの巻き戻し内容

対象 `snapshots` に対して以下を一括更新する：

| カラム | 更新後の値 | 理由 |
|--------|-----------|------|
| `status` | `'captured'` | 未解析状態に戻す |
| `checkpoint_id` | `NULL` | 既存チェックポイントとの紐づけを解除 |
| `analysis_attempts` | `0` | 再試行回数をリセット |

### 3.3 AI解析の再実行

巻き戻し後、即座に既存の `analyzeReadyWindows(force = true)` を呼び出して再解析を開始する。

- `force = true` とすることで、当日の全ウィンドウが解析対象になる（ウィンドウの終了時刻が未来である必要がある制約を回避）
- 通常の解析パイプラインと同じロジックを流用する：
  - `getLastCheckpoint()` による前日からの連続性引継ぎ
  - `attachCheckpointToWorkUnit()` によるワークユニットの生成・マージ
  - `checkpoint-snaps` への画像コピー

### 3.4 画像ファイルの扱い

- 巻き戻し時にはファイルシステム上の画像は削除しない（`checkpoint-snaps/<old-checkpoint-id>/` に残る）
- 再解析時、新しい `checkpoint` 生成後に `checkpoint-snaps/<new-checkpoint-id>/` へコピーされ、DB の `imagePaths` が更新される
- その後 `deleteScreenshots()` が古いパス（`checkpoint-snaps/<old-checkpoint-id>/`）を削除するため、古い `checkpoint` ディレクトリは自動的にクリーンアップされる
- 画像ファイルが見つからないスナップショットに関しては、LLM リクエスト時に画像なし（メタデータのみ）で解析が継続される（既存動作）

### 3.5 前日との連続性

- `analyzeReadyWindows` 内の `getLastCheckpoint()` はグローバル最新の completed checkpoint を返す
- 対象日の再解析時、前日の最後の checkpoint が `previousCheckpoint` として渡される可能性があるが、これは仕様とする
  - 前日からの継続作業を正しく認識できる利点がある
  - `shouldMergeWorkUnit` の `gapMinutes > idleGapMinutes(20)` 判定により、前日の `work_unit` とマージされることは通常ない

---

## 4. API 設計

### 4.1 IPC ハンドラー（Main Process）

```typescript
ipcMain.handle('tracking:reanalyze-date', async (_event, date: string) => {
  return await tracker.reanalyzeDate(date);
});
```

### 4.2 TrackerService（Main Process）

```typescript
export class TrackerService {
  // ... 既存メソッド ...

  async reanalyzeDate(date: string): Promise<AppState> {
    const start = dayjs(date).startOf('day').toISOString();
    const end = dayjs(date).endOf('day').toISOString();

    // 1. トランザクション内で checkpoints / work_units を削除し snapshots を巻き戻す
    const result = this.db.resetAnalysisForDate(start, end);
    console.log('[Reanalyze]', date, result);

    // 2. 既存の解析パイプラインを force 実行
    await this.analyzeReadyWindows(true);

    return this.getState();
  }
}
```

### 4.3 Preload API（Renderer プロセス公開）

```typescript
interface MyLoggyAPI {
  // ... 既存 ...
  reanalyzeDate: (date: string) => Promise<void>;
}
```

### 4.4 React Hooks（Renderer）

```typescript
// src/features/DayView/useReanalyze.ts（新規）
export function useReanalyze(onReload: () => Promise<void>) {
  const [running, setRunning] = useState(false);

  const reanalyzeDate = useCallback(async (date: string) => {
    if (running) return;
    setRunning(true);
    try {
      await window.myloggy.reanalyzeDate(date);
      await onReload();
    } finally {
      setRunning(false);
    }
  }, [running, onReload]);

  return { running, reanalyzeDate };
}
```

---

## 5. データベース設計

### 5.1 既存テーブル操作

新規テーブルは不要。以下の操作を `AppDatabase` Facade に集約する。

#### `AppDatabase` 追加メソッド

```typescript
export class AppDatabase {
  // ...

  resetAnalysisForDate(startIso: string, endIso: string): {
    resetSnapshots: number;
    deletedCheckpoints: number;
    deletedWorkUnits: number;
  } {
    // トランザクションで実行
    return this.conn.transaction(() => {
      const deletedWorkUnits = this.workUnitsRepo.deleteBetween(startIso, endIso);
      const deletedCheckpoints = this.checkpointsRepo.deleteBetween(startIso, endIso);
      const resetSnapshots = this.snapshotsRepo.resetProcessedBetween(startIso, endIso);
      return { resetSnapshots, deletedCheckpoints, deletedWorkUnits };
    })();
  }
}
```

#### `SnapshotRepository` 追加メソッド

```typescript
export class SnapshotRepository extends BaseRepository {
  // ...

  resetProcessedBetween(startIso: string, endIso: string): number {
    const result = this.conn.prepare(
      `
      UPDATE snapshots
      SET status = 'captured',
          checkpoint_id = NULL,
          analysis_attempts = 0
      WHERE captured_at >= ?
        AND captured_at <= ?
        AND status = 'processed'
      `
    ).run(startIso, endIso);
    return Number(result.changes ?? 0);
  }
}
```

#### `CheckpointRepository` 追加メソッド

```typescript
export class CheckpointRepository extends BaseRepository {
  // ...

  deleteBetween(startIso: string, endIso: string): number {
    const result = this.conn.prepare(
      `
      DELETE FROM checkpoints
      WHERE start_at < ?
        AND end_at >= ?
        AND status = 'completed'
      `
    ).run(endIso, startIso);
    return Number(result.changes ?? 0);
  }
}
```

#### `WorkUnitRepository` 追加メソッド

```typescript
export class WorkUnitRepository extends BaseRepository {
  // ...

  deleteBetween(startIso: string, endIso: string): number {
    const result = this.conn.prepare(
      `
      DELETE FROM work_units
      WHERE start_at < ?
        AND end_at >= ?
      `
    ).run(endIso, startIso);
    return Number(result.changes ?? 0);
  }
}
```

### 5.2 トランザクション境界

`resetAnalysisForDate` は `DatabaseConnection`（better-sqlite3 の `DatabaseSync`）の `transaction()` を利用し、以下をアトミックに実行する：

1. `work_units` 削除
2. `checkpoints` 削除
3. `snapshots` 巻き戻し

途中でエラーが発生した場合は全てロールバックされる。

---

## 6. UI 設計

### 6.1 日次ビューへの再解析ボタン

`DayView` のヘッダーまたは `AppScreen` の日付ナビゲーション周辺に配置する。

```tsx
// DayView.tsx 内（または AppScreen の top-bar-center 付近）
<button
  className="btn btn-ghost btn-sm"
  disabled={runningReanalyze}
  onClick={() => {
    if (confirm(text.reanalyzeConfirm)) {
      void reanalyzeDate(selectedDate);
    }
  }}
>
  {runningReanalyze ? text.reanalyzing : text.reanalyzeDay}
</button>
```

### 6.2 確認ダイアログ

- 再解析実行前に確認ダイアログを表示
- メッセージ例（JA）: 「この日のAI解析結果を削除して再実行しますか？手動編集したワークログの内容も失われます。」
- メッセージ例（EN）: "Delete AI analysis results for this day and re-run? Manually edited work units will also be lost."

### 6.3 進捗・ロック表示

- 再解析中はボタンを `disabled` とし、テキストを「再解析中...」に変更
- `AppScreen` 側の `analyzeLocked`（`state.isAnalyzing || runningAnalyze`）と同様のスタイルで統一感を持たせる

---

## 7. エラーハンドリング

### 7.1 想定されるエラー

| エラー | 発生箇所 | 対処 |
|--------|---------|------|
| 対象日に processed snapshot がない | `resetProcessedBetween` | 正常終了（0件更新）として解析パイプラインだけ流す |
| 解析パイプライン内の LLM エラー | `analyzeReadyWindows` | 既存の `analysis_failed` 処理に委譲（`incrementAnalysisAttempts` / `insertError`） |
| トランザクション失敗 | `resetAnalysisForDate` | エラーをthrowしRenderer側でcatchしてエラーメッセージを表示 |
| 画像ファイル不在 | `analyzeWindow` | 画像なしでLLMリクエストを継続（既存動作） |

### 7.2 ロールバック

`transaction()` 内でエラーが発生した場合、DB変更は自動ロールバックされる。Renderer側ではエラーメッセージを表示し、画面リフレッシュは行わない。

---

## 8. テスト戦略

### 8.1 単体テスト

#### Repository 層

- `SnapshotRepository.resetProcessedBetween`
  - 対象日の `processed` スナップショットが `captured` / `checkpoint_id=null` / `analysis_attempts=0` に更新されること
  - 対象日外のスナップショットは更新されないこと
- `CheckpointRepository.deleteBetween`
  - 対象日の `completed` checkpoint が削除されること
  - `failed` 状態の checkpoint は削除されないこと（仕様上対象外）
- `WorkUnitRepository.deleteBetween`
  - 対象日の work_unit が削除されること
  - 日付境界（前日23:50〜当日00:10のwork_unit）も正しく削除されること

#### TrackerService

- `reanalyzeDate` の呼び出し後、対象日の `work_units` / `checkpoints` が削除され、`snapshots` が未処理になっていること
- `reanalyzeDate` 後の `getState()` で `isAnalyzing = false` になること（解析完了後）

### 8.2 統合テスト

- 実際にスナップショット・チェックポイント・ワークユニットを生成後、`reanalyzeDate` を実行し、最終的なワークユニット数・チェックポイント数が再生成後の状態と一致すること
- 手動編集（`userEdited = true`）したワークユニットが再解析後に消失すること

### 8.3 E2E / 手動テスト項目

- [ ] 日次ビューに「再解析」ボタンが表示されること
- [ ] ボタン押下時に確認ダイアログが表示されること
- [ ] 再解析後、当日のワークログが再生成されること
- [ ] 再解析中、ボタンが disabled になること
- [ ] 対象日に processed snapshot がない場合もエラーにならず完了すること
- [ ] 週次・月次ビューへの影響がないこと

---

## 9. 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `electron/core/db/repositories/snapshots.ts` | `resetProcessedBetween` メソッド追加 |
| `electron/core/db/repositories/checkpoints.ts` | `deleteBetween` メソッド追加 |
| `electron/core/db/repositories/work-units.ts` | `deleteBetween` メソッド追加 |
| `electron/core/db/index.ts` | `AppDatabase` に `resetAnalysisForDate` メソッド追加 |
| `electron/core/tracker-service.ts` | `reanalyzeDate` メソッド追加 |
| `electron/ipc-handlers.ts` | `tracking:reanalyze-date` ハンドラー追加 |
| `electron/preload.ts`（またはpreload相当） | `reanalyzeDate` API 公開 |
| `shared/types.ts`（またはglobal.d.ts） | Preload API 型定義追加 |
| `src/features/DayView/DayView.tsx` | 再解析ボタン追加（またはAppScreen経由） |
| `src/features/AppScreen/AppScreen.tsx` | `useReanalyze` フック利用、props 連携 |
| `src/i18n.tsx` / `src/i18n.test.tsx` | 再解析関連の翻訳テキスト追加 |
| `electron/core/__tests__/db-repository-snapshots.test.ts` | `resetProcessedBetween` のテスト追加 |
| `electron/core/__tests__/db-repository-checkpoints.test.ts` | `deleteBetween` のテスト追加 |
| `electron/core/__tests__/db-repository-work-units.test.ts` | `deleteBetween` のテスト追加 |

---

## 10. 実装ステップ

1. **DB層の拡張**
   - `SnapshotRepository.resetProcessedBetween`
   - `CheckpointRepository.deleteBetween`
   - `WorkUnitRepository.deleteBetween`
   - `AppDatabase.resetAnalysisForDate`
   - 各Repositoryテストの追加

2. **TrackerService の拡張**
   - `reanalyzeDate` メソッド実装

3. **IPC / Preload の拡張**
   - `tracking:reanalyze-date` ハンドラー登録
   - Preload API 公開

4. **UI 実装**
   - `useReanalyze` フック作成
   - `DayView` または `AppScreen` にボタン・確認ダイアログ配置
   - i18n テキスト追加

5. **統合テスト・動作確認**
   - 実データで再解析フローを検証
   - 週次/月次ビューへの影響確認

---

**文書バージョン**: 1.0  
**最終更新日**: 2026-04-22
