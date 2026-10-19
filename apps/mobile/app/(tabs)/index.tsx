import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../src/context/auth-context';
import { useSync } from '../../src/context/sync-context';
import { Colors } from '../../src/constants/theme';
import { apiRequest } from '../../src/services/api-client';
import { offlineStorage } from '../../src/services/sqlite-db';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { syncNow, isSyncing, pendingCount } = useSync();
  const [stats, setStats] = useState({
    roomsTotal: 0,
    roomsOccupied: 0,
    activeOrders: 0,
    dailyRevenue: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    // 1. Try local cache first
    try {
      const cachedRooms = offlineStorage.getCachedRooms();
      const cachedOrders = offlineStorage.getCachedOrders();
      setStats((prev) => ({
        ...prev,
        roomsTotal: cachedRooms.length,
        roomsOccupied: cachedRooms.filter((r: any) => r.status === 'OCCUPIED').length,
        activeOrders: cachedOrders.filter((o: any) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length,
      }));
    } catch {}

    // 2. Query live reports if online
    try {
      const res = await apiRequest('/api/v1/reports/dashboard');
      if (res.success && res.data) {
        setStats({
          roomsTotal: res.data.roomsTotal || 0,
          roomsOccupied: res.data.roomsOccupied || 0,
          activeOrders: res.data.activeOrders || 0,
          dailyRevenue: parseFloat(res.data.dailyRevenue || 0),
        });
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.headerBox}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>
            {user?.role.replace('_', ' ')} • {user?.organizationName || 'HotelPro'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {pendingCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚡ {pendingCount} offline actions queued for sync
          </Text>
          <TouchableOpacity onPress={() => syncNow()} disabled={isSyncing}>
            <Text style={styles.bannerBtn}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Today's Snapshot</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Room Occupancy</Text>
          <Text style={styles.cardValue}>
            {stats.roomsTotal > 0 ? Math.round((stats.roomsOccupied / stats.roomsTotal) * 100) : 0}%
          </Text>
          <Text style={styles.cardSub}>
            {stats.roomsOccupied} of {stats.roomsTotal} occupied
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Active Dining Orders</Text>
          <Text style={[styles.cardValue, { color: Colors.warning }]}>{stats.activeOrders}</Text>
          <Text style={styles.cardSub}>Tables dining now</Text>
        </View>

        <View style={[styles.card, styles.cardFull]}>
          <Text style={styles.cardLabel}>Today's Sales</Text>
          <Text style={[styles.cardValue, { color: Colors.success }]}>
            {stats.dailyRevenue.toLocaleString()} ETB
          </Text>
          <Text style={styles.cardSub}>Rooms, Dining & Bar</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Operations Shortcuts</Text>
      <View style={styles.actionsList}>
        <TouchableOpacity style={styles.actionItem} onPress={onRefresh}>
          <Text style={styles.actionTitle}>🔄 Refresh & Sync Data</Text>
          <Text style={styles.actionDesc}>Pull latest bookings, menu items & orders</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userRole: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: Colors.warning,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bannerText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '500',
  },
  bannerBtn: {
    color: '#ffffff',
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFull: {
    minWidth: '100%',
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  actionsList: {
    gap: 8,
    marginBottom: 32,
  },
  actionItem: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
