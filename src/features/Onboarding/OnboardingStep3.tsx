import { useI18n } from '../../i18n.js';

interface OnboardingStep3Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingStep3({ onBack, onComplete }: OnboardingStep3Props) {
  const { text } = useI18n();

  return (
    <div className="onboarding-step">
      <h2>{text.screenPermissionTitle}</h2>
      <p className="onboarding-desc">{text.screenPermissionDescription}</p>
      <div className="onboarding-permission">
        <p>{text.screenPermissionHint}</p>
      </div>
      <p className="onboarding-sub">{text.screenPermissionSub}</p>
      <div className="onboarding-nav">
        <button className="btn btn-ghost" onClick={onBack}>{text.back}</button>
        <button className="btn btn-primary btn-lg" onClick={onComplete}>
          {text.getStarted}
        </button>
      </div>
    </div>
  );
}