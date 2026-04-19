import { useState, useCallback } from 'react';

export function useAnalyze(onReload: () => Promise<void>) {
  const [runningAnalyze, setRunningAnalyze] = useState(false);

  const runAnalyzeNow = useCallback(async () => {
    if (runningAnalyze) {
      return;
    }

    setRunningAnalyze(true);
    try {
      await window.myloggy.analyzeNow();
      await onReload();
    } finally {
      setRunningAnalyze(false);
    }
  }, [runningAnalyze, onReload]);

  return { runningAnalyze, runAnalyzeNow };
}