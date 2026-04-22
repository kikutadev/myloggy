# エラーが発生した時の表示サイズがおかしい

## 現象
エラー发生时、表示サイズが正しくない

## 調査結果

### 原因の特定

**1. CSSの問題 (`src/styles.css`)**

`.analysis-error-banner` コンポーネント（行102-137）のスタイル定義に問題がある：

- 通常時: `padding: 10px 24px 10px 84px;`（行107）
- レスポンシブ（680px以下）: `padding: 10px 12px;` + `align-items: flex-start;`（行901）

**2. コンポーネントの問題 (`AnalysisErrorBanner.tsx`)**

エラーバナー表示の条件（行32-34）:
```tsx
{error ? `${formatTime(error.createdAt)} ` : ''}
{summary}
```

- `error` オブジェクトが存在する場合のみタイムスタンプを表示
- `fallbackMessage` のみ表示の場合はタイムスタンプなし
- エラーメッセージが長い場合、`.analysis-error-copy span` で `text-overflow: ellipsis` と `white-space: nowrap`（行127-129）が適用され、小さい画面では `white-space: normal`（行903）に変わるが、レイアウトが崩れる場合がある

**3. 表示条件の混在**

`AppScreen.tsx` 行114-116:
```tsx
error={state.pendingSnapshots > 0 ? latestAnalysisError : null}
fallbackMessage={state.pendingSnapshots > 0 && !latestAnalysisError ? state.lastError : null}
```

`pendingSnapshots > 0` の条件が両方に共通しているため、エラーがあるときとそうでないときで表示が切り替わるがサイズの調整がない。

## 解決方法

**対応完了**

1. `.analysis-error-banner` のレスポンシブスタイルを修正済み（行901-903）
   - `align-items: stretch` に変更（子要素の配置を維持）
   - `.analysis-error-copy` に `flex-wrap: wrap` を追加（折り返しを許可）
   - `.analysis-error-copy span` の `white-space: normal` を `word-break: break-word` に変更（単語の途中で改行しない）

2. エラーメッセージが長い場合でも適切に折り返されるようになった