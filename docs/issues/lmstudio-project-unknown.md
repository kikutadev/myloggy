# LM Studioでプロジェクトが不明となる問題

## 現象
LM Studioで実行すると、プロジェクトが「不明」で帰ってくる

## 調査結果

### 原因の特定

**1. APIエンドポイントとレスポンス形式の違い**

- Ollama: `/api/generate` → `{ response: "..." }`
- LM Studio: `/v1/chat/completions` → `{ choices: [{ message: { content: "..." } }] }`

**2. レスポンス処理 (`electron/core/llm.ts` 行207-212)**

```typescript
if (isLmStudio && data && typeof data === 'object' && 'choices' in data && Array.isArray(data.choices)) {
  const content = data.choices[0]?.message?.content;
  if (typeof content === 'string') {
    data = JSON.parse(extractJsonBlock(content));
  }
}
```

LM Studioのレスポンスから `content` を抽出し、JSONとしてパースしている。

**3. LLMレスポンス正規化 (`electron/core/llm-response.ts`)**

`normalizeCheckpointLlmOutput` 関数がレスポンスを正規化：
- `project_name` が見つからない場合、`undefined` を返す
- スキーマのデフォルト値（`z.string().default(locale === 'ja' ? UNKNOWN_LABEL : 'Unknown')`）が使われる

**4. プロジェクト名存储 (`electron/core/llm.ts` 行224)**

```typescript
projectName: toStoredProjectName(trimText(parsed.project_name)),
```

`parsed.project_name` が `undefined` またはデフォルト値の「不明」/「Unknown」の場合、`toStoredProjectName` に渡されるが、データベース照合時に一致するプロジェクトがない場合は「不明」として存储される。

**5. データベース照合 (`electron/core/db.ts` 行247)**

```typescript
.get(projectName) as Record<string, unknown> | undefined;
```

`projectName` でデータベース查询を行い、一致するプロジェクトがない場合は `undefined` が返される。

### 問題の根本原因

LM Studioが返すJSONレスポンスのパースまたはフィールド抽出哪こかに問題がある可能性が高い：

1. LM Studioがプロンプトの要件（`project_name` フィールド）を正しく理解和していない
2. `extractJsonBlock` がJSONを正しく抽出できていない
3. `normalizeCheckpointLlmOutput` がフィールドを正しくマッピングできていない

## 解決方法

1. **デバッグ強化**: `electron/core/llm.ts` に詳細なログを追加し、LM Studioからの生レスポンスを確認する
2. **プロンプトの明確化**: LM Studio用のプロンプトで `project_name` の必須性を強調する
3. **フォールバック処理**: `project_name` が「不明」/「Unknown」の場合、前回のチェックポイントからプロジェクト名を推測する
4. **レスポンス検証**: LM Studioのレスポンスが予期した形式かどうかを確認し、そうなっていない場合は再リクエストまたは適切なエラー処理を行う