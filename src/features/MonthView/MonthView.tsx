import type { DashboardData } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';
import { CategoryBars } from '../shared/CategoryBars.jsx';
import { MonthCell } from './MonthCell.jsx';
import { ProjectTable } from '../shared/ProjectTable.jsx';

export function MonthView(props: { dashboard: DashboardData }) {
  const { text, weekdays } = useI18n();

  return (
    <div className="content-grid">
      <section className="main-panel">
        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div className="calendar-head" key={day}>{day}</div>
          ))}
          {props.dashboard.month.days.map((day) => (
            <MonthCell key={day.date} day={day} activeMonth={props.dashboard.month.month} />
          ))}
        </div>
      </section>
      <aside className="side-column">
        <CategoryBars
          items={props.dashboard.month.categorySummary}
          totalMinutes={props.dashboard.month.categorySummary.reduce((total, item) => total + item.minutes, 0)}
          title={text.categories}
        />
        <ProjectTable items={props.dashboard.month.projectSummary} title={text.projects} />
      </aside>
    </div>
  );
}