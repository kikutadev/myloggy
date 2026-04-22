import { useState, useCallback } from 'react';

export function useReanalyze(onReload: () => Promise<void>) {
  const [runningReanalyze, setRunningReanalyze] = useState(false);

  const reanalyzeDate = useCallback(async (date: string) => {
    if (runningReanalyze) {
      return;
    }

    setRunningReanalyze(true);
    try {
      await window.myloggy.reanalyzeDate(date);
      await onReload();
    } finally {
      setRunningReanalyze(false);
    }
  }, [runningReanalyze, onReload]);

  return { runningReanalyze, reanalyzeDate };
}
