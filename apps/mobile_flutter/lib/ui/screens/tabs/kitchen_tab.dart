import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme.dart';
import '../../../data/models/order_model.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/sync_provider.dart';
import '../../widgets/status_badge.dart';

class KitchenTab extends StatefulWidget {
  const KitchenTab({super.key});

  @override
  State<KitchenTab> createState() => _KitchenTabState();
}

class _KitchenTabState extends State<KitchenTab> {
  List<OrderModel> _tickets = [];
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadTickets();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) => _loadTickets());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    // 1. Cached fallback
    try {
      final storage = await StorageService.getInstance();
      final cached = storage.getCachedOrders();
      final kitchenRelevant = cached.where((o) =>
        o.status == 'CONFIRMED' || o.status == 'PREPARING' || o.status == 'READY'
      ).toList();

      if (kitchenRelevant.isNotEmpty && mounted) {
        setState(() {
          _tickets = kitchenRelevant;
        });
      }
    } catch (_) {}

    // 2. Fetch fresh tickets
    try {
      final api = context.read<ApiService>();
      final res = await api.get('/restaurants/orders?status=CONFIRMED,PREPARING,READY');

      if (res.success && res.data is List && mounted) {
        final list = (res.data as List)
            .map((o) => OrderModel.fromJson(o as Map<String, dynamic>))
            .toList();

        setState(() {
          _tickets = list;
        });

        final storage = await StorageService.getInstance();
        await storage.saveCachedOrders(list);
      }
    } catch (_) {}
  }

  Future<void> _updateTicketStatus(OrderModel order, String newStatus) async {
    // Optimistic update
    setState(() {
      if (newStatus == 'COMPLETED') {
        _tickets.removeWhere((t) => t.id == order.id);
      } else {
        _tickets = _tickets.map((t) => t.id == order.id ? t.copyWith(status: newStatus) : t).toList();
      }
    });

    final storage = await StorageService.getInstance();
    await storage.saveCachedOrders(_tickets);

    final api = context.read<ApiService>();
    final sync = context.read<SyncProvider>();

    try {
      final res = await api.patch('/restaurants/orders/${order.id}/status', body: {'status': newStatus});

      if (!res.success) {
        await sync.enqueueAction('UPDATE_ORDER_STATUS', {'orderId': order.id, 'status': newStatus});
      }
    } catch (_) {
      await sync.enqueueAction('UPDATE_ORDER_STATUS', {'orderId': order.id, 'status': newStatus});
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order #${order.orderNumber} updated to ${newStatus.replaceAll('_', ' ')}'),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: AppColors.surface,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.microwave_rounded, color: AppColors.accent, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    'Kitchen Display (${_tickets.length} tickets)',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.text),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: AppColors.textMuted),
                tooltip: 'Refresh Tickets',
                onPressed: _loadTickets,
              ),
            ],
          ),
        ),

        // Ticket List
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadTickets,
            color: AppColors.primary,
            child: _tickets.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, size: 48, color: AppColors.success),
                        const SizedBox(height: 12),
                        const Text(
                          'All caught up!',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.text),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'No orders waiting to be prepared',
                          style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _tickets.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (context, index) {
                      final ticket = _tickets[index];
                      final elapsedMins = DateTime.now().difference(ticket.createdAt).inMinutes;

                      return Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: ticket.status == 'CONFIRMED' ? AppColors.warning : AppColors.border,
                            width: ticket.status == 'CONFIRMED' ? 1.5 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Ticket Header
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight.withOpacity(0.5),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Ticket #${ticket.orderNumber}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.text),
                                      ),
                                      Text(
                                        '${ticket.tableName} • $elapsedMins mins ago',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: elapsedMins > 15 ? AppColors.danger : AppColors.textMuted,
                                          fontWeight: elapsedMins > 15 ? FontWeight.bold : FontWeight.normal,
                                        ),
                                      ),
                                    ],
                                  ),
                                  StatusBadge(status: ticket.status),
                                ],
                              ),
                            ),

                            // Ticket Items
                            Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                children: ticket.items.map((it) {
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withOpacity(0.15),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            '${it.quantity}x',
                                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            it.name,
                                            style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.text, fontSize: 14),
                                          ),
                                        ),
                                        if (it.notes != null && it.notes!.isNotEmpty)
                                          Text(
                                            '(${it.notes})',
                                            style: const TextStyle(color: AppColors.warning, fontSize: 12),
                                          ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),

                            // Ticket Action Buttons
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                              child: _buildActionForTicket(ticket),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionForTicket(OrderModel ticket) {
    if (ticket.status == 'CONFIRMED') {
      return ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
        ),
        icon: const Icon(Icons.play_arrow_rounded, size: 18),
        label: const Text('Start Preparing'),
        onPressed: () => _updateTicketStatus(ticket, 'PREPARING'),
      );
    } else if (ticket.status == 'PREPARING') {
      return ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.success,
          foregroundColor: Colors.white,
        ),
        icon: const Icon(Icons.done_all_rounded, size: 18),
        label: const Text('Mark Ready for Server'),
        onPressed: () => _updateTicketStatus(ticket, 'READY'),
      );
    } else {
      return ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.surfaceLight,
          foregroundColor: AppColors.text,
          side: const BorderSide(color: AppColors.border),
        ),
        icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
        label: const Text('Complete & Clear Ticket'),
        onPressed: () => _updateTicketStatus(ticket, 'COMPLETED'),
      );
    }
  }
}
