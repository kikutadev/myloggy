import { useState, useEffect, useCallback } from 'react';
import type { DebugData } from '../../../shared/types.js';

export function useDebugModal() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingErrors, setClearingErrors] = useState(false);

  const reloadData = useCallback(async () => {
    const next = await window.myloggy.getDebugData();
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  async function clearErrors(onErrorsCleared: () => Promise<void>) {
    if (clearingErrors) {
      return;
    }

    setClearingErrors(true);
    try {
      await window.myloggy.clearErrors();
      await reloadData();
      await onErrorsCleared();
    } finally {
      setClearingErrors(false);
    }
  }

  return {
    data,
    loading,
    clearingErrors,
    reloadData,
    clearErrors,
  };
}