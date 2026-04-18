import { describe, it, expect } from 'vitest';

import {
  isSupportedLocale,
  normalizeLocale,
  resolveLocalePreference,
  isUnknownLabel,
  localizeCategoryLabel,
  toStoredCategoryLabel,
  localizeUnknownLabel,
  localizeProjectName,
  toStoredProjectName,
  localizeUnknownTaskLabel,
  localizeInsufficientInfoSummary,
  localizeIdleTaskLabel,
  localizeIdleSummary,
  localizeIdleEvidence,
  buildMonthComment,
  localizeSnapshotStatus,
  localizeProgressLevel,
  isLegacyDistractedCategory,
  DEFAULT_CATEGORIES,
} from './localization.js';

describe('isSupportedLocale', () => {
  it('returns true for ja', () => {
    expect(isSupportedLocale('ja')).toBe(true);
  });

  it('returns true for en', () => {
    expect(isSupportedLocale('en')).toBe(true);
  });

  it('returns false for other values', () => {
    expect(isSupportedLocale('en-US')).toBe(false);
    expect(isSupportedLocale('ja-JP')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});

describe('normalizeLocale', () => {
  it('normalizes ja variants to ja', () => {
    expect(normalizeLocale('ja')).toBe('ja');
    expect(normalizeLocale('ja-JP')).toBe('ja');
    expect(normalizeLocale('ja_JP')).toBe('ja');
    expect(normalizeLocale(' ja ')).toBe('ja');
  });

  it('normalizes en variants to en', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('en_GB')).toBe('en');
  });

  it('defaults to en for unknown', () => {
    expect(normalizeLocale('xyz')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });
});

describe('resolveLocalePreference', () => {
  it('prefers explicit value', () => {
    expect(resolveLocalePreference('ja', 'en')).toBe('ja');
  });

  it('falls back to fallback', () => {
    expect(resolveLocalePreference(null, 'ja')).toBe('ja');
    expect(resolveLocalePreference(undefined, 'en')).toBe('en');
  });
});

describe('isUnknownLabel', () => {
  it('returns true for unknown labels', () => {
    expect(isUnknownLabel('不明')).toBe(true);
    expect(isUnknownLabel('Unknown')).toBe(true);
  });

  it('returns false for other labels', () => {
    expect(isUnknownLabel('開発')).toBe(false);
    expect(isUnknownLabel('Development')).toBe(false);
  });
});

describe('localizeCategoryLabel', () => {
  it('localizes to Japanese', () => {
    expect(localizeCategoryLabel('development', 'ja')).toBe('開発');
    expect(localizeCategoryLabel('research', 'ja')).toBe('調査・情報収集');
  });

  it('localizes to English', () => {
    expect(localizeCategoryLabel('development', 'en')).toBe('Development');
    expect(localizeCategoryLabel('research', 'en')).toBe('Research');
  });

  it('returns original if not found', () => {
    expect(localizeCategoryLabel('unknown-category', 'en')).toBe('unknown-category');
  });
});

describe('toStoredCategoryLabel', () => {
  it('converts to stored label', () => {
    expect(toStoredCategoryLabel('Development')).toBe('開発');
    expect(toStoredCategoryLabel('dev')).toBe('開発');
  });

  it('returns trimmed value', () => {
    expect(toStoredCategoryLabel('  Development  ')).toBe('開発');
  });

  it('returns empty for empty', () => {
    expect(toStoredCategoryLabel('')).toBe('');
  });
});

describe('localizeUnknownLabel', () => {
  it('localizes to Japanese', () => {
    expect(localizeUnknownLabel('ja')).toBe('不明');
  });

  it('localizes to English', () => {
    expect(localizeUnknownLabel('en')).toBe('Unknown');
  });
});

describe('localizeProjectName', () => {
  it('localizes unknown to localized unknown label', () => {
    expect(localizeProjectName('不明', 'ja')).toBe('不明');
    expect(localizeProjectName('Unknown', 'en')).toBe('Unknown');
  });

  it('returns trimmed name', () => {
    expect(localizeProjectName('  myloggy  ', 'en')).toBe('myloggy');
  });
});

describe('toStoredProjectName', () => {
  it('normalizes unknown to UNKNOWN_LABEL', () => {
    expect(toStoredProjectName('不明')).toBe('不明');
    expect(toStoredProjectName('Unknown')).toBe('不明');
  });

  it('returns trimmed name', () => {
    expect(toStoredProjectName('  myloggy  ')).toBe('myloggy');
  });

  it('returns UNKNOWN_LABEL for empty', () => {
    expect(toStoredProjectName('')).toBe('不明');
    expect(toStoredProjectName(null)).toBe('不明');
    expect(toStoredProjectName(undefined)).toBe('不明');
  });
});

describe('localizeUnknownTaskLabel', () => {
  it('localizes to Japanese', () => {
    expect(localizeUnknownTaskLabel('ja')).toBe('状況不明');
  });

  it('localizes to English', () => {
    expect(localizeUnknownTaskLabel('en')).toBe('Unknown task');
  });
});

describe('localizeInsufficientInfoSummary', () => {
  it('localizes to Japanese', () => {
    expect(localizeInsufficientInfoSummary('ja')).toBe('判定できる情報が不足している。');
  });

  it('localizes to English', () => {
    expect(localizeInsufficientInfoSummary('en')).toBe('Not enough information was available to classify the work.');
  });
});

describe('localizeIdleTaskLabel', () => {
  it('localizes to Japanese', () => {
    expect(localizeIdleTaskLabel('ja')).toBe('操作なし');
  });

  it('localizes to English', () => {
    expect(localizeIdleTaskLabel('en')).toBe('No activity');
  });
});

describe('localizeIdleSummary', () => {
  it('localizes to Japanese', () => {
    expect(localizeIdleSummary('ja')).toBe('カーソルの移動が検出されなかったため、自動的に休憩と判定。');
  });

  it('localizes to English', () => {
    expect(localizeIdleSummary('en')).toBe('No cursor movement was detected, so this window was classified as a break.');
  });
});

describe('localizeIdleEvidence', () => {
  it('localizes to Japanese', () => {
    expect(localizeIdleEvidence('ja')).toBe('カーソル位置が全スナップショットで同一');
  });

  it('localizes to English', () => {
    expect(localizeIdleEvidence('en')).toBe('The cursor stayed in the same position across all snapshots.');
  });
});

describe('buildMonthComment', () => {
  it('localizes to Japanese with top category', () => {
    expect(buildMonthComment({ locale: 'ja', month: '2026-04', topCategory: '開発', topProject: 'myloggy' })).toBe(
      '4月は「開発」が中心で、主な軸は「myloggy」です。'
    );
  });

  it('localizes to English with top category', () => {
    expect(buildMonthComment({ locale: 'en', month: '2026-04', topCategory: 'Development', topProject: 'myloggy' })).toBe(
      'April focused on Development, mainly around myloggy.'
    );
  });

  it('returns message for no data in Japanese', () => {
    expect(buildMonthComment({ locale: 'ja', month: '2026-04', topCategory: null })).toBe('4月はまだ十分な作業ログがありません。');
  });

  it('returns message for no data in English', () => {
    expect(buildMonthComment({ locale: 'en', month: '2026-04', topCategory: null })).toBe('There is not enough work log data for April yet.');
  });

  
});

describe('localizeSnapshotStatus', () => {
  it('localizes captured to Japanese', () => {
    expect(localizeSnapshotStatus('captured', 'ja')).toBe('取得済み');
  });

  it('localizes processed to Japanese', () => {
    expect(localizeSnapshotStatus('processed', 'ja')).toBe('処理済み');
  });

  it('localizes analysis_failed to Japanese', () => {
    expect(localizeSnapshotStatus('analysis_failed', 'ja')).toBe('解析失敗');
  });

  it('localizes excluded to Japanese', () => {
    expect(localizeSnapshotStatus('excluded', 'ja')).toBe('除外');
  });

  it('localizes captured to English', () => {
    expect(localizeSnapshotStatus('captured', 'en')).toBe('Captured');
  });

  it('returns original for unknown status', () => {
    expect(localizeSnapshotStatus('unknown_status', 'en')).toBe('unknown_status');
  });
});

describe('localizeProgressLevel', () => {
  it('localizes to Japanese', () => {
    expect(localizeProgressLevel('低', 'ja')).toBe('低');
    expect(localizeProgressLevel('中', 'ja')).toBe('中');
    expect(localizeProgressLevel('高', 'ja')).toBe('高');
  });

  it('localizes to English', () => {
    expect(localizeProgressLevel('低', 'en')).toBe('Low');
    expect(localizeProgressLevel('中', 'en')).toBe('Medium');
    expect(localizeProgressLevel('高', 'en')).toBe('High');
  });
});

describe('isLegacyDistractedCategory', () => {
  it('returns true for legacy distracted label', () => {
    expect(isLegacyDistractedCategory('脱線')).toBe(true);
    expect(isLegacyDistractedCategory('Distracted')).toBe(true);
  });

  it('returns false for other labels', () => {
    expect(isLegacyDistractedCategory('開発')).toBe(false);
    expect(isLegacyDistractedCategory(null)).toBe(false);
  });
});

describe('DEFAULT_CATEGORIES', () => {
  it('excludes unknown and legacyDistracted', () => {
    expect(DEFAULT_CATEGORIES).toContain('開発');
    expect(DEFAULT_CATEGORIES).toContain('調査・情報収集');
    expect(DEFAULT_CATEGORIES).not.toContain('不明');
    expect(DEFAULT_CATEGORIES).not.toContain('脱線');
  });
});