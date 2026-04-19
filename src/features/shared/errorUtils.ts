import type { SupportedLocale } from '../../../shared/localization.js';

export function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function formatIssueLabel(path: unknown, locale: SupportedLocale): string {
  const parts = Array.isArray(path) ? path.map(String) : [];
  const root = parts[0];

  if (root === 'evidence') {
    return locale === 'ja' ? '根拠データ' : 'evidence';
  }
  if (root === 'confidence') {
    return locale === 'ja' ? '信頼度' : 'confidence';
  }
  if (typeof root === 'string' && root) {
    return root;
  }
  return locale === 'ja' ? '返答形式' : 'response format';
}

export function translateStructuredIssue(
  issue: { code?: unknown; expected?: unknown; received?: unknown; maximum?: unknown; path?: unknown; message?: unknown },
  locale: SupportedLocale,
): string {
  const label = formatIssueLabel(issue.path, locale);

  if (locale === 'ja') {
    if (issue.code === 'invalid_type' && issue.expected === 'string' && issue.received === 'object') {
      return `${label}がテキストではなくオブジェクトで返されました`;
    }
    if (issue.code === 'invalid_type' && issue.expected === 'number') {
      return `${label}が数値として返されませんでした`;
    }
    if (issue.code === 'too_big' && typeof issue.maximum === 'number') {
      return `${label}が多すぎます（最大${issue.maximum}件）`;
    }
  } else {
    if (issue.code === 'invalid_type' && issue.expected === 'string' && issue.received === 'object') {
      return `${label} came back as an object instead of text`;
    }
    if (issue.code === 'invalid_type' && issue.expected === 'number') {
      return `${label} was not returned as a number`;
    }
    if (issue.code === 'too_big' && typeof issue.maximum === 'number') {
      return `${label} has too many items (max ${issue.maximum})`;
    }
  }

  return typeof issue.message === 'string' ? issue.message : locale === 'ja' ? '返答形式が不正です' : 'Invalid response format';
}

export function summarizeErrorMessage(message: string, locale: SupportedLocale): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed.find((item) => typeof item === 'object' && item !== null) as
        | { path?: unknown; message?: unknown }
        | undefined;
      const detail = first ? translateStructuredIssue(first, locale) : trimmed;
      const suffix = parsed.length > 1 ? (locale === 'ja' ? `（ほか${parsed.length - 1}件）` : ` (+${parsed.length - 1})`) : '';
      return compactText(`${detail}${suffix}`);
    }
  } catch {
    // Ignore JSON parsing failures and fall back to plain text.
  }

  const firstLine = trimmed.split('\n')[0] ?? trimmed;
  return compactText(firstLine);
}