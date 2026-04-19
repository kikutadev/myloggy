import type { OllamaStatus } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';

interface OnboardingStep1Props {
  ollamaStatus: OllamaStatus | null;
  checking: boolean;
  onBack: () => void;
  onNext: () => void;
  onCheck: () => void;
}

export function OnboardingStep1({ ollamaStatus, checking, onBack, onNext, onCheck }: OnboardingStep1Props) {
  const { text } = useI18n();

  return (
    <div className="onboarding-step">
      <h2>{text.installOllamaTitle}</h2>
      <p className="onboarding-desc">{text.installOllamaDescription}</p>
      <div className="onboarding-code">
        <code>brew install ollama</code>
      </div>
      <p className="onboarding-sub" style={{ whiteSpace: 'pre-line' }}>{text.installOllamaSub}</p>
      <div className="onboarding-status">
        {checking ? (
          <span className="onboarding-checking">{text.checking}</span>
        ) : ollamaStatus?.running ? (
          <span className="onboarding-ok">{text.ollamaRunning}</span>
        ) : (
          <span className="onboarding-ng">{text.ollamaMissing}</span>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onCheck} disabled={checking}>{text.recheck}</button>
      </div>
      <div className="onboarding-nav">
        <button className="btn btn-ghost" onClick={onBack}>{text.back}</button>
        <button className="btn btn-primary" disabled={!ollamaStatus?.running} onClick={onNext}>
          {text.next}
        </button>
      </div>
    </div>
  );
}