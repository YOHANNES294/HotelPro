// Pure web fallback implementation with zero native SQLite dependencies

export interface QueuedAction {
  id: string;
  type: string;
  payload: string;
  createdAt: number;
  attempts: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
}

let webQueue: QueuedAction[] = [];
let webRooms: any[] = [];
let webOrders: any[] = [];

export function getDatabase(): any {
  return null;
}

export const offlineStorage = {
  enqueue: (id: string, type: string, payload: any) => {
    const existing = webQueue.findIndex((q) => q.id === id);
    const item: QueuedAction = {
      id,
      type,
      payload: JSON.stringify(payload),
      createdAt: Date.now(),
      attempts: 0,
      status: 'PENDING',
    };
    if (existing >= 0) webQueue[existing] = item;
    else webQueue.push(item);
  },

  getPendingQueue: (): QueuedAction[] => {
    return webQueue.filter((q) => q.status === 'PENDING');
  },

  markSuccess: (id: string) => {
    webQueue = webQueue.filter((q) => q.id !== id);
  },

  markFailed: (id: string) => {
    const item = webQueue.find((q) => q.id === id);
    if (item) {
      item.attempts += 1;
      if (item.attempts >= 5) item.status = 'FAILED';
    }
  },

  getQueueCount: (): number => {
    return webQueue.filter((q) => q.status === 'PENDING').length;
  },

  cacheRooms: (rooms: any[]) => {
    webRooms = rooms.map((room) => ({
      id: room.id,
      number: room.number,
      typeName: room.roomType?.name || 'Standard',
      floor: room.floor,
      status: room.status,
      pricePerNight: parseFloat(room.roomType?.basePrice || 0),
      updatedAt: Date.now(),
    }));
  },

  getCachedRooms: () => {
    return webRooms;
  },

  cacheOrders: (orders: any[]) => {
    webOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number || 'N/A',
      status: order.status,
      totalAmount: parseFloat(order.totalAmount || 0),
      itemsJson: JSON.stringify(order.items || []),
      createdAt: order.createdAt || new Date().toISOString(),
    }));
  },

  getCachedOrders: () => {
    return webOrders;
  },
};
