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

1. `.analysis-error-banner` のレスポンシブスタイルを修正し、小画面でも適切なパディングと配置を維持する
2. `fallbackMessage` 表示の場合もタイムスタンプまたは「エラー」等のラベルを表示する
3. エラーメッセージの最大幅を設定し、長いメッセージも省略表示できるようにする
4. または、エラーバナーのflex布局を改善し、エラーメッセージの折り返しを制御する