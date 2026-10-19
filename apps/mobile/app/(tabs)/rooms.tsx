import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { Colors } from '../../src/constants/theme';
import { apiRequest } from '../../src/services/api-client';
import { offlineStorage } from '../../src/services/sqlite-db';
import { syncService } from '../../src/services/offline-queue';
import { useAuth } from '../../src/context/auth-context';

export default function RoomsScreen() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadRooms = async () => {
    // 1. Load from local SQLite cache first
    try {
      const cached = offlineStorage.getCachedRooms();
      if (cached && cached.length > 0) {
        setRooms(cached);
      }
    } catch {}

    // 2. Fetch fresh from API if available
    try {
      const res = await apiRequest('/api/v1/hotels/rooms');
      if (res.success && res.data) {
        const mapped = res.data.map((r: any) => ({
          id: r.id,
          number: r.number,
          typeName: r.roomType?.name || 'Standard',
          floor: r.floor,
          status: r.status,
          pricePerNight: parseFloat(r.roomType?.basePrice || 0),
          updatedAt: Date.now(),
        }));
        setRooms(mapped);
        offlineStorage.cacheRooms(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncService.syncFull();
    await loadRooms();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedRoom) return;

    // Optimistically update local state
    setRooms((prev) =>
      prev.map((r) => (r.id === selectedRoom.id ? { ...r, status: newStatus } : r))
    );
    setModalVisible(false);

    try {
      const res = await apiRequest(`/api/v1/hotels/rooms/${selectedRoom.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.success) {
        // Enqueue offline action for sync
        syncService.enqueueAction('UPDATE_ROOM_STATUS', {
          roomId: selectedRoom.id,
          status: newStatus,
        });
      }
    } catch {
      syncService.enqueueAction('UPDATE_ROOM_STATUS', {
        roomId: selectedRoom.id,
        status: newStatus,
      });
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesFilter = selectedFilter === 'ALL' || r.status === selectedFilter;
    const matchesSearch =
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.typeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return Colors.success;
      case 'OCCUPIED':
        return Colors.primary;
      case 'DIRTY':
      case 'CLEANING':
        return Colors.warning;
      case 'MAINTENANCE':
        return Colors.danger;
      default:
        return Colors.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search room number or type..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {['ALL', 'AVAILABLE', 'OCCUPIED', 'DIRTY', 'MAINTENANCE'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, selectedFilter === f && styles.filterChipActive]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === f && styles.filterChipTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const color = getStatusColor(item.status);
          return (
            <TouchableOpacity
              style={styles.roomCard}
              onPress={() => {
                setSelectedRoom(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.roomHeader}>
                <View>
                  <Text style={styles.roomNumber}>Room {item.number}</Text>
                  <Text style={styles.roomType}>
                    {item.typeName} • Floor {item.floor}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${color}25`, borderColor: color }]}>
                  <Text style={[styles.statusBadgeText, { color }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.roomFooter}>
                <Text style={styles.priceText}>
                  {item.pricePerNight ? `${item.pricePerNight.toLocaleString()} ETB / night` : ''}
                </Text>
                <Text style={styles.actionPrompt}>Tap to manage ➔</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No rooms matching the filter</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manage Room {selectedRoom?.number}</Text>
            <Text style={styles.modalSubtitle}>Current Status: {selectedRoom?.status}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: Colors.success }]}
                onPress={() => handleUpdateStatus('AVAILABLE')}
              >
                <Text style={styles.statusOptionText}>Mark Clean & Available</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: Colors.warning }]}
                onPress={() => handleUpdateStatus('DIRTY')}
              >
                <Text style={styles.statusOptionText}>Mark for Housekeeping (Dirty)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: Colors.danger }]}
                onPress={() => handleUpdateStatus('MAINTENANCE')}
              >
                <Text style={styles.statusOptionText}>Mark Out of Order (Maintenance)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBarContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  roomCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
  },
  roomType: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  roomFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    paddingTop: 8,
  },
  priceText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  actionPrompt: {
    color: Colors.accent,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  modalButtons: {
    gap: 12,
    marginBottom: 16,
  },
  statusOption: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
