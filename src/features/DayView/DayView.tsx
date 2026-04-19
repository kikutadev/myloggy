import { useMemo, useState } from 'react';
import type { DashboardData, CheckpointRecord } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';
import { CategoryBars } from '../shared/CategoryBars.jsx';
import { CheckpointList } from '../shared/CheckpointList.jsx';
import { ProjectTable } from '../shared/ProjectTable.jsx';
import { WorkUnitEditor } from '../WorkUnitEditor/WorkUnitEditor.jsx';

interface DayViewProps {
  dashboard: DashboardData;
  categories: string[];
  onRefresh: () => void;
}

export function DayView({ dashboard, categories, onRefresh }: DayViewProps) {
  const { text, categoryLabel, formatMinutes, formatTimeRange, projectLabel } = useI18n();
  const checkpointsById = useMemo(
    () => new Map(dashboard.today.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint])),
    [dashboard.today.checkpoints],
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="content-grid">
      <section className="main-panel">
        {dashboard.today.units.length === 0 ? <p className="muted">{text.noWorkLog}</p> : null}
        <div className="timeline-list">
          {dashboard.today.units.map((unit) => {
            const checkpoints = unit.checkpointIds
              .map((id) => checkpointsById.get(id))
              .filter((value): value is CheckpointRecord => Boolean(value));

            return (
              <article className="work-unit" key={unit.id}>
                <div className="work-meta">
                  <span>{formatTimeRange(unit.startAt, unit.endAt)}</span>
                  <span>{formatMinutes(unit.durationMinutes)}</span>
                </div>
                <div className="work-body">
                  <div className="work-heading">
                    <div>
                      <span className="muted small">{projectLabel(unit.projectName)}</span>
                      <h3>{unit.title}</h3>
                    </div>
                    <div className="tag-group">
                      <span className="tag">{categoryLabel(unit.category)}</span>
                      {unit.isDistracted ? <span className="tag tag-warn">{text.distracted}</span> : null}
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(editingId === unit.id ? null : unit.id)}>
                        {editingId === unit.id ? text.close : text.edit}
                      </button>
                    </div>
                  </div>
                  <p className="muted">{unit.summary}</p>
                  {unit.note ? <p className="note">{text.notePrefix}: {unit.note}</p> : null}
                  {editingId === unit.id ? (
                    <WorkUnitEditor
                      unit={unit}
                      categories={categories}
                      onSaved={() => {
                        setEditingId(null);
                        onRefresh();
                      }}
                    />
                  ) : null}
                  <details>
                    <summary>{text.checkpoints(checkpoints.length)}</summary>
                    <CheckpointList checkpoints={checkpoints} />
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <aside className="side-column">
        <CategoryBars items={dashboard.today.categorySummary} totalMinutes={dashboard.today.totalMinutes} title={text.categories} />
        <ProjectTable items={dashboard.today.projectSummary} title={text.projects} />
      </aside>
    </div>
  );
}