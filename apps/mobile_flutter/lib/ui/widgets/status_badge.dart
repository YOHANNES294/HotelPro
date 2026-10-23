import 'package:flutter/material.dart';
import '../../core/theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getBadgeConfig(status.toUpperCase());

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: config.color.withOpacity(0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: config.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            config.label,
            style: TextStyle(
              color: config.color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  _BadgeConfig _getBadgeConfig(String s) {
    switch (s) {
      // Room statuses
      case 'AVAILABLE':
        return _BadgeConfig('Available', AppColors.success);
      case 'OCCUPIED':
        return _BadgeConfig('Occupied', AppColors.danger);
      case 'DIRTY':
        return _BadgeConfig('Needs Cleaning', AppColors.warning);
      case 'CLEANING':
        return _BadgeConfig('Cleaning', AppColors.accent);
      case 'MAINTENANCE':
        return _BadgeConfig('Maintenance', AppColors.textMuted);
      case 'OUT_OF_SERVICE':
        return _BadgeConfig('Out of Order', AppColors.danger);

      // Order & Kitchen statuses
      case 'PENDING':
        return _BadgeConfig('Pending', AppColors.textMuted);
      case 'CONFIRMED':
        return _BadgeConfig('New Ticket', AppColors.warning);
      case 'PREPARING':
        return _BadgeConfig('Preparing', AppColors.accent);
      case 'READY':
        return _BadgeConfig('Ready to Serve', AppColors.success);
      case 'SERVED':
        return _BadgeConfig('Served', AppColors.primary);
      case 'COMPLETED':
        return _BadgeConfig('Completed', AppColors.success);
      case 'CANCELLED':
        return _BadgeConfig('Cancelled', AppColors.danger);

      default:
        return _BadgeConfig(s.replaceAll('_', ' '), AppColors.textMuted);
    }
  }
}

class _BadgeConfig {
  final String label;
  final Color color;

  _BadgeConfig(this.label, this.color);
}
