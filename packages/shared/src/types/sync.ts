export enum SyncOperationType {
  CREATE_ORDER = 'CREATE_ORDER',
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  UPDATE_ROOM_STATUS = 'UPDATE_ROOM_STATUS',
  UPDATE_TABLE_STATUS = 'UPDATE_TABLE_STATUS',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

export interface SyncOperationItem {
  idempotencyKey: string;
  type: SyncOperationType;
  payload: Record<string, unknown>;
  clientTimestamp: string;
}

export interface SyncBatchRequest {
  operations: SyncOperationItem[];
}

export interface SyncOperationResult {
  idempotencyKey: string;
  status: SyncStatus;
  entityId?: string;
  error?: string;
}

export interface SyncBatchResponse {
  results: SyncOperationResult[];
  serverTimestamp: string;
}
