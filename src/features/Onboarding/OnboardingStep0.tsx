import { useI18n } from '../../i18n.js';

interface OnboardingStep0Props {
  onNext: () => void;
}

export function OnboardingStep0({ onNext }: OnboardingStep0Props) {
  const { text } = useI18n();

  return (
    <div className="onboarding-step">
      <h1 className="onboarding-logo">My Loggy</h1>
      <p className="onboarding-desc" style={{ whiteSpace: 'pre-line' }}>{text.onboardingDescription}</p>
      <p className="onboarding-sub">{text.onboardingSub}</p>
      <button className="btn btn-primary btn-lg" onClick={onNext}>
        {text.startSetup}
      </button>
    </div>
  );
}