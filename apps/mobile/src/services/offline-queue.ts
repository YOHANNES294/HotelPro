import { offlineStorage, QueuedAction } from './sqlite-db';
import { apiRequest } from './api-client';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  lastError: string | null;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const syncService = {
  async processQueue(): Promise<{ processed: number; failed: number }> {
    const queue = offlineStorage.getPendingQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    const operations = queue.map((item) => ({
      idempotencyKey: item.id,
      type: item.type,
      payload: JSON.parse(item.payload),
      clientTimestamp: new Date(item.createdAt).toISOString(),
    }));

    const result = await apiRequest('/api/v1/sync', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });

    if (result.success && result.data?.results) {
      for (const res of result.data.results) {
        if (res.status === 'PROCESSED' || res.status === 'SUCCESS') {
          offlineStorage.markSuccess(res.idempotencyKey);
          processed++;
        } else {
          offlineStorage.markFailed(res.idempotencyKey);
          failed++;
        }
      }
    } else {
      // Network failed or API error
      for (const item of queue) {
        offlineStorage.markFailed(item.id);
        failed++;
      }
    }

    return { processed, failed };
  },

  async syncFull(): Promise<boolean> {
    try {
      // 1. Process outbound mutations first
      await this.processQueue();

      // 2. Pull inbound state
      const pullRes = await apiRequest('/api/v1/sync/pull');
      if (pullRes.success && pullRes.data) {
        if (pullRes.data.rooms) {
          offlineStorage.cacheRooms(pullRes.data.rooms);
        }
        if (pullRes.data.orders) {
          offlineStorage.cacheOrders(pullRes.data.orders);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  enqueueAction(type: string, payload: any): string {
    const id = generateUUID();
    offlineStorage.enqueue(id, type, payload);
    return id;
  },

  getPendingCount(): number {
    return offlineStorage.getQueueCount();
  },
};
