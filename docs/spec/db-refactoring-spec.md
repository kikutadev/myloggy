# DB レイヤー責務分割リファクタリング仕様

## 1. 概要

`electron/core/db.ts`（764 行）がデータベース接続・スキーマ管理・6 エンティティの CRUD・マイグレーション・ユーティリティを単一クラスで担っており、責務過多です。本仕様では TDD（Red-Green-Refactor）を前提に、段階的な分割リファクタリングを定義します。

---

## 2. 現状の問題分析

### 2.1 責務の内訳

| 責務 | 概算行数 | 内容 |
|------|---------|------|
| DB 接続・低級操作用 | ~30 | constructor, close, run, ensureColumn |
| スキーマ定義・マイグレーション | ~80 | CREATE TABLE, ALTER TABLE, 列追加 |
| Row Mapper | ~80 | rowToSnapshot, rowToCheckpoint, rowToWorkUnit, rowToError |
| Settings CRUD | ~30 | getSettings, saveSettings |
| Snapshot CRUD | ~120 | insertSnapshot, getReadySnapshotWindows, markSnapshotsProcessed, ... |
| Checkpoint CRUD | ~50 | insertCheckpoint, listCheckpointsBetween, getLastCheckpoint |
| WorkUnit CRUD | ~100 | insertWorkUnit, updateWorkUnit, patchWorkUnit, listWorkUnitsBetween, ... |
| ErrorLog CRUD | ~30 | insertError, listErrors, clearErrors |
| AnalysisLog CRUD | ~60 | insertAnalysisLog, listAnalysisLogs |
| CategoryRule CRUD | ~20 | getCategoryRule, upsertCategoryRule |
| ユーティリティ・横断クエリ | ~40 | listKnownProjectNames, countPendingSnapshots, getAnalysisAttempts |

### 2.2 コードスメル

- **God Class**: AppDatabase が全エンティティの詳細を知りすぎている
- **混在する抽象度**: 原始クエリ（this.run(...)）とビジネスロジック（patchWorkUnit 内のカテゴリ自動保存）が混在
- **テスト困難性**: DB 実体が必須で、単体テスト時のモック・スタブが困難
- **変更影響範囲**: Snapshot の変更が ErrorLog に無関係であるにも関わらず同ファイルを触る必要がある

---

## 3. 目標アーキテクチャ

### 3.1 レイヤー構成

```
electron/core/db/
  |-- connection.ts          # 低級: DatabaseSync ラップ、生 SQL 実行
  |-- schema.ts              # 低級: テーブル定義、マイグレーション、ensureColumn
  |-- mappers.ts             # 低級: row -> Record 変換関数群
  |-- repositories/
  |     |-- base-repository.ts # 抽象: connection + mapper + 共通ヘルパ
  |     |-- settings.ts        # Settings CRUD
  |     |-- snapshots.ts       # Snapshot CRUD
  |     |-- checkpoints.ts     # Checkpoint CRUD
  |     |-- work-units.ts      # WorkUnit CRUD
  |     |-- error-logs.ts      # ErrorLog CRUD
  |     |-- analysis-logs.ts   # AnalysisLog CRUD
  |     |-- category-rules.ts  # CategoryRule CRUD
  |-- index.ts               # 公開用 Facade（後方互換、移行期間限定）
```

### 3.2 依存の方向

```
Repositories -> BaseRepository -> Connection, Schema, Mappers
Facade（index.ts）-> 全 Repositories（後方互換用、最終的に削除）
```

**原則**: UI / Main Process 側は最終的に個別の Repository をインジェクトする。
移行期間中は AppDatabase Facade を維持する。

---

## 4. 各モジュール仕様

### 4.1 connection.ts

```typescript
export type SqlValue = string | number | boolean | null;

export interface DatabaseConnection {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
}

export function createConnection(baseDir: string, useMemory?: boolean): DatabaseConnection;
export function normalizeParams(...params: unknown[]): SqlValue[];
```

**責務**:
- DatabaseSync の生成（WAL 有効化、foreign_keys ON）
- ディレクトリ作成
- パラメータ正規化（boolean -> 0/1, undefined -> null）

**テスト**:
- :memory: DB の生成と close ができる
- normalizeParams のユニットテスト（boolean, undefined, null, string, number）

### 4.2 schema.ts

```typescript
export function initializeSchema(conn: DatabaseConnection): void;
export function ensureColumn(
  conn: DatabaseConnection,
  table: string,
  column: string,
  definition: string,
): void;
export function applyMigrations(conn: DatabaseConnection): void;
```

**責務**:
- CREATE TABLE IF NOT EXISTS（settings, snapshots, checkpoints, work_units, error_logs, analysis_logs, category_rules）
- ensureColumn による後付け列追加
- マイグレーション履歴管理（必要に応じて migrations テーブルを追加）

**テスト**:
- 初期化後、すべてのテーブルが存在すること
- ensureColumn で既存列に対して例外が出ないこと
- マイグレーション後、追加列が存在すること

### 4.3 mappers.ts

```typescript
export function rowToSnapshot(row: Record<string, unknown>): SnapshotRecord;
export function rowToCheckpoint(row: Record<string, unknown>): CheckpointRecord;
export function rowToWorkUnit(row: Record<string, unknown>): WorkUnitRecord;
export function rowToErrorLog(row: Record<string, unknown>): ErrorLogRecord;
export function rowToAnalysisLog(row: Record<string, unknown>): AnalysisLogRecord;
```

**責務**:
- Record<string, unknown> から型付きレコードへの変換
- JSON 文字列のパース（safeJsonParse の利用）
- ローカライゼーション関数の呼び出し（toStoredCategoryLabel, toStoredProjectName）
- Legacy データ互換処理（imagePath -> imagePaths 等）

**テスト**:
- 各 Mapper の入出力が正しいこと
- Legacy フィールド（image_path, image_hash）のフォールバック
- null / undefined 行の扱い

### 4.4 repositories/base-repository.ts

```typescript
export abstract class BaseRepository {
  protected constructor(protected readonly conn: DatabaseConnection) {}

  protected run(sql: string, ...params: unknown[]): void;
  protected all(sql: string, ...params: unknown[]): Record<string, unknown>[];
  protected get(sql: string, ...params: unknown[]): Record<string, unknown> | undefined;
}
```

**責務**:
- 生 SQL の実行ラップ
- パラメータの自動正規化（normalizeParams 経由）
- タイプアサーションの一元化

**テスト**:
- run / all / get で SQL が正しく実行されること
- boolean / undefined の正規化が自動で行われること

### 4.5 repositories/settings.ts

```typescript
export class SettingsRepository extends BaseRepository {
  getSettings(): AppSettings;
  saveSettings(settings: AppSettings): AppSettings;
}
```

**責務**:
- settings テーブルの CRUD
- DEFAULT_SETTINGS のマージと mainDisplayOnly -> displayCaptureMode の互換変換

**テスト**:
- デフォルト設定の取得
- 保存後の取得で値が一致すること
- mainDisplayOnly 互換変換

### 4.6 repositories/snapshots.ts

```typescript
export class SnapshotRepository extends BaseRepository {
  insert(snapshot: SnapshotRecord): void;
  getById(id: string): SnapshotRecord | null;
  listRecent(limit?: number): SnapshotRecord[];
  listPending(): SnapshotRecord[];
  clearPending(): SnapshotRecord[];
  countPending(): number;
  getReadyWindows(intervalMinutes: number, nowIso: string): SnapshotRecord[][];
  incrementAnalysisAttempts(snapshotIds: string[]): void;
  markProcessed(snapshotIds: string[], checkpointId: string): void;
  getMaxAnalysisAttempts(snapshotIds: string[]): number;
}
```

**責務**:
- snapshots テーブルの CRUD
- 分析用ウィンドウの生成（時間単位バケット化）
- 分析試行回数の管理

**テスト**:
- 挿入・取得の整合性
- ウィンドウバケット化の境界条件
- ステータス遷移（captured -> processed）

### 4.7 repositories/checkpoints.ts

```typescript
export class CheckpointRepository extends BaseRepository {
  insert(record: CheckpointRecord): void;
  listBetween(startIso: string, endIso: string): CheckpointRecord[];
  getLast(): CheckpointRecord | null;
}
```

**責務**:
- checkpoints テーブルの CRUD
- 期間クエリと最新取得

**テスト**:
- 期間クエリの境界条件（start_at < endIso AND end_at >= startIso）
- 最新一件の取得

### 4.8 repositories/work-units.ts

```typescript
export class WorkUnitRepository extends BaseRepository {
  insert(record: WorkUnitRecord): void;
  update(record: WorkUnitRecord): void;
  patch(patch: WorkUnitPatch): WorkUnitRecord | null;
  getById(id: string): WorkUnitRecord | null;
  listBetween(startIso: string, endIso: string): WorkUnitRecord[];
  listRecent(limit?: number): WorkUnitRecord[];
  getCurrent(): WorkUnitRecord | null;
}
```

**責務**:
- work_units テーブルの CRUD
- patch による部分更新（userEdited = true, updatedAt 自動設定）
- CategoryRule の連携（patchWorkUnit 内で category + projectName が確定した場合に upsertCategoryRule を呼び出す）

**テスト**:
- patch で userEdited と updatedAt が更新されること
- category + projectName 変更時に category_rules への連携
- 存在しない ID の patch は null を返す

### 4.9 repositories/error-logs.ts

```typescript
export class ErrorLogRepository extends BaseRepository {
  insert(scope: string, message: string, detail?: string | null): ErrorLogRecord;
  list(limit?: number): ErrorLogRecord[];
  clear(): void;
}
```

**責務**:
- error_logs テーブルの CRUD
- createId の利用

**テスト**:
- 挿入後 list で取得できること
- clear で全削除されること

### 4.10 repositories/analysis-logs.ts

```typescript
export class AnalysisLogRepository extends BaseRepository {
  insert(record: Omit<AnalysisLogRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }): AnalysisLogRecord;
  list(limit?: number): AnalysisLogRecord[];
}
```

**責務**:
- analysis_logs テーブルの CRUD
- snapshotIds の JSON シリアライズ

**テスト**:
- 挿入後 list で snapshotIds が配列として復元されること
- id / createdAt のデフォルト値生成

### 4.11 repositories/category-rules.ts

```typescript
export class CategoryRuleRepository extends BaseRepository {
  get(projectName: string): string | null;
  upsert(projectName: string, category: string): void;
}
```

**責務**:
- category_rules テーブルの CRUD
- projectName -> category のマッピング

**テスト**:
- upsert -> get で値が取得できること
- 未登録 projectName は null

### 4.12 index.ts（Facade）

```typescript
export { createConnection, type DatabaseConnection } from "./connection.js";
export { initializeSchema, ensureColumn } from "./schema.js";
export * from "./mappers.js";
export * from "./repositories/settings.js";
// ... 各 Repository の re-export

// 移行期間中の互換 Facade
export class AppDatabase {
  // 既存インターフェースをそのまま維持
  // 内部で各 Repository を委譲
}
```

**責務**:
- 既存 `AppDatabase` の後方互換性を維持
- 内部で各 Repository に委譲し、徐々に呼び出し側を移行

---

## 5. TDD 実装ステップ（Red-Green-Refactor）

### Phase 1: 低級レイヤーの分離（基盤）

1. **connection.ts**
   - Red: `createConnection` と `normalizeParams` のテストを書く（:memory: DB で動作確認）
   - Green: 実装する
   - Refactor: AppDatabase から `run` ロジックを移行

2. **schema.ts**
   - Red: `initializeSchema` と `ensureColumn` のテストを書く
   - Green: 実装する
   - Refactor: AppDatabase コンストラクタからスキーマ定義を移行

3. **mappers.ts**
   - Red: 各 `rowTo*` 関数のテストを書く（最小限のフィクスチャ行で検証）
   - Green: 実装する
   - Refactor: AppDatabase から Row Mapper を移行

### Phase 2: BaseRepository + Settings/CategoryRules（単純な CRUD）

4. **base-repository.ts**
   - Red: `run` / `all` / `get` のテスト（BaseRepository の具象サブクラスをテスト用に作成）
   - Green: 実装する

5. **settings.ts & category-rules.ts**
   - Red: 各 Repository の CRUD テスト
   - Green: 実装する
   - Refactor: AppDatabase から対応メソッドを移行

### Phase 3: 中級 Repository（Snapshots, Checkpoints, ErrorLogs, AnalysisLogs）

6. **snapshots.ts**
   - Red: 挿入・取得・ウィンドウ生成のテスト
   - Green: 実装する
   - Refactor: AppDatabase から移行

7. **checkpoints.ts, error-logs.ts, analysis-logs.ts**
   - 同様に Red-Green-Refactor

### Phase 4: 複雑な Repository（WorkUnits）

8. **work-units.ts**
   - Red: CRUD + patch（カテゴリ連携含む）のテスト
   - Green: 実装する
   - Refactor: AppDatabase から移行。`patchWorkUnit` 内の `upsertCategoryRule` 呼び出しを CategoryRuleRepository 委譲に変更

### Phase 5: Facade 統合と後方互換

9. **index.ts（Facade）**
   - Red: `AppDatabase` の既存インターフェーステスト（ブラックボックステストで回帰防止）
   - Green: Facade を実装（内部で各 Repository を呼び出し）
   - Refactor: 既存 `electron/core/db.ts` を `electron/core/db/index.ts` に差し替え、旧ファイルは削除またはリダイレクト

---

## 6. 移行計画

### 6.1 ブランチ戦略

- `refactor/db-layer` ブランチを作成
- Phase 1-5 を PR 単位で分ける（1 Phase = 1 PR）

### 6.2 後方互換の維持

- `AppDatabase` Facade は既存の `main.ts` / `tracker.ts` / 各ハンドラーの変更を最小限に抑える
- Facade 実装後、呼び出し側を個別 Repository にインジェクトするリファクタリングを別タスクで実施
- 最終的に Facade を削除し、DI（依存性注入）パターンに移行

### 6.3 テストカバレッジ目標

- 新規モジュール: 80% 以上
- 回帰テスト: 既存 `AppDatabase` のブラックボックステストはすべて維持

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| マイグレーションの不整合 | 既存 DB 破損 | schema.ts は既存の `ensureColumn` 列挙を完全に移植。テストでは実 DB バックアップを模擬 |
| Row Mapper の挙動変化 | データ表示不良 | 既存 `rowTo*` のロジックを一字一句移植し、回帰テストで照合 |
| トランザクション境界の曖昧化 | 整合性喪失 | Phase 1 で connection.ts に `transaction()` ヘルパを追加し、複数テーブル更新時は Facade 層でトランザクション管理 |
| ファイル分割による import 混乱 | ビルドエラー | index.ts で一括 re-export。tsconfig の path alias は変更しない |

---

## 8. 用語集

| 用語 | 説明 |
|------|------|
| Repository | データ永続化ロジックを担当するクラス（DDD の用語借用） |
| Facade | 複数のサブシステムを単一の簡潔なインターフェースにまとめるパターン |
| Row Mapper | DB 行（Record<string, unknown>）から型付きオブジェクトへの変換関数 |
| ensureColumn | 既存テーブルに列が存在しない場合のみ ALTER TABLE ADD COLUMN するマイグレーション手法 |

---

**文書バージョン**: 1.0
**最終更新日**: 2026-04-22
