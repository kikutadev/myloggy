import type { DashboardData } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';
import { CategoryBars } from '../shared/CategoryBars.jsx';
import { ProjectTable } from '../shared/ProjectTable.jsx';

export function WeekView(props: { dashboard: DashboardData }) {
  const { text, formatMinutes } = useI18n();

  return (
    <div className="content-grid">
      <div className="main-column">
        <div className="stat-row">
          <div className="stat-card"><span className="muted">{text.totalWorkTime}</span><strong>{formatMinutes(props.dashboard.week.totalMinutes)}</strong></div>
        </div>
        <section className="panel">
          <h3 className="panel-title">{text.longestWork}</h3>
          <div className="project-list">
            {props.dashboard.week.longestUnits.length === 0 ? <p className="muted">{text.noData}</p> : null}
            {props.dashboard.week.longestUnits.map((unit) => (
              <div className="project-row" key={unit.id}>
                <span>{unit.title}</span>
                <strong>{formatMinutes(unit.durationMinutes)}</strong>
              </div>
            ))}
          </div>
        </section>
        <ProjectTable items={props.dashboard.week.projectSummary} title={text.projects} />
      </div>
      <aside className="side-column">
        <CategoryBars items={props.dashboard.week.categorySummary} totalMinutes={props.dashboard.week.totalMinutes} title={text.categories} />
      </aside>
    </div>
  );
}