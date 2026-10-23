import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/sync_provider.dart';
import 'tabs/dashboard_tab.dart';
import 'tabs/rooms_tab.dart';
import 'tabs/orders_tab.dart';
import 'tabs/kitchen_tab.dart';
import 'tabs/sync_tab.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final sync = context.watch<SyncProvider>();
    final user = auth.currentUser;

    final tabs = <_TabItem>[
      _TabItem(
        title: 'Overview',
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard_rounded,
        widget: DashboardTab(onNavigateTab: (index) => setState(() => _currentIndex = index)),
      ),
      const _TabItem(
        title: 'Rooms',
        icon: Icons.hotel_outlined,
        activeIcon: Icons.hotel_rounded,
        widget: RoomsTab(),
      ),
      const _TabItem(
        title: 'Orders',
        icon: Icons.restaurant_menu_outlined,
        activeIcon: Icons.restaurant_menu_rounded,
        widget: OrdersTab(),
      ),
      const _TabItem(
        title: 'Kitchen',
        icon: Icons.microwave_outlined,
        activeIcon: Icons.microwave_rounded,
        widget: KitchenTab(),
      ),
      _TabItem(
        title: 'Sync',
        icon: Icons.sync_outlined,
        activeIcon: Icons.sync_rounded,
        badgeCount: sync.pendingCount,
        widget: const SyncTab(),
      ),
    ];

    if (_currentIndex >= tabs.length) {
      _currentIndex = 0;
    }

    final activeTab = tabs[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.hotel_rounded, color: AppColors.primary, size: 22),
            const SizedBox(width: 8),
            Text(
              activeTab.title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          if (sync.isSyncing)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 14),
              child: Center(
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              ),
            )
          else if (sync.pendingCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton(
                icon: Badge(
                  label: Text('${sync.pendingCount}'),
                  backgroundColor: AppColors.warning,
                  child: const Icon(Icons.cloud_upload_outlined, color: AppColors.warning),
                ),
                tooltip: 'Offline actions pending sync',
                onPressed: () => setState(() => _currentIndex = 4),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined, color: AppColors.textMuted),
            tooltip: 'User Profile',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.surface,
                  title: Text(user?.name ?? 'Staff Member'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Email: ${user?.email ?? ''}', style: const TextStyle(color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text('Role: ${user?.role.replaceAll('_', ' ') ?? ''}', style: const TextStyle(color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text('Organization: ${user?.organizationName ?? ''}', style: const TextStyle(color: AppColors.textMuted)),
                    ],
                  ),
                  actions: [
                    TextButton(
                      child: const Text('Cancel'),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                      child: const Text('Logout'),
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        auth.logout();
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: tabs.map((t) => t.widget).toList(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: tabs.map((t) {
          Widget iconWidget = Icon(t.icon);
          Widget activeIconWidget = Icon(t.activeIcon);

          if (t.badgeCount != null && t.badgeCount! > 0) {
            iconWidget = Badge(
              label: Text('${t.badgeCount}'),
              backgroundColor: AppColors.warning,
              child: iconWidget,
            );
            activeIconWidget = Badge(
              label: Text('${t.badgeCount}'),
              backgroundColor: AppColors.warning,
              child: activeIconWidget,
            );
          }

          return BottomNavigationBarItem(
            icon: iconWidget,
            activeIcon: activeIconWidget,
            label: t.title,
          );
        }).toList(),
      ),
    );
  }
}

class _TabItem {
  final String title;
  final IconData icon;
  final IconData activeIcon;
  final Widget widget;
  final int? badgeCount;

  const _TabItem({
    required this.title,
    required this.icon,
    required this.activeIcon,
    required this.widget,
    this.badgeCount,
  });
}
