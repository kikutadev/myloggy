import type { OllamaStatus } from '../../../shared/types.js';
import { useI18n } from '../../i18n.js';

interface OnboardingStep2Props {
  ollamaStatus: OllamaStatus | null;
  checking: boolean;
  onBack: () => void;
  onNext: () => void;
  onCheck: () => void;
}

export function OnboardingStep2({ ollamaStatus, checking, onBack, onNext, onCheck }: OnboardingStep2Props) {
  const { text } = useI18n();

  const hasModel = ollamaStatus?.models.some((model) => model.startsWith('gemma4')) ?? false;

  return (
    <div className="onboarding-step">
      <h2>{text.installModelTitle}</h2>
      <p className="onboarding-desc">{text.installModelDescription}</p>
      <div className="onboarding-code">
        <code>ollama pull gemma4:26b</code>
      </div>
      <p className="onboarding-sub">{text.installModelSub}</p>
      <div className="onboarding-status">
        {checking ? (
          <span className="onboarding-checking">{text.checking}</span>
        ) : hasModel ? (
          <span className="onboarding-ok">{text.modelInstalled}</span>
        ) : (
          <span className="onboarding-ng">{text.modelMissing}</span>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onCheck} disabled={checking}>{text.recheck}</button>
      </div>
      <div className="onboarding-nav">
        <button className="btn btn-ghost" onClick={onBack}>{text.back}</button>
        <button className="btn btn-primary" disabled={!hasModel} onClick={onNext}>
          {text.next}
        </button>
      </div>
    </div>
  );
}