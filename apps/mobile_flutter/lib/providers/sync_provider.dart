import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../data/models/queued_action_model.dart';
import '../data/models/room_model.dart';
import '../data/models/order_model.dart';
import '../data/services/api_service.dart';
import '../data/services/storage_service.dart';

class SyncProvider extends ChangeNotifier {
  final ApiService _apiService;
  final StorageService _storageService;
  final Uuid _uuid = const Uuid();

  bool _isSyncing = false;
  DateTime? _lastSyncedAt;
  String? _lastError;
  List<QueuedActionModel> _queue = [];

  SyncProvider(this._apiService, this._storageService) {
    _loadQueue();
  }

  bool get isSyncing => _isSyncing;
  DateTime? get lastSyncedAt => _lastSyncedAt;
  String? get lastError => _lastError;
  int get pendingCount => _queue.where((a) => a.status == 'PENDING' || a.status == 'FAILED').length;
  List<QueuedActionModel> get queue => _queue;

  void _loadQueue() {
    _queue = _storageService.getQueuedActions();
    notifyListeners();
  }

  Future<void> enqueueAction(String type, Map<String, dynamic> payload) async {
    final action = QueuedActionModel(
      id: _uuid.v4(),
      type: type,
      payload: payload,
      createdAt: DateTime.now(),
      status: 'PENDING',
    );

    _queue.add(action);
    await _storageService.saveQueuedActions(_queue);
    notifyListeners();

    // Trigger background sync attempt
    processQueue();
  }

  Future<void> processQueue() async {
    if (_isSyncing) return;
    final pending = _queue.where((a) => a.status == 'PENDING' || a.status == 'FAILED').toList();
    if (pending.isEmpty) return;

    _isSyncing = true;
    _lastError = null;
    notifyListeners();

    try {
      final operations = pending.map((item) => {
        'idempotencyKey': item.id,
        'type': item.type,
        'payload': item.payload,
        'clientTimestamp': item.createdAt.toUtc().toIso8601String(),
      }).toList();

      final res = await _apiService.post('/sync', body: {'operations': operations});

      if (res.success && res.data is Map<String, dynamic>) {
        final results = res.data['results'] as List<dynamic>? ?? [];
        final completedIds = <String>{};

        for (final r in results) {
          if (r is Map<String, dynamic>) {
            final key = r['idempotencyKey']?.toString();
            final status = r['status']?.toString();
            if (key != null && (status == 'PROCESSED' || status == 'SUCCESS')) {
              completedIds.add(key);
            }
          }
        }

        _queue.removeWhere((a) => completedIds.contains(a.id));
        await _storageService.saveQueuedActions(_queue);
        _lastSyncedAt = DateTime.now();
      } else {
        _lastError = res.error ?? 'Sync failed';
      }
    } catch (e) {
      _lastError = e.toString();
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<bool> syncFull() async {
    await processQueue();

    try {
      // Sync fresh rooms
      final roomsRes = await _apiService.get('/hotels/rooms');
      if (roomsRes.success && roomsRes.data != null) {
        final rawRooms = roomsRes.data is List
            ? roomsRes.data as List
            : (roomsRes.data is Map && roomsRes.data['rooms'] is List)
                ? roomsRes.data['rooms'] as List
                : [];
        final rooms = rawRooms
            .whereType<Map>()
            .map((r) => RoomModel.fromJson(Map<String, dynamic>.from(r)))
            .toList();
        await _storageService.saveCachedRooms(rooms);
      }

      // Sync active orders
      final ordersRes = await _apiService.get('/restaurants/orders?status=PENDING,IN_KITCHEN,READY');
      if (ordersRes.success && ordersRes.data != null) {
        final rawOrders = ordersRes.data is List
            ? ordersRes.data as List
            : (ordersRes.data is Map && ordersRes.data['orders'] is List)
                ? ordersRes.data['orders'] as List
                : [];
        final orders = rawOrders
            .whereType<Map>()
            .map((o) => OrderModel.fromJson(Map<String, dynamic>.from(o)))
            .toList();
        await _storageService.saveCachedOrders(orders);
      }

      _lastSyncedAt = DateTime.now();
      notifyListeners();
      return true;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> clearQueue() async {
    _queue.clear();
    await _storageService.saveQueuedActions(_queue);
    notifyListeners();
  }
}
