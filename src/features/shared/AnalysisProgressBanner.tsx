import type { AnalysisProgress } from '../../../shared/types.js';

interface AnalysisProgressBannerProps {
  progress: AnalysisProgress | null;
}

export function AnalysisProgressBanner({ progress }: AnalysisProgressBannerProps) {
  if (!progress) return null;
  if (progress.phase === 'complete') return null;

  return (
    <div className={`progress-banner progress-banner--${progress.phase}`}>
      <span className="progress-spinner">⟳</span>
      <span className="progress-message">{progress.message}</span>
      {progress.total > 0 ? (
        <progress value={progress.current} max={progress.total} />
      ) : null}
    </div>
  );
}
