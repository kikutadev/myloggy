import dayjs from 'dayjs';

type ViewMode = 'day' | 'week' | 'month';

export function navigateDate(direction: -1 | 1, view: ViewMode, current: string): string {
  const d = dayjs(current);
  if (view === 'day') return d.add(direction, 'day').format('YYYY-MM-DD');
  if (view === 'week') return d.add(direction * 7, 'day').format('YYYY-MM-DD');
  return d.add(direction, 'month').format('YYYY-MM-DD');
}