import { describe, it, expect } from 'vitest';

import { createId, hashBuffer, floorToInterval, minutesBetween, safeJsonParse, tokenSet, overlapScore, trimText } from './utils.js';

describe('hashBuffer', () => {
  it('同じ内容のBufferは同一のハッシュを生成', () => {
    const buffer = Buffer.from('hello world');
    const hash1 = hashBuffer(buffer);
    const hash2 = hashBuffer(buffer);

    expect(hash1).toBe(hash2);
  });

  it('異なる内容のBufferは異なるハッシュを生成', () => {
    const buffer1 = Buffer.from('hello');
    const buffer2 = Buffer.from('world');

    expect(hashBuffer(buffer1)).not.toBe(hashBuffer(buffer2));
  });

  it('SHA256ハッシュを生成', () => {
    const buffer = Buffer.from('test');
    const hash = hashBuffer(buffer);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

describe('floorToInterval', () => {
  it('指定した間隔で丸める', () => {
    const result = floorToInterval('2024-01-15T10:23:00Z', 10);
    expect(result).toBe('2024-01-15T10:20:00.000Z');
  });

  it('interval分钟で丁度良く丸まる', () => {
    const result = floorToInterval('2024-01-15T10:30:00Z', 10);
    expect(result).toBe('2024-01-15T10:30:00.000Z');
  });
});

describe('minutesBetween', () => {
  it('2つの時間の差分を分수로返す', () => {
    const result = minutesBetween('2024-01-15T10:00:00Z', '2024-01-15T11:30:00Z');
    expect(result).toBe(90);
  });

  it('1分以下の場合は最低1を返す', () => {
    const result = minutesBetween('2024-01-15T10:00:00Z', '2024-01-15T10:00:30Z');
    expect(result).toBe(1);
  });
});

describe('safeJsonParse', () => {
  it('有効なJSONをパース', () => {
    const result = safeJsonParse('{"key":"value"}', {});
    expect(result).toEqual({ key: 'value' });
  });

  it('無効なJSONはフォールバック値を返す', () => {
    const result = safeJsonParse('not json', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('nullはフォールバック値を返す', () => {
    const result = safeJsonParse(null, 'fallback');
    expect(result).toBe('fallback');
  });
});

describe('tokenSet', () => {
  it('テキストをトークン集合に変換', () => {
    const result = tokenSet('Hello World Hello');
    expect(result.has('hello')).toBe(true);
    expect(result.has('world')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('日本語も処理', () => {
    const result = tokenSet('開発 タスク 開発');
    expect(result.has('開発')).toBe(true);
    expect(result.has('タスク')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('空白文字を除去', () => {
    const result = tokenSet('  hello   world  ');
    expect(result.has('hello')).toBe(true);
    expect(result.has('world')).toBe(true);
  });
});

describe('overlapScore', () => {
  it('完全一致はスコア1', () => {
    const result = overlapScore('hello world', 'hello world');
    expect(result).toBe(1);
  });

  it('一部一致はスコア0.33程度', () => {
    const result = overlapScore('hello world foo', 'hello bar baz');
    expect(result).toBeCloseTo(0.33, 1);
  });

  it('重複なしはスコア0', () => {
    const result = overlapScore('abc', 'xyz');
    expect(result).toBe(0);
  });
});

describe('trimText', () => {
  it('文字列の前後の空白を除去', () => {
    const result = trimText('  hello  ');
    expect(result).toBe('hello');
  });

  it('nullは空文字を返す', () => {
    expect(trimText(null)).toBe('');
  });

  it('undefinedは空文字を返す', () => {
    expect(trimText(undefined)).toBe('');
  });
});