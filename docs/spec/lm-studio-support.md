# LM Studio 対応仕様

## 修正対象ファイルのリスト

1. `shared/types.ts` - タイプ定義の追加
2. `shared/api.ts` - APIメソッド名の変更
3. `electron/core/defaults.ts` - デフォルト設定の追加
4. `electron/main.ts` - LM Studio接続チェックの実装
5. `electron/preload.ts` - IPCハンドラ名の変更
6. `electron/core/llm.ts` - LLM呼び出しロジックの切替
7. `src/App.tsx` - UIの追加（LM Studio選択UI）
8. `src/i18n.tsx` - 日本語/英語テキストの追加

## 修正の提案

### 1. shared/types.ts

新しいプロバイダータイプと設定を追加:

```typescript
export type LlmProvider = 'ollama' | 'lmstudio';

export interface AppSettings {
  // ... existing fields ...
  llmProvider: LlmProvider;  // 既存ollamaHostの代わりに追加
  lmstudioHost: string;    // LM Studio用URL (デフォルト: http://127.0.0.1:1234)
}

export interface LmStudioStatus {
  running: boolean;
  models: string[];
}
```

### 2. shared/api.ts

API名を一般化:

```typescript
export interface DesktopApi {
  // ... existing methods ...
  checkLlmProvider(): Promise<OllamaStatus | LmStudioStatus>;  // プロバイダー切替
  testModel(params: { model: string; provider: LlmProvider; host: string }): Promise<ModelCheckResult>;
}
```

### 3. electron/core/defaults.ts

デフォルト設定:

```typescript
export const DEFAULT_SETTINGS: AppSettings = {
  // ... existing fields ...
  llmProvider: 'ollama',
  lmstudioHost: 'http://127.0.0.1:1234',
};
```

### 4. electron/main.ts

LM Studio接続チェックの実装:

```typescript
ipcMain.handle('lmstudio:check', async () => {
  const settings = requireTracker().getSettings();
  try {
    const res = await fetch(`${settings.lmstudioHost}/v1/models`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { running: false, models: [] };
    const data = (await res.json()) as { data?: { id: string }[] };
    const models = (data.data ?? []).map((m) => m.id);
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
});

ipcMain.handle('lmstudio:test-model', async (_event, params: { model: string; lmstudioHost: string }) => {
  // LM StudioはOpenAI互換API: /v1/chat/completions または /v1/completions
});
```

### 5. electron/preload.ts

IPCハンドラを追加:

```typescript
checkLmstudio: () => ipcRenderer.invoke('lmstudio:check') as Promise<LmStudioStatus>,
testLmstudioModel: (params) => ipcRenderer.invoke('lmstudio:test-model', params),
```

### 6. electron/core/llm.ts

プロバイダーによる切替:

```typescript
async function callLlm(prompt: string, images: string[]) {
  const settings = requireTracker().getSettings();
  const { llmProvider, lmstudioHost, llmModel } = settings;

  if (llmProvider === 'lmstudio') {
    // LM Studio: OpenAI互換API
    const response = await fetch(`${lmstudioHost}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmModel,
        messages: [{ role: 'user', content: prompt }],
        images,  // LM Studioではmediaは別形式で渡場合あり
        temperature: 0.1,
      }),
    });
  } else {
    // Ollama: /api/generate
  }
}
```

### 7. src/App.tsx

UIにプロバイダー切替を追加:

```tsx
// 設定画面にラジオボタン追加
<label>
  <input
    type="radio"
    checked={draft.llmProvider === 'ollama'}
    onChange={() => setDraft({ ...draft, llmProvider: 'ollama' })}
  />
  Ollama
</label>
<label>
  <input
    type="radio"
    checked={draft.llmProvider === 'lmstudio'}
    onChange={() => setDraft({ ...draft, llmProvider: 'lmstudio' })}
  />
  LM Studio
</label>

// ホスト入力欄はプロバイダーに応じて表示切替
{draft.llmProvider === 'ollama' ? (
  <input value={draft.ollamaHost} onChange={(e) => setDraft({ ...draft, ollamaHost: e.target.value })} />
) : (
  <input value={draft.lmstudioHost} onChange={(e) => setDraft({ ...draft, lmstudioHost: e.target.value })} />
)}
```

### 8. src/i18n.tsx

テキストを追加:

```typescript
ja: {
  // ...
  llmProvider: 'LLMプロバイダー',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  lmstudioRunning: 'LM Studio 起動中',
  lmstudioMissing: 'LM Studio が見つかりません',
  installLmstudioSub: 'またはlmstudio.aiからダウンロードしてください。',
},
en: {
  // ...
  llmProvider: 'LLM Provider',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  lmstudioRunning: 'LM Studio is running',
  lmstudioMissing: 'LM Studio was not found',
  installLmstudioSub: 'Or download it from lmstudio.ai.',
}
```

## APIエンドポイントの違い

| 機能 | Ollama | LM Studio |
|------|-------|----------|
| モデル一覧 | `/api/tags` | `/v1/models` |
| 推論 | `/api/generate` | `/v1/chat/completions` |
| レスポンス形式 | `{ response: "..." }` | `{ choices: [{ message: { content: "..." } }] }` |

## 互換性のポイント

- LM StudioはOpenAI互換APIを提供
- `model`パラメータはLM StudioでダウンロードしたモデルIDを使用
- 画像認識対応はモデル依存