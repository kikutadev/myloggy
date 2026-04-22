import { useEffect, useState } from 'react';
import type { CheckpointRecord, CheckpointSnapshot } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';

export function CheckpointList(props: { checkpoints: CheckpointRecord[] }) {
  const { categoryLabel, formatTimeRange } = useI18n();
  const [snapshotMap, setSnapshotMap] = useState<Map<string, CheckpointSnapshot[]>>(new Map());
  const [loadingMap, setLoadingMap] = useState<Set<string>>(new Set());

  useEffect(() => {
    const map = new Map<string, CheckpointSnapshot[]>();
    const loading = new Set<string>();

    for (const cp of props.checkpoints) {
      loading.add(cp.id);
      window.myloggy.getCheckpointSnapshots(cp.id).then((snapshots) => {
        setSnapshotMap((prev) => {
          const next = new Map(prev);
          next.set(cp.id, snapshots);
          return next;
        });
        setLoadingMap((prev) => {
          const next = new Set(prev);
          next.delete(cp.id);
          return next;
        });
      }).catch(() => {
        setLoadingMap((prev) => {
          const next = new Set(prev);
          next.delete(cp.id);
          return next;
        });
      });
    }
    setLoadingMap(loading);
    setSnapshotMap(map);
  }, [props.checkpoints]);

  return (
    <div className="checkpoint-list">
      {props.checkpoints.map((cp) => {
        const snapshots = snapshotMap.get(cp.id) ?? [];
        const isLoading = loadingMap.has(cp.id);

        return (
          <article className="checkpoint-item" key={cp.id}>
            <header>
              <span className="muted">{formatTimeRange(cp.startAt, cp.endAt)}</span>
              <span className="tag">{categoryLabel(cp.category)}</span>
            </header>
            <h5>{cp.taskLabel}</h5>
            <p className="muted">{cp.stateSummary}</p>
            {isLoading ? <p className="muted small">Loading screenshots...</p> : null}
            {snapshots.length > 0 ? (
              <div className="checkpoint-snapshots">
                {snapshots.map((snap) => (
                  <div className="snapshot-thumbnails" key={snap.id}>
                    {snap.imagesBase64.map((img, idx) => (
                      <img
                        key={`${snap.id}-${idx}`}
                        src={`data:image/jpeg;base64,${img}`}
                        alt={`Screenshot ${idx + 1}`}
                        className="snapshot-thumb"
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}