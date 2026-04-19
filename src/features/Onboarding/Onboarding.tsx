import { useOnboarding } from './useOnboarding.js';
import { OnboardingStep0 } from './OnboardingStep0.jsx';
import { OnboardingStep1 } from './OnboardingStep1.jsx';
import { OnboardingStep2 } from './OnboardingStep2.jsx';
import { OnboardingStep3 } from './OnboardingStep3.jsx';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { step, setStep, ollamaStatus, checking, doCheckOllama } = useOnboarding();

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={`onboarding-dot ${index <= step ? 'active' : ''}`} />
          ))}
        </div>

        {step === 0 ? (
          <OnboardingStep0 onNext={() => setStep(1)} />
        ) : null}

        {step === 1 ? (
          <OnboardingStep1
            ollamaStatus={ollamaStatus}
            checking={checking}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            onCheck={doCheckOllama}
          />
        ) : null}

        {step === 2 ? (
          <OnboardingStep2
            ollamaStatus={ollamaStatus}
            checking={checking}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            onCheck={doCheckOllama}
          />
        ) : null}

        {step === 3 ? (
          <OnboardingStep3 onBack={() => setStep(2)} onComplete={onComplete} />
        ) : null}
      </div>
    </div>
  );
}