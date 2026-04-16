import dayjs from 'dayjs';

import type { AppSettings } from '../../shared/types.js';

export interface ExclusionDecision {
  excluded: boolean;
  reason: string | null;
}

export function getDomain(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function shouldExcludeSnapshot(
  settings: AppSettings,
  metadata: {
    activeApp: string | null;
    url: string | null;
    capturedAt: string;
  },
): ExclusionDecision {
  const normalizedApp = metadata.activeApp?.trim().toLowerCase() ?? '';
  const appMatch = settings.excludedApps.find((item) => normalizedApp.includes(item.toLowerCase()));
  if (appMatch) {
    return { excluded: true, reason: `app:${appMatch}` };
  }

  const domain = getDomain(metadata.url);
  const domainMatch = domain
    ? settings.excludedDomains.find((item) => domain.endsWith(item.trim().toLowerCase()))
    : null;
  if (domainMatch) {
    return { excluded: true, reason: `domain:${domainMatch}` };
  }

  const current = dayjs(metadata.capturedAt);
  const currentMinutes = current.hour() * 60 + current.minute();
  const timeMatch = settings.excludedTimeBlocks.find((block) => {
    const [startHour, startMinute] = block.start.split(':').map(Number);
    const [endHour, endMinute] = block.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
      return false;
    }
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  });

  if (timeMatch) {
    return { excluded: true, reason: `time:${timeMatch.start}-${timeMatch.end}` };
  }

  return { excluded: false, reason: null };
}
