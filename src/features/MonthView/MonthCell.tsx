import dayjs from 'dayjs';

import { useI18n } from '../../i18n.js';
import type { DashboardData } from '../../../shared/types.js';

type MonthDay = DashboardData['month']['days'][number];

export function MonthCell(props: { day: MonthDay; activeMonth: string }) {
  const { formatMinutes } = useI18n();
  const isOutside = !props.day.date.startsWith(props.activeMonth);
  const unit = props.day.representativeUnit;

  return (
    <div className={`month-cell ${isOutside ? 'outside' : ''}`}>
      <span className="month-day-num">{dayjs(props.day.date).date()}</span>
      {unit ? (
        <>
          <strong className="month-cell-title">{unit.title}</strong>
          <small className="muted">{formatMinutes(props.day.totalMinutes)}</small>
        </>
      ) : (
        <small className="muted">-</small>
      )}
    </div>
  );
}