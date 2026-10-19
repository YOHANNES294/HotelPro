import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncService } from '../services/offline-queue';
import { useAuth } from './auth-context';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  syncNow: async () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(() => {
    try {
      const count = syncService.getPendingCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!token || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncService.syncFull();
      setLastSyncedAt(new Date());
    } finally {
      refreshCount();
      setIsSyncing(false);
    }
  }, [token, isSyncing, refreshCount]);

  useEffect(() => {
    refreshCount();
    if (token) {
      syncNow();
    }
  }, [token, refreshCount, syncNow]);

  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncedAt, pendingCount, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
