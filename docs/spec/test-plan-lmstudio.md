# LM Studio 対応 テスト計画

## テストフレームワーク

Vitest を使用。

**インストール:**
```bash
pnpm add -D vitest
```

**実行:**
```bash
pnpm vitest run
# または watch モード
pnpm vitest
```

---

## 実装済み ✅ (振る舞いのテスト)

### 完了したテスト

| ファイル | テスト内容 | 状態 |
|---------|----------|------|
| `electron/core/__tests__/llm-provider.test.ts` | Provider切替でAPI先が変わる | ✅ |
| `electron/core/__tests__/lmstudio-check.test.ts` | 接続チェックの振る舞い | ✅ |
| `electron/core/llm-response.test.ts` | vitestに変換 | ✅ |

---

## 次のタスク

### 5. main.ts に LM Studio 接続チェック IPC を追加

- `lmstudio:check` ハンドラの実装
- `lmstudio:test-model` ハンドラの実装

### 6. preload.ts に LM Studio IPC メソッドを追加

- `checkLmstudio()` 
- `testLmstudioModel()`

### 7. src/App.tsx に プロバイダー選択UIを追加

- ラジオボタンで Ollama / LM Studio 切替
- ホスト入力欄 provider 応じて表示切替

### 8. src/i18n.tsx にテキスト追加

- llmProvider, lmstudioRunning, lmstudioMissing 等