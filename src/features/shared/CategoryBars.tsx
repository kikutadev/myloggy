import type { DashboardData } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';
import { ratioWidth } from './ratioWidth.js';

type CategorySummary = DashboardData['today']['categorySummary'];

export function CategoryBars(props: { totalMinutes: number; items: CategorySummary; title: string }) {
  const { text, categoryLabel, formatMinutes } = useI18n();

  return (
    <section className="panel">
      <h3 className="panel-title">{props.title}</h3>
      <div className="bar-list">
        {props.items.length === 0 ? <p className="muted">{text.noData}</p> : null}
        {props.items.map((item) => (
          <div className="bar-row" key={item.category}>
            <div className="bar-label">
              <span>{categoryLabel(item.category)}</span>
              <strong>{formatMinutes(item.minutes)}</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: ratioWidth(item.minutes, props.totalMinutes) }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}