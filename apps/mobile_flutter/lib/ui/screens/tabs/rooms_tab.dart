import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme.dart';
import '../../../data/models/room_model.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/sync_provider.dart';
import '../../widgets/status_badge.dart';

class RoomsTab extends StatefulWidget {
  const RoomsTab({super.key});

  @override
  State<RoomsTab> createState() => _RoomsTabState();
}

class _RoomsTabState extends State<RoomsTab> {
  List<RoomModel> _rooms = [];
  String _selectedFilter = 'ALL';
  String _searchQuery = '';

  final _currencyFormat = NumberFormat.currency(symbol: 'ETB ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadRooms();
  }

  Future<void> _loadRooms() async {
    // 1. Load from cache first
    try {
      final storage = await StorageService.getInstance();
      final cached = storage.getCachedRooms();
      if (cached.isNotEmpty && mounted) {
        setState(() {
          _rooms = cached;
        });
      }
    } catch (_) {}

    // 2. Fetch fresh from API
    try {
      final api = context.read<ApiService>();
      final res = await api.get('/hotels/rooms');

      if (res.success && res.data is List && mounted) {
        final list = (res.data as List)
            .map((r) => RoomModel.fromJson(r as Map<String, dynamic>))
            .toList();

        setState(() {
          _rooms = list;
        });

        final storage = await StorageService.getInstance();
        await storage.saveCachedRooms(list);
      }
    } catch (_) {}
  }

  Future<void> _onRefresh() async {
    await context.read<SyncProvider>().syncFull();
    await _loadRooms();
  }

  Future<void> _updateRoomStatus(RoomModel room, String newStatus) async {
    Navigator.of(context).pop();

    // Optimistic UI update
    setState(() {
      _rooms = _rooms.map((r) => r.id == room.id ? r.copyWith(status: newStatus) : r).toList();
    });

    final storage = await StorageService.getInstance();
    await storage.saveCachedRooms(_rooms);

    final api = context.read<ApiService>();
    final sync = context.read<SyncProvider>();

    try {
      final res = await api.patch('/hotels/rooms/${room.id}/status', body: {'status': newStatus});

      if (!res.success) {
        // Enqueue offline action
        await sync.enqueueAction('UPDATE_ROOM_STATUS', {
          'roomId': room.id,
          'status': newStatus,
        });
      }
    } catch (_) {
      await sync.enqueueAction('UPDATE_ROOM_STATUS', {
        'roomId': room.id,
        'status': newStatus,
      });
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Room ${room.number} status updated to ${newStatus.replaceAll('_', ' ')}'),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _showRoomStatusSheet(RoomModel room) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Room ${room.number}',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.text),
                        ),
                        Text(
                          '${room.typeName} • Floor ${room.floor}',
                          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    StatusBadge(status: room.status),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Change Room Status',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _buildStatusOption(room, 'AVAILABLE', 'Mark Available', AppColors.success),
                    _buildStatusOption(room, 'OCCUPIED', 'Mark Occupied', AppColors.danger),
                    _buildStatusOption(room, 'DIRTY', 'Needs Cleaning', AppColors.warning),
                    _buildStatusOption(room, 'MAINTENANCE', 'Maintenance', AppColors.textMuted),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusOption(RoomModel room, String status, String label, Color color) {
    final isCurrent = room.status == status;

    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: isCurrent ? color.withOpacity(0.2) : AppColors.surfaceLight,
        foregroundColor: isCurrent ? color : AppColors.text,
        side: BorderSide(color: isCurrent ? color : AppColors.border, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      onPressed: isCurrent ? null : () => _updateRoomStatus(room, status),
      child: Text(label),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _rooms.where((r) {
      final matchesFilter = _selectedFilter == 'ALL' || r.status == _selectedFilter;
      final matchesSearch = _searchQuery.isEmpty ||
          r.number.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.typeName.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }).toList();

    return Column(
      children: [
        // Search & Filter Header
        Container(
          padding: const EdgeInsets.all(16),
          color: AppColors.surface,
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: 'Search room number or type...',
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () => setState(() => _searchQuery = ''),
                        )
                      : null,
                ),
                onChanged: (val) => setState(() => _searchQuery = val),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'All (${_rooms.length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('AVAILABLE', 'Available (${_rooms.where((r) => r.status == 'AVAILABLE').length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('OCCUPIED', 'Occupied (${_rooms.where((r) => r.status == 'OCCUPIED').length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('DIRTY', 'Dirty (${_rooms.where((r) => r.status == 'DIRTY').length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('MAINTENANCE', 'Maintenance (${_rooms.where((r) => r.status == 'MAINTENANCE').length})'),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Room List
        Expanded(
          child: RefreshIndicator(
            onRefresh: _onRefresh,
            color: AppColors.primary,
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.hotel_outlined, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text(
                          _searchQuery.isNotEmpty ? 'No rooms match your search' : 'No rooms found',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 15),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final room = filtered[index];
                      return InkWell(
                        onTap: () => _showRoomStatusSheet(room),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border, width: 1),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.border),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  room.number,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.text,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      room.typeName,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.text,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Floor ${room.floor} • ${_currencyFormat.format(room.pricePerNight)}/night',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              StatusBadge(status: room.status),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return ChoiceChip(
      selected: isSelected,
      label: Text(label, style: TextStyle(color: isSelected ? Colors.white : AppColors.textMuted, fontSize: 12)),
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surfaceLight,
      side: BorderSide(color: isSelected ? AppColors.primary : AppColors.border),
      onSelected: (_) => setState(() => _selectedFilter = filterKey),
    );
  }
}
