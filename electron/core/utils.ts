import crypto from 'node:crypto';
import dayjs from 'dayjs';

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function floorToInterval(iso: string, intervalMinutes: number): string {
  const time = dayjs(iso);
  const flooredMinute = Math.floor(time.minute() / intervalMinutes) * intervalMinutes;
  return time.minute(flooredMinute).second(0).millisecond(0).toISOString();
}

export function minutesBetween(startAt: string, endAt: string): number {
  return Math.max(1, dayjs(endAt).diff(dayjs(startAt), 'minute'));
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/i)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

export function overlapScore(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

export function trimText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}
