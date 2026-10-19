import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

// Safe fallback for web or if SQLite is unavailable
let fallbackQueue: QueuedAction[] = [];
let fallbackRooms: any[] = [];
let fallbackOrders: any[] = [];

export function getDatabase(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!dbInstance) {
    try {
      dbInstance = SQLite.openDatabaseSync('hotelpro_offline.db');
      initDatabase(dbInstance);
    } catch (e) {
      console.warn('SQLite init warning, using fallback storage:', e);
      return null;
    }
  }
  return dbInstance;
}

function initDatabase(db: SQLite.SQLiteDatabase): void {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PENDING'
      );

      CREATE TABLE IF NOT EXISTS cached_rooms (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL,
        typeName TEXT NOT NULL,
        floor INTEGER NOT NULL,
        status TEXT NOT NULL,
        pricePerNight REAL NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_orders (
        id TEXT PRIMARY KEY,
        orderNumber TEXT NOT NULL,
        tableNumber TEXT,
        status TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        itemsJson TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_menu (
        id TEXT PRIMARY KEY,
        nameEn TEXT NOT NULL,
        nameAm TEXT,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        isAvailable INTEGER NOT NULL
      );
    `);
  } catch (e) {
    console.warn('Database schema init warning:', e);
  }
}

export interface QueuedAction {
  id: string;
  type: string;
  payload: string;
  createdAt: number;
  attempts: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
}

export const offlineStorage = {
  enqueue: (id: string, type: string, payload: any) => {
    const db = getDatabase();
    if (!db) {
      const existing = fallbackQueue.findIndex((q) => q.id === id);
      const item: QueuedAction = {
        id,
        type,
        payload: JSON.stringify(payload),
        createdAt: Date.now(),
        attempts: 0,
        status: 'PENDING',
      };
      if (existing >= 0) fallbackQueue[existing] = item;
      else fallbackQueue.push(item);
      return;
    }

    try {
      db.runSync(
        'INSERT OR REPLACE INTO offline_queue (id, type, payload, createdAt, attempts, status) VALUES (?, ?, ?, ?, 0, ?)',
        [id, type, JSON.stringify(payload), Date.now(), 'PENDING']
      );
    } catch (e) {
      console.warn('enqueue failed in SQLite, fallback used', e);
    }
  },

  getPendingQueue: (): QueuedAction[] => {
    const db = getDatabase();
    if (!db) {
      return fallbackQueue.filter((q) => q.status === 'PENDING');
    }

    try {
      return db.getAllSync<QueuedAction>(
        'SELECT * FROM offline_queue WHERE status = ? ORDER BY createdAt ASC',
        ['PENDING']
      );
    } catch {
      return fallbackQueue.filter((q) => q.status === 'PENDING');
    }
  },

  markSuccess: (id: string) => {
    const db = getDatabase();
    if (!db) {
      fallbackQueue = fallbackQueue.filter((q) => q.id !== id);
      return;
    }

    try {
      db.runSync('DELETE FROM offline_queue WHERE id = ?', [id]);
    } catch {}
  },

  markFailed: (id: string) => {
    const db = getDatabase();
    if (!db) {
      const item = fallbackQueue.find((q) => q.id === id);
      if (item) {
        item.attempts += 1;
        if (item.attempts >= 5) item.status = 'FAILED';
      }
      return;
    }

    try {
      db.runSync(
        'UPDATE offline_queue SET attempts = attempts + 1, status = CASE WHEN attempts >= 5 THEN "FAILED" ELSE "PENDING" END WHERE id = ?',
        [id]
      );
    } catch {}
  },

  getQueueCount: (): number => {
    const db = getDatabase();
    if (!db) {
      return fallbackQueue.filter((q) => q.status === 'PENDING').length;
    }

    try {
      const result = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM offline_queue WHERE status = "PENDING"'
      );
      return result?.count || 0;
    } catch {
      return fallbackQueue.filter((q) => q.status === 'PENDING').length;
    }
  },

  // Cache operations
  cacheRooms: (rooms: any[]) => {
    const db = getDatabase();
    if (!db) {
      fallbackRooms = rooms.map((room) => ({
        id: room.id,
        number: room.number,
        typeName: room.roomType?.name || 'Standard',
        floor: room.floor,
        status: room.status,
        pricePerNight: parseFloat(room.roomType?.basePrice || 0),
        updatedAt: Date.now(),
      }));
      return;
    }

    try {
      db.withTransactionSync(() => {
        db.runSync('DELETE FROM cached_rooms');
        for (const room of rooms) {
          db.runSync(
            'INSERT INTO cached_rooms (id, number, typeName, floor, status, pricePerNight, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              room.id,
              room.number,
              room.roomType?.name || 'Standard',
              room.floor,
              room.status,
              parseFloat(room.roomType?.basePrice || 0),
              Date.now(),
            ]
          );
        }
      });
    } catch {}
  },

  getCachedRooms: () => {
    const db = getDatabase();
    if (!db) {
      return fallbackRooms;
    }

    try {
      return db.getAllSync('SELECT * FROM cached_rooms ORDER BY number ASC');
    } catch {
      return fallbackRooms;
    }
  },

  cacheOrders: (orders: any[]) => {
    const db = getDatabase();
    if (!db) {
      fallbackOrders = orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.number || 'N/A',
        status: order.status,
        totalAmount: parseFloat(order.totalAmount || 0),
        itemsJson: JSON.stringify(order.items || []),
        createdAt: order.createdAt || new Date().toISOString(),
      }));
      return;
    }

    try {
      db.withTransactionSync(() => {
        db.runSync('DELETE FROM cached_orders');
        for (const order of orders) {
          db.runSync(
            'INSERT INTO cached_orders (id, orderNumber, tableNumber, status, totalAmount, itemsJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              order.id,
              order.orderNumber,
              order.table?.number || 'N/A',
              order.status,
              parseFloat(order.totalAmount || 0),
              JSON.stringify(order.items || []),
              order.createdAt || new Date().toISOString(),
            ]
          );
        }
      });
    } catch {}
  },

  getCachedOrders: () => {
    const db = getDatabase();
    if (!db) {
      return fallbackOrders;
    }

    try {
      return db.getAllSync('SELECT * FROM cached_orders ORDER BY createdAt DESC');
    } catch {
      return fallbackOrders;
    }
  },
};
