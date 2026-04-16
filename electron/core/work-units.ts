import dayjs from 'dayjs';

import type { AppSettings, CheckpointRecord, WorkUnitRecord } from '../../shared/types.js';
import { isUnknownLabel } from '../../shared/localization.js';
import { createId, minutesBetween, overlapScore } from './utils.js';

function continuityScore(value: CheckpointRecord['continuity']): number {
  if (value === 'continue') {
    return 1;
  }
  if (value === 'unclear') {
    return 0.45;
  }
  return 0;
}

function projectScore(left: string, right: string): number {
  if (!left || !right) {
    return 0.2;
  }
  return left === right ? 1 : overlapScore(left, right);
}

export function shouldMergeWorkUnit(
  current: WorkUnitRecord,
  checkpoint: CheckpointRecord,
  settings: AppSettings,
): boolean {
  const gapMinutes = Math.max(0, dayjs(checkpoint.startAt).diff(dayjs(current.endAt), 'minute'));
  if (gapMinutes > settings.idleGapMinutes) {
    return false;
  }

  const score =
    projectScore(current.projectName, checkpoint.projectName) * 0.28 +
    (current.category === checkpoint.category ? 1 : 0) * 0.22 +
    overlapScore(current.title, checkpoint.taskLabel) * 0.18 +
    overlapScore(current.summary, checkpoint.stateSummary) * 0.1 +
    continuityScore(checkpoint.continuity) * 0.14 +
    (gapMinutes <= 2 ? 1 : gapMinutes <= 10 ? 0.5 : 0.2) * 0.08;

  if (checkpoint.continuity === 'switch' && score < 0.75) {
    return false;
  }

  return score >= 0.58;
}

export function createWorkUnitFromCheckpoint(checkpoint: CheckpointRecord): WorkUnitRecord {
  return {
    id: createId('work'),
    startAt: checkpoint.startAt,
    endAt: checkpoint.endAt,
    durationMinutes: minutesBetween(checkpoint.startAt, checkpoint.endAt),
    projectName: checkpoint.projectName,
    title: checkpoint.taskLabel,
    category: checkpoint.category,
    summary: checkpoint.stateSummary,
    progressLevel: checkpoint.confidence >= 0.85 ? '高' : checkpoint.confidence >= 0.55 ? '中' : '低',
    isDistracted: checkpoint.isDistracted ?? false,
    checkpointIds: [checkpoint.id],
    userEdited: false,
    updatedAt: new Date().toISOString(),
    note: null,
  };
}

export function mergeCheckpointIntoWorkUnit(
  current: WorkUnitRecord,
  checkpoint: CheckpointRecord,
): WorkUnitRecord {
  const checkpointIds = [...current.checkpointIds, checkpoint.id];
  const progressLevel =
    checkpoint.confidence >= 0.85 || current.progressLevel === '高'
      ? '高'
      : checkpoint.confidence >= 0.55 || current.progressLevel === '中'
        ? '中'
        : '低';

  return {
    ...current,
    endAt: checkpoint.endAt,
    durationMinutes: minutesBetween(current.startAt, checkpoint.endAt),
    projectName: !isUnknownLabel(checkpoint.projectName) ? checkpoint.projectName : current.projectName,
    title: current.userEdited ? current.title : checkpoint.taskLabel,
    category: checkpoint.category,
    summary: current.userEdited ? current.summary : checkpoint.stateSummary,
    progressLevel,
    isDistracted: current.isDistracted || (checkpoint.isDistracted ?? false),
    checkpointIds,
    updatedAt: new Date().toISOString(),
  };
}
