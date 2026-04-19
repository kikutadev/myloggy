import type { DashboardData } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';
import { summarizeErrorMessage } from './errorUtils.js';

interface AnalysisErrorBannerProps {
  error: DashboardData['errors'][number] | null;
  fallbackMessage: string | null;
  onOpenDebug: () => void;
  onClearErrors: () => void;
  clearingErrors: boolean;
}

export function AnalysisErrorBanner({
  error,
  fallbackMessage,
  onOpenDebug,
  onClearErrors,
  clearingErrors,
}: AnalysisErrorBannerProps) {
  const { locale, text, formatTime } = useI18n();
  const summary = summarizeErrorMessage(error?.message ?? fallbackMessage ?? '', locale);

  if (!summary) {
    return null;
  }

  return (
    <div className="analysis-error-banner">
      <div className="analysis-error-copy">
        <strong>{text.analysisErrorTitle}</strong>
        <span>
          {error ? `${formatTime(error.createdAt)} ` : ''}
          {summary}
        </span>
      </div>
      <div className="analysis-error-actions">
        <button className="btn btn-ghost btn-sm" onClick={onOpenDebug}>
          {text.debug}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={clearingErrors} onClick={onClearErrors}>
          {text.clearErrors}
        </button>
      </div>
    </div>
  );
}