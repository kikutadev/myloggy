import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('LM Studio 接続チェックの振る舞い', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('LM Studio起動中ならmodels一覧取得可能', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'llama-3.1-8b' }, { id: 'qwen-2.5-14b' }],
      }),
    } as unknown as Response);

    const result = await checkLmStudio('http://127.0.0.1:1234');

    expect(result.running).toBe(true);
    expect(result.models).toEqual(['llama-3.1-8b', 'qwen-2.5-14b']);
  });

  it('LM Studio未起動なら空一覧', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new Error('connection refused'));

    const result = await checkLmStudio('http://127.0.0.1:1234');

    expect(result.running).toBe(false);
    expect(result.models).toEqual([]);
  });

  it('LM Studio起動 但是APIエラーなら空一覧', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const result = await checkLmStudio('http://127.0.0.1:1234');

    expect(result.running).toBe(false);
    expect(result.models).toEqual([]);
  });

  it('カスタムホストで接続チェック', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'model-a' }],
      }),
    } as unknown as Response);

    const result = await checkLmStudio('http://192.168.1.50:1234');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.50:1234/v1/models',
      expect.any(Object)
    );
  });
});

async function checkLmStudio(host: string): Promise<{ running: boolean; models: string[] }> {
  try {
    const res = await fetch(`${host}/v1/models`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { running: false, models: [] };
    const data = (await res.json()) as { data?: { id: string }[] };
    const models = (data.data ?? []).map((m) => m.id);
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
}