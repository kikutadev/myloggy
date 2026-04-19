import type { DashboardData } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';

type ProjectSummary = DashboardData['today']['projectSummary'];

export function ProjectTable(props: { items: ProjectSummary; title: string }) {
  const { text, formatMinutes, projectLabel } = useI18n();

  return (
    <section className="panel">
      <h3 className="panel-title">{props.title}</h3>
      <div className="project-list">
        {props.items.length === 0 ? <p className="muted">{text.noData}</p> : null}
        {props.items.map((item) => (
          <div className="project-row" key={item.projectName}>
            <span>{projectLabel(item.projectName)}</span>
            <strong>{formatMinutes(item.minutes)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}