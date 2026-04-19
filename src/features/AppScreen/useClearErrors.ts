import { useState, useCallback } from 'react';

export function useClearErrors(onReload: () => Promise<void>) {
  const [clearingErrors, setClearingErrors] = useState(false);

  const clearErrors = useCallback(async () => {
    if (clearingErrors) {
      return;
    }

    setClearingErrors(true);
    try {
      await window.myloggy.clearErrors();
      await onReload();
    } finally {
      setClearingErrors(false);
    }
  }, [clearingErrors, onReload]);

  return { clearingErrors, clearErrors };
}