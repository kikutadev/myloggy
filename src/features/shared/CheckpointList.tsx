import type { CheckpointRecord } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';

export function CheckpointList(props: { checkpoints: CheckpointRecord[] }) {
  const { categoryLabel, formatTimeRange } = useI18n();

  return (
    <div className="checkpoint-list">
      {props.checkpoints.map((cp) => (
        <article className="checkpoint-item" key={cp.id}>
          <header>
            <span className="muted">{formatTimeRange(cp.startAt, cp.endAt)}</span>
            <span className="tag">{categoryLabel(cp.category)}</span>
          </header>
          <h5>{cp.taskLabel}</h5>
          <p className="muted">{cp.stateSummary}</p>
        </article>
      ))}
    </div>
  );
}