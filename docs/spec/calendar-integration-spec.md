# 予定分析機能 仕様書

## 1. 概要

本機能は、macOS の EventKit（カレンダー・リマインダー）と連携し、ユーザーの予定データを取得・分析してワークログと関連付ける機能を提供する。

### 1.1 目的
- ユーザーのカレンダーイベントを自動取得
- ワークログデータとカレンダーイベントの関連付け
- 予定に基づく作業時間の分析
- リマインダーとの連携によるタスク管理支援

### 1.2 対象プラットフォーム
- **macOS のみ**（eventkit-node の制約による）
- Windows/Linux では本機能は利用不可（代替機能または非表示）

---

## 2. 技術スタック

### 2.1 主要ライブラリ
- **eventkit-node** (^1.0.5): macOS EventKit へのネイティブアクセス
- **Electron**: IPC 通信用
- **SQLite**: ローカルデータ保存用

### 2.2 アーキテクチャ
```
┌─────────────────┐     IPC      ┌─────────────────────┐
│   Renderer      │ ◄──────────► │   Main Process      │
│   (React UI)    │              │   (electron/main.ts)│
└─────────────────┘              └──────────┬──────────┘
                                            │
                                            ▼
                                   ┌─────────────────────┐
                                   │   eventkit-node     │
                                   │   (Native Addon)    │
                                   └──────────┬──────────┘
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │   macOS EventKit    │
                                   │   (Calendar/Reminder)│
                                   └─────────────────────┘
```

---

## 3. 機能要件

### 3.1 カレンダーイベント取得機能

#### 3.1.1 アクセス権限管理
- **初回起動時**: カレンダーアクセス権限を要求
- **権限状態確認**: 
  - `authorized`: 許可済み
  - `denied`: 拒否済み
  - `restricted`: 制限済み
  - `undetermined`: 未確定（初回）
- **権限再要求**: ユーザーが設定から再度許可できるように案内

#### 3.1.2 カレンダー一覧取得
- ユーザーがアクセス可能な全カレンダーを取得
- 各カレンダーの情報:
  - `calendarId`: 一意識別子
  - `title`: カレンダー名
  - `type`: イベント/リマインダー
  - `color`: 表示色
  - `isDefault`: デフォルトカレンダーフラグ

#### 3.1.3 イベント取得
- **期間指定**: 開始日時〜終了日時を指定してイベント取得
- **フィルターオプション**:
  - カレンダー別フィルター
  - イベントタイプ（終日/時間指定）
  - キーワード検索
- **取得データ項目**:
  ```typescript
  interface CalendarEvent {
    eventId: string;
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    startDate: Date;
    endDate: Date;
    isAllDay: boolean;
    url?: string;
    notes?: string;
    priority?: number;
    status: 'confirmed' | 'tentative' | 'cancelled';
    recurrenceRule?: string;
    attendees?: Array<{
      name: string;
      email: string;
      status: 'accepted' | 'declined' | 'pending';
    }>;
  }
  ```

### 3.2 リマインダー機能

#### 3.2.1 リマインダー取得
- 期限付きリマインダーの一覧取得
- 完了/未完了状態の取得
- 優先度情報の取得

#### 3.2.2 リマインダーデータ構造
```typescript
interface Reminder {
  reminderId: string;
  calendarId: string;
  title: string;
  notes?: string;
  dueDate?: Date;
  completed: boolean;
  completedDate?: Date;
  priority: 'none' | 'low' | 'medium' | 'high';
  url?: string;
}
```

### 3.3 ワークログとの関連付け

#### 3.3.1 自動関連付けルール
- **時間重複検出**: ワークログの時間帯と重複するイベントを自動検出
- **キーワードマッチング**: 
  - ワークログタイトル/説明とイベントタイトルの類似度計算
  - 場所情報のマッチング
- **関連度スコア**: 0.0〜1.0 で関連性を数値化

#### 3.3.2 手動関連付け
- ユーザーが手動でワークログとイベントを紐付け
- 1 つのワークログに複数のイベントを関連付け可能
- 関連付けの解除機能

#### 3.3.3 関連付けデータ構造
```typescript
interface WorkLogCalendarLink {
  linkId: string;
  workLogId: string;
  eventId: string;
  linkType: 'auto' | 'manual';
  relevanceScore: number; // 0.0 - 1.0
  createdAt: Date;
  createdBy: 'system' | 'user';
}
```

### 3.4 分析機能

#### 3.4.1 統計情報
- **予定と実働の比較**: 
  - 予定されていた会議時間 vs 実際の作業時間
  - 予定外作業時間の割合
- **カレンダー別分析**:
  - 各カレンダーのイベント参加時間
  - ワークログとの関連度分布
- **時間帯分析**:
  - 曜日・時間帯別のイベント密度
  - 集中作業可能時間の特定

#### 3.4.2 レポート出力
- 日次/週次/月次レポート
- PDF/CSV エクスポート
- 可視化グラフ（チャート表示）

---

## 4. API 設計

### 4.1 IPC ハンドラー（Main Process）

#### 4.1.1 権限管理
```typescript
// 権限状態の確認
ipcMain.handle('calendar:get-auth-status', async () => {
  return await getAuthorizationStatus();
});

// 権限の要求
ipcMain.handle('calendar:request-access', async () => {
  return await requestAccess();
});
```

#### 4.1.2 カレンダー操作
```typescript
// カレンダー一覧取得
ipcMain.handle('calendar:get-calendars', async () => {
  return await getCalendars();
});

// イベント取得
ipcMain.handle('calendar:get-events', async (_, params: {
  startDate: Date;
  endDate: Date;
  calendarIds?: string[];
}) => {
  return await getEventsWithPredicate(params);
});

// リマインダー取得
ipcMain.handle('calendar:get-reminders', async (_, params: {
  calendarIds?: string[];
  includeCompleted?: boolean;
}) => {
  return await getReminders(params);
});
```

#### 4.1.3 関連付け操作
```typescript
// 自動関連付け実行
ipcMain.handle('calendar:auto-link-logs', async (_, params: {
  workLogId?: string;
  startDate: Date;
  endDate: Date;
}) => {
  return await autoLinkWorkLogs(params);
});

// 手動関連付け追加
ipcMain.handle('calendar:add-link', async (_, data: WorkLogCalendarLink) => {
  return await addManualLink(data);
});

// 関連付け解除
ipcMain.handle('calendar:remove-link', async (_, linkId: string) => {
  return await removeLink(linkId);
});
```

#### 4.1.4 分析機能
```typescript
// 統計情報取得
ipcMain.handle('calendar:get-statistics', async (_, params: {
  startDate: Date;
  endDate: Date;
  groupBy: 'day' | 'week' | 'month' | 'calendar';
}) => {
  return await getStatistics(params);
});

// レポート生成
ipcMain.handle('calendar:generate-report', async (_, params: {
  startDate: Date;
  endDate: Date;
  format: 'pdf' | 'csv' | 'json';
}) => {
  return await generateReport(params);
});
```

### 4.2 React Hooks（Renderer）

```typescript
// カレンダー権限フック
useCalendarAuth(): {
  status: AuthStatus;
  requestAccess: () => Promise<void>;
  isLoading: boolean;
}

// イベント取得フック
useCalendarEvents(params: {
  startDate: Date;
  endDate: Date;
}): {
  events: CalendarEvent[];
  calendars: Calendar[];
  isLoading: boolean;
  error: Error | null;
}

// 関連付けフック
useWorkLogLinks(workLogId: string): {
  links: WorkLogCalendarLink[];
  addLink: (eventId: string) => Promise<void>;
  removeLink: (linkId: string) => Promise<void>;
}

// 分析フック
useCalendarAnalysis(params: AnalysisParams): {
  statistics: Statistics;
  isLoading: boolean;
}
```

---

## 5. UI 設計

### 5.1 権限許可ダイアログ
- 初回起動時に表示
- カレンダーアクセスの必要性を説明
- 「許可する」「後で」ボタン

### 5.2 カレンダー連携設定画面
- アクセス権限状態表示
- 同期対象カレンダーの選択（チェックボックス）
- 同期間隔設定（手動/自動）
- プライバシー設定（どのデータを連携するか）

### 5.3 ワークログ編集画面（拡張）
- 関連イベント表示セクション
- 候補イベントリスト（自動関連付け候補）
- 手動関連付けボタン
- 関連イベント詳細表示（ポップオーバー）

### 5.4 分析ダッシュボード
- 週間/月間ビュー切り替え
- カレンダーイベントとワークログの重ね合わせ表示
- 統計サマリーカード
  - 総会議時間
  - 集中作業時間
  - 予定達成率
- グラフ表示
  - 時間配分パイチャート
  - 推移ラインチャート

---

## 6. データベース設計

### 6.1 新規テーブル

#### 6.1.1 calendars テーブル
```sql
CREATE TABLE calendars (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('event', 'reminder')),
  color TEXT,
  is_default INTEGER DEFAULT 0,
  platform_id TEXT UNIQUE,
  last_synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.2 calendar_events テーブル
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES calendars(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_all_day INTEGER DEFAULT 0,
  url TEXT,
  notes TEXT,
  priority INTEGER,
  status TEXT CHECK(status IN ('confirmed', 'tentative', 'cancelled')),
  recurrence_rule TEXT,
  platform_id TEXT UNIQUE,
  raw_data TEXT, -- JSON 形式の生データ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_date ON calendar_events(start_date, end_date);
CREATE INDEX idx_events_calendar ON calendar_events(calendar_id);
```

#### 6.1.3 reminders テーブル
```sql
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES calendars(id),
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATETIME,
  completed INTEGER DEFAULT 0,
  completed_date DATETIME,
  priority TEXT CHECK(priority IN ('none', 'low', 'medium', 'high')),
  url TEXT,
  platform_id TEXT UNIQUE,
  raw_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminders_due ON reminders(due_date);
CREATE INDEX idx_reminders_completed ON reminders(completed);
```

#### 6.1.4 work_log_calendar_links テーブル
```sql
CREATE TABLE work_log_calendar_links (
  id TEXT PRIMARY KEY,
  work_log_id TEXT NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK(link_type IN ('auto', 'manual')),
  relevance_score REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL CHECK(created_by IN ('system', 'user')),
  UNIQUE(work_log_id, event_id)
);

CREATE INDEX idx_links_work_log ON work_log_calendar_links(work_log_id);
CREATE INDEX idx_links_event ON work_log_calendar_links(event_id);
```

### 6.2 既存テーブル変更

#### 6.2.1 settings テーブル拡張
```sql
ALTER TABLE settings ADD COLUMN calendar_sync_enabled INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN calendar_auto_link_enabled INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN calendar_sync_interval INTEGER DEFAULT 300; -- 秒
ALTER TABLE settings ADD COLUMN selected_calendar_ids TEXT; -- JSON 配列
```

---

## 7. セキュリティ・プライバシー

### 7.1 データ保護
- **ローカル保存**: すべてのカレンダーデータはローカル SQLite のみに保存
- **外部送信なし**: カレンダーデータはクラウドに送信しない
- **暗号化**: 機密性の高いデータは必要に応じて暗号化

### 7.2 アクセス権限
- **最小権限の原則**: 必要なカレンダーのみアクセス
- **明示的同意**: 初回アクセス時にユーザーの明示的な許可を取得
- **いつでも無効化**: 設定から簡単に連携を無効化可能

### 7.3 プライバシー配慮
- オプション設定:
  - イベント詳細（説明・メモ）の取得可否
  - 参加者情報の取得可否
  - 位置情報の取得可否
- デフォルトでは最小限のデータのみ取得

---

## 8. エラーハンドリング

### 8.1 想定されるエラー

#### 8.1.1 権限関連
- **AccessDeniedError**: ユーザーがアクセスを拒否
  - 対処: 設定アプリからの権限付与方法を案内
- **SystemRestrictedError**: システム制限によりアクセス不可
  - 対処: 機能を利用できないことを表示

#### 8.1.2 データ取得関連
- **EventKitError**: EventKit 内部エラー
  - 対処: 再試行ロジック、ユーザーに再試行を促す
- **NoCalendarsError**: アクセス可能なカレンダーが存在しない
  - 対処: カレンダー作成を促すメッセージ表示

#### 8.1.3 プラットフォーム関連
- **PlatformNotSupportedError**: macOS 以外での実行
  - 対処: 機能を非表示、代替手段の案内

### 8.2 エラー表示
- ユーザーフレンドリーなエラーメッセージ
- 技術詳細は開発者ツールでのみ表示
- 回復可能なエラーは自動リトライ

---

## 9. パフォーマンス最適化

### 9.1 データ取得
- **ページネーション**: 大量データの一度に取得を避ける
- **増分同期**: 前回の同期以降の変更のみ取得
- **キャッシュ戦略**: 
  - メモリキャッシュ（直近 7 日分）
  - データベースキャッシュ（全データ）

### 9.2 UI 表示
- **仮想スクロール**: 大量イベント表示時のパフォーマンス維持
- **遅延読み込み**: スクロールに応じたデータ読み込み
- **デバウンス**: フィルター変更時の過剰なクエリ防止

### 9.3 バックグラウンド処理
- **同期スケジューリング**: 
  - アプリ起動時
  - 定期的（設定間隔）
  - マニュアルトリガー
- **ワーカースレッド**: 重い処理はメインスレッドをブロックしない

---

## 10. テスト戦略

### 10.1 単体テスト
- IPC ハンドラーのモックテスト
- データ変換ロジック
- 関連付けアルゴリズム

### 10.2 統合テスト
- eventkit-node との連携（macOS 環境のみ）
- データベースとの CRUD 操作
- UI コンポーネントのレンダリング

### 10.3 E2E テスト
- 権限フローの検証
- 同期プロセスの検証
- 分析機能の端到端テスト

### 10.4 手動テスト項目
- [ ] 初回権限許可フロー
- [ ] カレンダー一覧表示
- [ ] イベント取得・表示
- [ ] 自動関連付け精度
- [ ] 手動関連付け操作
- [ ] 分析ダッシュボード表示
- [ ] 設定変更の反映
- [ ] エラーケースの挙動

---

## 11. ロードマップ

### Phase 1: 基盤実装（〜2 ヶ月）
- [ ] eventkit-node 統合
- [ ] 権限管理実装
- [ ] カレンダー・イベント取得
- [ ] データベーススキーマ実装
- [ ] 基本 IPC ハンドラー

### Phase 2: 関連付け機能（1 ヶ月）
- [ ] 自動関連付けアルゴリズム
- [ ] 手動関連付け UI
- [ ] 関連付けデータ管理

### Phase 3: 分析機能（1 ヶ月）
- [ ] 統計情報計算
- [ ] 分析ダッシュボード UI
- [ ] レポート出力機能

### Phase 4: 高度化（継続）
- [ ] リマインダー連携
- [ ] 機械学習による関連付け精度向上
- [ ] 通知機能
- [ ] クロスプラットフォーム対応（代替実装）

---

## 12. 依存関係・制約事項

### 12.1 技術的制約
- **macOS 専用**: eventkit-node が macOS のみに依存
- **Node.js ABI**: Native addon のため Node.js バージョンに注意
- **EventKit フレームワーク**: macOS 10.9 以上が必要

### 12.2 ビルド要件
- **Xcode**: macOS でのビルドに必要
- **コード署名**: Electron アプリの署名が必要
- **Entitlements**: カレンダーアクセス権限の entitlement 設定

### 12.3 将来の検討事項
- Windows/Linux 対応の場合は代替ライブラリの調査
  - Windows: Microsoft Graph API / Outlook REST API
  - Linux: Evolution Data Server / Google Calendar API
- Web 版との機能差異の明確化

---

## 13. 用語集

| 用語 | 説明 |
|------|------|
| EventKit | macOS/iOS のカレンダー・リマインダー管理フレームワーク |
| eventkit-node | EventKit にアクセスする Node.js ネイティブアドオン |
| ワークログ | ユーザーが記録した作業ログ |
| 関連付け | ワークログとカレンダーイベントの紐付け |
| 関連度スコア | ワークログとイベントの関連性を数値化したもの（0.0-1.0） |
| 増分同期 | 前回の同期以降の変更のみを取得する同期方式 |

---

## 14. 参考資料

- [eventkit-node GitHub](https://github.com/dacay/eventkit-node)
- [Apple EventKit Framework](https://developer.apple.com/documentation/eventkit)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [macOS Entitlements](https://developer.apple.com/documentation/bundleresources/entitlements)

---

**文書バージョン**: 1.0  
**最終更新日**: 2025-01-19  
**担当者**: 開発チーム
