import dayjs from 'dayjs';
import { useI18n } from '../../i18n.js';
import { useDebugModal } from './useDebugModal.js';

interface DebugModalProps {
  onClose: () => void;
  onErrorsCleared: () => Promise<void>;
}

export function DebugModal({ onClose, onErrorsCleared }: DebugModalProps) {
  const { text, formatTime, snapshotStatusLabel } = useI18n();
  const { data, loading, clearingErrors, clearErrors } = useDebugModal();

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content debug-modal">
        <div className="modal-header">
          <h2>{text.debugTitle}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        {loading ? <p className="muted">{text.loading}</p> : null}
        {data ? (
          <>
            <h3 className="debug-section-title">{text.recentSnapshots(data.snapshots.length)}</h3>
            <div className="debug-snaps">
              {data.snapshots.map((snapshot) => (
                <div className="debug-snap" key={snapshot.id}>
                  <div className="debug-images">
                    {snapshot.imagesBase64.length > 0 ? snapshot.imagesBase64.map((image, index) => (
                      <img key={index} className="debug-img" src={`data:image/jpeg;base64,${image}`} alt={`display ${index + 1}`} />
                    )) : (
                      <div className="debug-img-empty">{text.noImage}</div>
                    )}
                  </div>
                  <div className="debug-meta">
                    <div>
                      <strong>{dayjs(snapshot.capturedAt).format('HH:mm:ss')}</strong>{' '}
                      <span className={`debug-status debug-status-${snapshot.status}`}>{snapshotStatusLabel(snapshot.status)}</span>{' '}
                      <span className="muted">{text.screenCount(snapshot.displayCount)}</span>
                    </div>
                    <div>{text.statusApp}: <code>{snapshot.activeApp ?? '-'}</code></div>
                    <div>{text.statusWindow}: <code>{snapshot.windowTitle ?? '-'}</code></div>
                    {snapshot.pageTitle ? <div>{text.statusPage}: <code>{snapshot.pageTitle}</code></div> : null}
                    {snapshot.url ? <div>{text.statusUrl}: <code className="debug-url">{snapshot.url}</code></div> : null}
                    <div>{text.statusCursor}: ({snapshot.cursorX?.toFixed(0) ?? '-'}, {snapshot.cursorY?.toFixed(0) ?? '-'})</div>
                    {snapshot.checkpointId ? <div className="muted">CP: {snapshot.checkpointId}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            {data.errors.length > 0 ? (
              <>
                <div className="debug-section-head">
                  <h3 className="debug-section-title">{text.errorLogs(data.errors.length)}</h3>
                  <button className="btn btn-ghost btn-sm" disabled={clearingErrors} onClick={() => { void clearErrors(onErrorsCleared); }}>
                    {text.clearErrors}
                  </button>
                </div>
                <div className="debug-errors">
                  {data.errors.map((error) => (
                    <div className="debug-error" key={error.id}>
                      <div><strong>{formatTime(error.createdAt)}</strong> [{error.scope}] {error.message}</div>
                      {error.detail ? <pre className="debug-detail">{error.detail.slice(0, 300)}</pre> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}