import { useState, useEffect, useCallback } from 'react';
import type { OllamaStatus } from '../../../shared/types.js';
import { checkOllama } from './checkOllama.js';

export function useOnboarding() {
  const [step, setStep] = useState(0);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const doCheckOllama = useCallback(async () => {
    setChecking(true);
    const status = await checkOllama();
    setOllamaStatus(status);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (step === 1 || step === 2) {
      void doCheckOllama();
    }
  }, [step, doCheckOllama]);

  return {
    step,
    setStep,
    ollamaStatus,
    checking,
    doCheckOllama,
  };
}