import type {
  AppState,
  CategorySummary,
  CheckpointRecord,
  DashboardData,
  DayTimeline,
  ErrorLogRecord,
  MonthDaySummary,
  MonthTimeline,
  ProjectSummary,
  WeekTimeline,
  WorkUnitRecord,
} from '../../shared/types.js';

export type {
  AppState,
  CategorySummary,
  CheckpointRecord,
  DashboardData,
  DayTimeline,
  ErrorLogRecord,
  MonthDaySummary,
  MonthTimeline,
  ProjectSummary,
  WeekTimeline,
  WorkUnitRecord,
};

export interface AppDatabaseLike {
  listCheckpointsBetween(startIso: string, endIso: string): CheckpointRecord[];
  listErrors(limit?: number): ErrorLogRecord[];
  listRecentWorkUnits(limit?: number): WorkUnitRecord[];
  listWorkUnitsBetween(startIso: string, endIso: string): WorkUnitRecord[];
}
