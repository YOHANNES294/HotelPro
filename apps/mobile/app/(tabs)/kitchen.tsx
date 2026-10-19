import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../src/constants/theme';
import { apiRequest } from '../../src/services/api-client';
import { offlineStorage } from '../../src/services/sqlite-db';
import { syncService } from '../../src/services/offline-queue';

export default function KitchenScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = async () => {
    // 1. Local cache fallback
    try {
      const cached = offlineStorage.getCachedOrders();
      if (cached && cached.length > 0) {
        const kitchenRelevant = cached.filter((o: any) =>
          ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
        );
        setTickets(kitchenRelevant);
      }
    } catch {}

    // 2. Fetch fresh orders from backend
    try {
      const res = await apiRequest('/api/v1/restaurants/orders?status=CONFIRMED,PREPARING,READY');
      if (res.success && res.data) {
        setTickets(res.data);
        offlineStorage.cacheOrders(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 10000); // 10s auto-refresh for KDS
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Optimistic update
    setTickets((prev) =>
      prev
        .map((t) => (t.id === orderId ? { ...t, status: newStatus } : t))
        .filter((t) => newStatus !== 'COMPLETED' || t.id !== orderId)
    );

    try {
      const res = await apiRequest(`/api/v1/restaurants/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.success) {
        syncService.enqueueAction('UPDATE_ORDER_STATUS', { orderId, status: newStatus });
      }
    } catch {
      syncService.enqueueAction('UPDATE_ORDER_STATUS', { orderId, status: newStatus });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { label: 'New Ticket', color: Colors.warning, bg: 'rgba(245, 158, 11, 0.15)' };
      case 'PREPARING':
        return { label: 'In Preparation', color: Colors.accent, bg: 'rgba(99, 102, 241, 0.15)' };
      case 'READY':
        return { label: 'Ready to Serve', color: Colors.success, bg: 'rgba(16, 185, 129, 0.15)' };
      default:
        return { label: status, color: Colors.textMuted, bg: Colors.surfaceLight };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Kitchen Display System (KDS)</Text>
        <Text style={styles.headerSubtitle}>
          {tickets.length} Active {tickets.length === 1 ? 'Ticket' : 'Tickets'}
        </Text>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          const minutesAgo = Math.floor(
            (Date.now() - new Date(item.createdAt).getTime()) / 60000
          );

          return (
            <View style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.ticketNumber}>
                    #{item.orderNumber || item.id.slice(0, 8)}
                  </Text>
                  <Text style={styles.ticketTable}>
                    {item.table?.number ? `Table ${item.table.number}` : 'Takeaway'}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.timeAgo}>{isNaN(minutesAgo) ? 'Just now' : `${minutesAgo}m ago`}</Text>
                </View>
              </View>

              <View style={styles.itemsBox}>
                {Array.isArray(item.items) &&
                  item.items.map((it: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{it.quantity}x</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>
                          {it.menuItem?.nameEn || it.name || 'Order Item'}
                        </Text>
                        {it.menuItem?.nameAm && (
                          <Text style={styles.itemNameAm}>{it.menuItem.nameAm}</Text>
                        )}
                      </View>
                    </View>
                  ))}
              </View>

              <View style={styles.actionButtonsRow}>
                {item.status === 'CONFIRMED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                    onPress={() => updateOrderStatus(item.id, 'PREPARING')}
                  >
                    <Text style={styles.actionBtnText}>🍳 Start Cooking</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'PREPARING' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                    onPress={() => updateOrderStatus(item.id, 'READY')}
                  >
                    <Text style={styles.actionBtnText}>🔔 Food Ready</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'READY' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.surfaceLight }]}
                    onPress={() => updateOrderStatus(item.id, 'COMPLETED')}
                  >
                    <Text style={[styles.actionBtnText, { color: Colors.text }]}>
                      ✓ Served & Complete
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>🎉 All caught up!</Text>
            <Text style={styles.emptySub}>No pending orders in the kitchen queue</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ticketNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  ticketTable: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  itemsBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceLight,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQty: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.warning,
    width: 32,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  itemNameAm: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
