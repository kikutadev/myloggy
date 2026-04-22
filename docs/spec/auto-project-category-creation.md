# プロジェクト・カテゴリの LLM 自動作成仕様

## 背景・問題

現状、チェックポイント生成時の `project_name` と `category` は以下の制約がある:

1. **プロジェクト名**: 既知のプロジェクト一覧（`knownProjects`）に含まれるもののみを使用するよう LLM に指示している。該当しない場合は「不明」にするよう縛っている。
2. **カテゴリ**: ユーザー設定の `categories` リストからのみ選択するよう LLM に指示している。該当しない場合は「不明」にするよう縛っている。

結果として、新しい作業に取り組んだ際にプロジェクト名やカテゴリが常に「不明」になってしまい、ユーザーが手動で編集するまで正確な記録が行われない。

## 目標

LLM が状況に応じて**新しいプロジェクト名やカテゴリを自由に命名・作成できる**ようにし、作業ログの自動分類精度を向上させる。

## 詳細仕様

### 1. プロンプトの変更

`buildPrompt()` 内のプロジェクト名・カテゴリに関する指示を緩和する。

#### プロジェクト名
**Before:**
```
既知のプロジェクト:
- {project1}
- {project2}
上記に該当する場合はその project_name を使うこと。該当しない場合のみ「不明」にすること。
```

**After:**
```
既知のプロジェクト:
- {project1}
- {project2}

上記に該当する場合はその project_name を使うこと。
該当しない場合は、画面内容から作業内容を推定し、適切なプロジェクト名を**新規に命名**してよい。
命名ルール:
- 簡潔かつ具体的な名称（例: "myloggy改修", "顧客A向け提案資料作成"）
- 既知のプロジェクトと明らかに別物の場合のみ新規命名すること
- 判断できない場合のみ「不明」にすること
```

#### カテゴリ
**Before:**
```
カテゴリ候補:
- {category1}
- {category2}
上記から最も該当する category を選ぶこと。該当しない場合のみ「不明」にすること。
```

**After:**
```
既存カテゴリ:
- {category1}
- {category2}

上記に該当する場合はその category を使うこと。
該当しない場合は、作業の性質に応じて**新しいカテゴリを命名**してよい。
命名ルール:
- 作業の性質を表す簡潔な名称（例: "デザイン作業", "顧客対応", "環境構築"）
- 既存カテゴリと重複しない新しい概念のみ命名すること
- 判断できない場合のみ「不明」にすること
```

### 2. LLM 返答の正規化・バリデーション

`analyzeWindow()` 内の処理を以下のように変更する:

#### プロジェクト名
```typescript
let projectName = toStoredProjectName(trimText(parsed.project_name));
// 変更前: 不明なら前回のプロジェクト名にフォールバック
// 変更後: 不明かつ継続の場合のみ前回のプロジェクト名にフォールバック
if (isUnknownLabel(projectName) && previousCheckpoint && parsed.continuity === 'continue') {
  projectName = previousCheckpoint.projectName;
}
// 新規プロジェクト名として受け入れる（toStoredProjectName で正規化済み）
```

#### カテゴリ
```typescript
let category = toStoredCategoryLabel(trimText(parsed.category));
if (!category || isUnknownLabel(category)) {
  category = UNKNOWN_LABEL;
}
// 既存カテゴリリストにない新規カテゴリもそのまま受け入れる
```

### 3. 新規作成の検出と保存

#### 新規プロジェクト名の検出
`analyzeWindow()` 完了後、返却された `CheckpointRecord` の `projectName` が `knownProjects` に含まれていない場合、**新規プロジェクト**として検出する。

```typescript
// tracker-service.ts 側の呼び出し後
const isNewProject = !knownProjects.includes(checkpoint.projectName) && !isUnknownLabel(checkpoint.projectName);
if (isNewProject) {
  // 新規プロジェクト名を knownProjects に追加（メモリ上）
  // 次回の analyzeWindow 呼び出し時にプロンプトに含まれるようになる
}
```

#### 新規カテゴリの検出と保存
`CheckpointRecord` の `category` が `settings.categories` に含まれていない場合、**新規カテゴリ**として検出する。

```typescript
const isNewCategory = !settings.categories.includes(checkpoint.category) && !isUnknownLabel(checkpoint.category);
if (isNewCategory) {
  // settings.categories に追加して DB に保存
  const updatedCategories = [...settings.categories, checkpoint.category];
  db?.updateSettings({ ...settings, categories: updatedCategories });
  // 次回の analyzeWindow 呼び出し時にプロンプトに含まれるようになる
}
```

### 4. カテゴリルールの自動学習

新規プロジェクト名が作成された場合、プロジェクト名とカテゴリの対応を `category_rules` テーブルに自動保存する。

```typescript
// category_rules テーブルへの自動 upsert
if (!isUnknownLabel(checkpoint.projectName) && !isUnknownLabel(checkpoint.category)) {
  db?.upsertCategoryRule(checkpoint.projectName, checkpoint.category);
}
```

これにより、同じプロジェクト名が次回出現した際に、前回のカテゴリを参照できる。

### 5. UI 側の変更

#### 設定画面（CategoryEditor）
- 新規カテゴリが自動作成されたことを示すインジケーターを追加
- ユーザーが自動作成されたカテゴリを確認・削除・改名できるようにする

#### 日次/週次/月次ビュー
- 新規プロジェクト名やカテゴリが自動作成された場合、初回表示時に「新規」バッジを表示
- ユーザーが手動で修正した場合はバッジを非表示にする

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `electron/core/llm.ts` | `buildPrompt` の指示文変更、新規作成許可の追加 |
| `electron/core/tracker-service.ts` | 新規プロジェクト/カテゴリの検出、設定保存、カテゴリルールの自動学習 |
| `electron/core/db/repositories/settings.ts` | `categories` 更新メソッドの追加（必要に応じて） |
| `electron/core/db/repositories/category-rules.ts` | 既存 `upsert` メソッドを利用 |
| `src/features/Settings/CategoryEditor.tsx` | 自動作成カテゴリの表示・管理UI |
| `src/features/Settings/useSettings.ts` | カテゴリ自動追加のハンドリング |
| `src/features/DayView/DayView.tsx` など | 新規バッジ表示（オプション） |
| `electron/core/llm.test.ts` | 新規プロジェクト名・カテゴリ作成のテスト追加 |

## テスト観点

1. **プロンプト変更の確認**
   - プロンプトに「新規命名してよい」という指示が含まれていること
   - 命名ルールが含まれていること

2. **新規プロジェクト名の作成**
   - 既知プロジェクトにない作業内容で、LLM が新規プロジェクト名を返した場合、それが正規化されて保存されること
   - 既知プロジェクトに該当する場合は、既存のプロジェクト名が使用されること

3. **新規カテゴリの作成**
   - 既存カテゴリにない作業内容で、LLM が新規カテゴリを返した場合、設定に自動追加されること
   - 既存カテゴリに該当する場合は、既存カテゴリが使用されること

4. **フォールバック動作**
   - 「不明」と返された場合、前回チェックポイントの継続時のみ前回プロジェクト名にフォールバックすること
   - それ以外の場合は「不明」のまま保存されること

5. **カテゴリルールの自動学習**
   - 新規プロジェクト名とカテゴリの組み合わせが `category_rules` に保存されること
   - 次回同じプロジェクト名が出現した際に、保存されたカテゴリが参照されること

6. **設定の永続化**
   - アプリ再起動後も、自動作成されたカテゴリが設定に残っていること
   - 自動作成されたプロジェクト名が次回以降の `knownProjects` に含まれていること

## 注意事項

- **命名の一貫性**: LLM によって同じ作業でも異なるプロジェクト名が付けられる可能性がある。ユーザーが手動で統合・改名できるUIを維持する必要がある。
- **カテゴリの増殖**: 自動作成によりカテゴリが無限に増える可能性がある。設定画面でユーザーが定期的に整理できるようにする。
- **プライバシー**: LLM が画面内容からプロジェクト名を推定するため、機密情報を含む画面の場合はユーザーに注意喚起が必要（既存の除外機能と併用）。
