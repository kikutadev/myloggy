# カテゴリ自動分類の LLM プロンプト改善仕様

## 背景・問題

現状、チェックポイント生成時のカテゴリは常に `不明` で固定されており、LLM にカテゴリの推論を依頼していない。結果として、ユーザーが手動でカテゴリを変更するまで正しい分類が行われない。

根本原因は以下の 3 点:
1. `buildPrompt()` に利用可能なカテゴリ一覧を渡していない
2. `createCheckpointSchema` に `category` フィールドが存在しない
3. `analyzeWindow()` で `category: UNKNOWN_LABEL` をハードコードしている

## 修正内容

### 1. プロンプトにカテゴリ一覧を含める

`buildPrompt()` の引数に `categories: string[]` を追加し、プロンプトに以下のブロックを挿入する:

**日本語の場合:**
```
カテゴリ候補:
- 開発
- 調査・情報収集
- ...（settings.categories の内容）
上記から最も該当する category を選ぶこと。該当しない場合のみ「不明」にすること。
```

**英語の場合:**
```
Category candidates:
- Development
- Research
- ...（settings.categories の内容）
Choose the most appropriate category from the list above. Only use "Unknown" if none apply.
```

### 2. JSON Schema に category キーを追加

`createCheckpointSchema` に以下を追加:
```ts
category: z.string().default(UNKNOWN_LABEL),
```

### 3. LLM 返答からカテゴリを取得・正規化

`analyzeWindow()` 内で、ハードコードされた `UNKNOWN_LABEL` の代わりに LLM の返答を使用する:
```ts
let category = toStoredCategoryLabel(trimText(parsed.category));
if (!category || isUnknownLabel(category)) {
  category = UNKNOWN_LABEL;
}
```

`toStoredCategoryLabel` は `shared/localization.ts` で定義されており、別名・英語表記から正規の日本語ラベル（例: `Development` → `開発`）への変換を行う。

### 4. フォールバック戦略

- LLM が `category` を返さない、または空の場合 → `UNKNOWN_LABEL`（既存動作と同等）
- 未知の文字列が返された場合 → `toStoredCategoryLabel` がそのまま返す（既存の学習ルールで後から補正可能）
- `isUnknownLabel(category)` の場合 → `UNKNOWN_LABEL`

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `electron/core/llm.ts` | `buildPrompt` に `categories` 引数追加、スキーマ拡張、`analyzeWindow` でカテゴリ取得 |
| `electron/core/llm.test.ts` | `baseSettings` に `categories` 追加、プロンプト含否・カテゴリ正規化のテスト追加 |
| `electron/core/__tests__/llm-provider.test.ts` | `createSettings` の `categories` は既存で `[]`、必要に応じて補完 |

## テスト観点

1. プロンプトに `settings.categories` の内容が含まれること（ja/en 両ロケール）
2. LLM が正しいカテゴリを返した場合、`toStoredCategoryLabel` で正規化された値が `CheckpointRecord.category` に入ること
3. LLM がカテゴリを返さない場合、`UNKNOWN_LABEL` にフォールバックすること
4. 既存の project_name フォールバック等のロジックに影響がないこと
