import { useState, useCallback } from 'react';

export function useClearSnapshots(onReload: () => Promise<void>) {
  const [clearingPending, setClearingPending] = useState(false);

  const clearPendingSnapshots = useCallback(async (pendingCount: number | undefined) => {
    if (!pendingCount || clearingPending) {
      return;
    }

    setClearingPending(true);
    try {
      await window.myloggy.clearPendingSnapshots();
      await onReload();
    } finally {
      setClearingPending(false);
    }
  }, [clearingPending, onReload]);

  return { clearingPending, clearPendingSnapshots };
}