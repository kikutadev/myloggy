import dayjs from 'dayjs';

import { buildMonthComment, toStoredProjectName, type SupportedLocale } from '../../shared/localization.js';
import type {
  AppDatabaseLike,
  CategorySummary,
  DayTimeline,
  DashboardData,
  MonthDaySummary,
  MonthTimeline,
  ProjectSummary,
  WeekTimeline,
  WorkUnitRecord,
} from './timeline.types.js';

function summarizeByCategory(units: WorkUnitRecord[]): CategorySummary[] {
  const map = new Map<string, number>();
  for (const unit of units) {
    map.set(unit.category, (map.get(unit.category) ?? 0) + unit.durationMinutes);
  }
  return [...map.entries()]
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((left, right) => right.minutes - left.minutes);
}

function summarizeByProject(units: WorkUnitRecord[]): ProjectSummary[] {
  const map = new Map<string, number>();
  for (const unit of units) {
    const key = toStoredProjectName(unit.projectName);
    map.set(key, (map.get(key) ?? 0) + unit.durationMinutes);
  }
  return [...map.entries()]
    .map(([projectName, minutes]) => ({ projectName, minutes }))
    .sort((left, right) => right.minutes - left.minutes);
}

function sumMinutes(units: WorkUnitRecord[]): number {
  return units.reduce((total, item) => total + item.durationMinutes, 0);
}

export function buildDayTimeline(db: AppDatabaseLike, date: string): DayTimeline {
  const start = dayjs(date).startOf('day').toISOString();
  const end = dayjs(date).endOf('day').toISOString();
  const units = db.listWorkUnitsBetween(start, end);
  const checkpoints = db.listCheckpointsBetween(start, end);

  return {
    date,
    units,
    checkpoints,
    totalMinutes: sumMinutes(units),
    categorySummary: summarizeByCategory(units),
    projectSummary: summarizeByProject(units),
  };
}

export function buildWeekTimeline(db: AppDatabaseLike, date: string): WeekTimeline {
  const base = dayjs(date);
  const start = base.startOf('week').toISOString();
  const end = base.endOf('week').toISOString();
  const units = db.listWorkUnitsBetween(start, end);

  return {
    startDate: dayjs(start).format('YYYY-MM-DD'),
    endDate: dayjs(end).format('YYYY-MM-DD'),
    units,
    totalMinutes: sumMinutes(units),
    categorySummary: summarizeByCategory(units),
    projectSummary: summarizeByProject(units),
    distractedCount: units.filter((item) => item.isDistracted).length,
    longestUnits: [...units].sort((left, right) => right.durationMinutes - left.durationMinutes).slice(0, 5),
  };
}

function representativeUnit(units: WorkUnitRecord[]): WorkUnitRecord | null {
  if (!units.length) {
    return null;
  }
  return [...units].sort((left, right) => right.durationMinutes - left.durationMinutes)[0] ?? null;
}

export function buildMonthTimeline(db: AppDatabaseLike, date: string, locale: SupportedLocale): MonthTimeline {
  const base = dayjs(date);
  const start = base.startOf('month');
  const end = base.endOf('month');
  const units = db.listWorkUnitsBetween(start.toISOString(), end.toISOString());
  const days: MonthDaySummary[] = [];

  for (let cursor = start.startOf('week'); cursor.isBefore(end.endOf('week')) || cursor.isSame(end.endOf('week'), 'day'); cursor = cursor.add(1, 'day')) {
    const dayUnits = units.filter((unit) => {
      const startsInside = dayjs(unit.startAt).isSame(cursor, 'day');
      const endsInside = dayjs(unit.endAt).isSame(cursor, 'day');
      return startsInside || endsInside;
    });

    days.push({
      date: cursor.format('YYYY-MM-DD'),
      totalMinutes: sumMinutes(dayUnits),
      representativeUnit: representativeUnit(dayUnits),
    });
  }

  const topCategory = summarizeByCategory(units)[0];
  const topProject = summarizeByProject(units)[0];

  const comment = buildMonthComment({
    locale,
    month: base.format('YYYY-MM'),
    topCategory: topCategory?.category ?? null,
    topProject: topProject?.projectName ?? null,
  });

  return {
    month: base.format('YYYY-MM'),
    days,
    categorySummary: summarizeByCategory(units),
    projectSummary: summarizeByProject(units),
    comment,
  };
}

export function buildDashboard(
  db: AppDatabaseLike,
  date: string,
  state: DashboardData['state'],
  locale: SupportedLocale,
): DashboardData {
  const today = buildDayTimeline(db, date);
  const week = buildWeekTimeline(db, date);
  const month = buildMonthTimeline(db, date, locale);

  return {
    state,
    today,
    week,
    month,
    recentUnits: db.listRecentWorkUnits(),
    errors: db.listErrors(),
  };
}
