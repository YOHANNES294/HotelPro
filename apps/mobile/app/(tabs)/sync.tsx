import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../src/constants/theme';
import { useAuth } from '../../src/context/auth-context';
import { useSync } from '../../src/context/sync-context';
import { apiRequest, getApiBaseUrl } from '../../src/services/api-client';
import { offlineStorage, QueuedAction } from '../../src/services/sqlite-db';

export default function SyncScreen() {
  const { user } = useAuth();
  const { isSyncing, lastSyncedAt, pendingCount, syncNow } = useSync();
  const [queuedItems, setQueuedItems] = useState<QueuedAction[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [startingCash, setStartingCash] = useState('500');
  const [actualCash, setActualCash] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [shiftLoading, setShiftLoading] = useState(false);

  const loadShiftAndQueue = async () => {
    // 1. Load queued items from SQLite
    try {
      const items = offlineStorage.getPendingQueue();
      setQueuedItems(items);
    } catch {}

    // 2. Fetch server URL
    getApiBaseUrl().then(setServerUrl);

    // 3. Fetch active cashier shift from API
    try {
      const res = await apiRequest('/api/v1/financials/shifts/active');
      if (res.success && res.data) {
        setActiveShift(res.data);
      } else {
        setActiveShift(null);
      }
    } catch {}
  };

  useEffect(() => {
    loadShiftAndQueue();
  }, [pendingCount]);

  const handleOpenShift = async () => {
    if (!startingCash) {
      Alert.alert('Required', 'Please enter starting cash amount');
      return;
    }

    setShiftLoading(true);
    try {
      const res = await apiRequest('/api/v1/financials/shifts/open', {
        method: 'POST',
        body: JSON.stringify({ startingCash: parseFloat(startingCash) }),
      });

      if (res.success) {
        Alert.alert('Shift Opened', 'Cashier shift is now active');
        loadShiftAndQueue();
      } else {
        Alert.alert('Error', res.error || 'Failed to open shift');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    if (!actualCash) {
      Alert.alert('Required', 'Please enter final counted cash in drawer');
      return;
    }

    setShiftLoading(true);
    try {
      const res = await apiRequest(`/api/v1/financials/shifts/${activeShift.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          actualCash: parseFloat(actualCash),
          notes: 'Closed via Mobile Terminal',
        }),
      });

      if (res.success) {
        const diff = parseFloat(res.data.variance || 0);
        const sign = diff >= 0 ? '+' : '';
        Alert.alert(
          'Shift Closed',
          `Shift closed successfully!\nExpected Cash: ${res.data.expectedCash} ETB\nActual Cash: ${res.data.actualCash} ETB\nVariance: ${sign}${diff} ETB`
        );
        setActiveShift(null);
        setActualCash('');
        loadShiftAndQueue();
      } else {
        Alert.alert('Error', res.error || 'Failed to close shift');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message);
    } finally {
      setShiftLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Sync Status Banner */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Offline Sync Center</Text>
            <Text style={styles.cardSubtitle}>
              {pendingCount === 0
                ? 'All operations synchronized'
                : `${pendingCount} operations waiting to sync`}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: pendingCount === 0 ? Colors.success : Colors.warning },
            ]}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Server Endpoint:</Text>
          <Text style={styles.infoValue}>{serverUrl || 'Detecting...'}</Text>
          <Text style={[styles.infoLabel, { marginTop: 4 }]}>Last Synchronized:</Text>
          <Text style={styles.infoValue}>
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Not synced this session'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={async () => {
            await syncNow();
            loadShiftAndQueue();
          }}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.syncButtonText}>🔄 Sync Everything with Cloud</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Cashier Shift Management */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cashier Shift & Reconciliation</Text>
        {activeShift ? (
          <View style={styles.shiftActiveBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.shiftBadge}>ACTIVE SHIFT</Text>
              <Text style={styles.shiftTime}>
                Opened {new Date(activeShift.openedAt).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Starting Float</Text>
                <Text style={styles.metricValue}>
                  {parseFloat(activeShift.startingCash).toLocaleString()} ETB
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Cash Payments</Text>
                <Text style={[styles.metricValue, { color: Colors.success }]}>
                  +{parseFloat(activeShift.cashPayments || 0).toLocaleString()} ETB
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Final Counted Cash in Drawer (ETB)</Text>
              <TextInput
                style={styles.input}
                value={actualCash}
                onChangeText={setActualCash}
                keyboardType="numeric"
                placeholder="Count cash and enter amount"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.closeShiftBtn}
              onPress={handleCloseShift}
              disabled={shiftLoading}
            >
              {shiftLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.closeShiftText}>Reconcile & Close Shift</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noShiftBox}>
            <Text style={styles.noShiftText}>No active cashier shift for this device/user</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Starting Drawer Cash Float (ETB)</Text>
              <TextInput
                style={styles.input}
                value={startingCash}
                onChangeText={setStartingCash}
                keyboardType="numeric"
                placeholder="500"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <TouchableOpacity
              style={styles.openShiftBtn}
              onPress={handleOpenShift}
              disabled={shiftLoading}
            >
              {shiftLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.openShiftText}>Open Cashier Shift</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Queued Actions Inspector */}
      {queuedItems.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Queued Offline Actions ({queuedItems.length})</Text>
          <View style={styles.queueList}>
            {queuedItems.map((item) => (
              <View key={item.id} style={styles.queueItem}>
                <View>
                  <Text style={styles.queueType}>{item.type}</Text>
                  <Text style={styles.queueTime}>
                    {new Date(item.createdAt).toLocaleTimeString()} • Attempts: {item.attempts}
                  </Text>
                </View>
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shiftActiveBox: {
    marginTop: 12,
  },
  shiftBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: Colors.success,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  shiftTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  inputGroup: {
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  closeShiftBtn: {
    backgroundColor: Colors.warning,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeShiftText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noShiftBox: {
    marginTop: 12,
  },
  noShiftText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  openShiftBtn: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  openShiftText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  queueList: {
    marginTop: 10,
    gap: 8,
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
  },
  queueType: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  queueTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  queueBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  queueBadgeText: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
