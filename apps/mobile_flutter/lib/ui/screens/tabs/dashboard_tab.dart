import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/sync_provider.dart';
import '../../widgets/stat_card.dart';

class DashboardTab extends StatefulWidget {
  final Function(int) onNavigateTab;

  const DashboardTab({super.key, required this.onNavigateTab});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  int _roomsTotal = 0;
  int _roomsOccupied = 0;
  int _activeOrders = 0;
  double _dailyRevenue = 0.0;

  final _currencyFormat = NumberFormat.currency(symbol: 'ETB ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // 1. Try local cache first
    try {
      final storage = await StorageService.getInstance();
      final cachedRooms = storage.getCachedRooms();
      final cachedOrders = storage.getCachedOrders();

      if (mounted) {
        setState(() {
          _roomsTotal = cachedRooms.length;
          _roomsOccupied = cachedRooms.where((r) => r.status == 'OCCUPIED').length;
          _activeOrders = cachedOrders.where((o) => o.status != 'COMPLETED' && o.status != 'CANCELLED').length;
        });
      }
    } catch (_) {}

    // 2. Fetch live metrics from API
    try {
      final api = context.read<ApiService>();
      final res = await api.get('/reports/dashboard');

      if (res.success && res.data is Map<String, dynamic> && mounted) {
        final data = res.data as Map<String, dynamic>;
        final summary = (data['summary'] is Map<String, dynamic>)
            ? data['summary'] as Map<String, dynamic>
            : data;
        setState(() {
          _roomsTotal = summary['totalRooms'] is int
              ? summary['totalRooms']
              : int.tryParse(summary['totalRooms']?.toString() ?? '0') ?? _roomsTotal;
          _roomsOccupied = summary['occupiedRooms'] is int
              ? summary['occupiedRooms']
              : int.tryParse(summary['occupiedRooms']?.toString() ?? '0') ?? _roomsOccupied;
          _activeOrders = summary['activeOrdersCount'] is int
              ? summary['activeOrdersCount']
              : int.tryParse(summary['activeOrdersCount']?.toString() ?? '0') ?? _activeOrders;
          _dailyRevenue = summary['todayTotalRevenue'] is num
              ? (summary['todayTotalRevenue'] as num).toDouble()
              : double.tryParse(summary['todayTotalRevenue']?.toString() ?? '0') ?? 0.0;
        });
      }
    } catch (_) {}
  }

  Future<void> _onRefresh() async {
    await context.read<SyncProvider>().syncFull();
    await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final sync = context.watch<SyncProvider>();
    final user = auth.currentUser;

    final occupancyRate = _roomsTotal > 0 ? ((_roomsOccupied / _roomsTotal) * 100).round() : 0;

    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User Welcome Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    user != null && user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Welcome back,',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                      ),
                      Text(
                        user?.name ?? 'Staff Member',
                        style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${user?.role.replaceAll('_', ' ') ?? 'STAFF'} • ${user?.organizationName ?? 'HotelPro'}',
                        style: const TextStyle(
                          color: Color(0xFFA5B4FC),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout_rounded, color: AppColors.textMuted),
                  tooltip: 'Logout',
                  onPressed: () => auth.logout(),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Offline Pending Banner
          if (sync.pendingCount > 0) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.warning.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.cloud_upload_outlined, color: AppColors.warning, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '⚡ ${sync.pendingCount} actions queued for sync',
                      style: const TextStyle(color: AppColors.warning, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ),
                  TextButton(
                    onPressed: sync.isSyncing ? null : () => sync.processQueue(),
                    child: Text(sync.isSyncing ? 'Syncing...' : 'Sync Now'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Today's Snapshot Header
          const Text(
            "Today's Snapshot",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 12),

          // 2x2 Metric Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            children: [
              StatCard(
                title: 'Occupancy Rate',
                value: '$occupancyRate%',
                icon: Icons.pie_chart_outline_rounded,
                color: AppColors.primary,
                subtitle: '$_roomsOccupied of $_roomsTotal rooms',
              ),
              StatCard(
                title: 'Active Orders',
                value: '$_activeOrders',
                icon: Icons.receipt_long_rounded,
                color: AppColors.warning,
                subtitle: 'Restaurant & Bar',
              ),
              StatCard(
                title: 'Occupied Rooms',
                value: '$_roomsOccupied',
                icon: Icons.meeting_room_outlined,
                color: AppColors.accent,
                subtitle: '${_roomsTotal - _roomsOccupied} available',
              ),
              StatCard(
                title: 'Daily Revenue',
                value: _currencyFormat.format(_dailyRevenue),
                icon: Icons.payments_outlined,
                color: AppColors.success,
                subtitle: 'Today’s gross',
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Operations Shortcuts
          const Text(
            'Quick Operations',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 12),

          _buildActionTile(
            icon: Icons.hotel_rounded,
            title: 'Hotel Rooms',
            subtitle: 'Inspect occupancy, check-in, and update cleaning states',
            color: AppColors.primary,
            onTap: () => widget.onNavigateTab(1),
          ),
          const SizedBox(height: 10),
          _buildActionTile(
            icon: Icons.restaurant_menu_rounded,
            title: 'Point of Sale (POS)',
            subtitle: 'Create food & drink orders for tables and guests',
            color: AppColors.warning,
            onTap: () => widget.onNavigateTab(2),
          ),
          const SizedBox(height: 10),
          _buildActionTile(
            icon: Icons.kitchen_rounded,
            title: 'Kitchen Display System',
            subtitle: 'Live ticket queue for chefs and kitchen staff',
            color: AppColors.accent,
            onTap: () => widget.onNavigateTab(3),
          ),
          const SizedBox(height: 10),
          _buildActionTile(
            icon: Icons.sync_rounded,
            title: 'Sync & Cashier Shifts',
            subtitle: 'Manage active cashier shift, starting cash, and offline sync',
            color: AppColors.success,
            onTap: () => widget.onNavigateTab(4),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
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
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
