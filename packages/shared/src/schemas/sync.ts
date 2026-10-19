import { z } from 'zod';
import { SyncOperationType } from '../types/sync.js';

export const syncOperationItemSchema = z.object({
  idempotencyKey: z.string().uuid(),
  type: z.nativeEnum(SyncOperationType),
  payload: z.record(z.unknown()),
  clientTimestamp: z.string().datetime(),
});

export const syncBatchSchema = z.object({
  operations: z.array(syncOperationItemSchema).max(100),
});

export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
