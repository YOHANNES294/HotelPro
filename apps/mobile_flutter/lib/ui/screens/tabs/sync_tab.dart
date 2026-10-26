import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/constants.dart';
import '../../../core/theme.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/sync_provider.dart';

class SyncTab extends StatefulWidget {
  const SyncTab({super.key});

  @override
  State<SyncTab> createState() => _SyncTabState();
}

class _SyncTabState extends State<SyncTab> {
  Map<String, dynamic>? _activeShift;
  final _startingCashController = TextEditingController(text: '500');
  final _closingCashController = TextEditingController();
  final _serverUrlController = TextEditingController();

  bool _isShiftLoading = false;
  bool _isTestingConnection = false;
  String? _connectionTestResult;

  final _currencyFormat = NumberFormat.currency(symbol: 'ETB ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadShiftAndConfig();
  }

  @override
  void dispose() {
    _startingCashController.dispose();
    _closingCashController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadShiftAndConfig() async {
    final storage = await StorageService.getInstance();
    setState(() {
      _serverUrlController.text = storage.getApiBaseUrl();
    });

    final api = context.read<ApiService>();
    try {
      final res = await api.get('/financials/shifts/active');
      if (res.success && res.data is Map<String, dynamic> && mounted) {
        final data = res.data as Map<String, dynamic>;
        setState(() {
          _activeShift = data['shift'] as Map<String, dynamic>?;
        });
      } else {
        setState(() {
          _activeShift = null;
        });
      }
    } catch (_) {
      setState(() {
        _activeShift = null;
      });
    }
  }

  Future<void> _handleOpenShift() async {
    final startingCash = double.tryParse(_startingCashController.text.trim());
    if (startingCash == null || startingCash < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter valid starting cash'), backgroundColor: AppColors.danger),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final branchId = auth.currentUser?.branchId;
    if (branchId == null || branchId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active branch found for current user'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isShiftLoading = true);
    final api = context.read<ApiService>();

    final res = await api.post('/financials/shifts/open', body: {
      'branchId': branchId,
      'openingCash': startingCash.toStringAsFixed(2),
      'notes': 'Shift opened from mobile app',
    });
    setState(() => _isShiftLoading = false);

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cashier shift opened successfully!'), backgroundColor: AppColors.success),
      );
      _loadShiftAndConfig();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res.error ?? 'Failed to open shift'), backgroundColor: AppColors.danger),
      );
    }
  }

  Future<void> _handleCloseShift() async {
    if (_activeShift == null || _activeShift!['id'] == null) return;
    final shiftId = _activeShift!['id'].toString();
    final actualCash = double.tryParse(_closingCashController.text.trim()) ?? 0.0;

    setState(() => _isShiftLoading = true);
    final api = context.read<ApiService>();

    final res = await api.post('/financials/shifts/$shiftId/close', body: {
      'countedCash': actualCash.toStringAsFixed(2),
      'notes': 'Shift closed from mobile app',
    });
    setState(() => _isShiftLoading = false);

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Shift closed successfully!'), backgroundColor: AppColors.success),
      );
      _closingCashController.clear();
      _loadShiftAndConfig();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res.error ?? 'Failed to close shift'), backgroundColor: AppColors.danger),
      );
    }
  }

  Future<void> _testAndSaveServerUrl() async {
    final newUrl = _serverUrlController.text.trim();
    if (newUrl.isEmpty) return;

    setState(() {
      _isTestingConnection = true;
      _connectionTestResult = null;
    });

    final storage = await StorageService.getInstance();
    await storage.setApiBaseUrl(newUrl);

    final api = context.read<ApiService>();
    final res = await api.get('/health');

    setState(() {
      _isTestingConnection = false;
      if (res.success) {
        _connectionTestResult = '✅ Connected successfully! Server is healthy.';
      } else {
        _connectionTestResult = '❌ Connection failed: ${res.error}';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();

    return RefreshIndicator(
      onRefresh: _loadShiftAndConfig,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Section: Cashier Shift Management
          const Text(
            'Cashier Shift Management',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.text),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: _activeShift != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Shift Active',
                                style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          Text(
                            _activeShift!['id'] != null
                                ? 'ID: #${_activeShift!['id'].toString().substring(0, 8)}'
                                : '',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Starting Float: ${_currencyFormat.format(_activeShift!['startingCash'] ?? 0)}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.text),
                      ),
                      const SizedBox(height: 14),
                      const Divider(color: AppColors.border),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _closingCashController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Actual Ending Cash (ETB)',
                          hintText: 'Enter drawer count',
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.danger,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: _isShiftLoading ? null : _handleCloseShift,
                        child: _isShiftLoading
                            ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                            : const Text('Reconcile & Close Shift'),
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'No Active Shift',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.text),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Open a cashier shift to record cash transactions and table settlements.',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _startingCashController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Starting Drawer Cash (ETB)',
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _isShiftLoading ? null : _handleOpenShift,
                        child: _isShiftLoading
                            ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                            : const Text('Open Cashier Shift'),
                      ),
                    ],
                  ),
          ),

          const SizedBox(height: 24),

          // Section: Offline Synchronization
          const Text(
            'Offline Synchronization',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.text),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Pending Offline Queue', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: sync.pendingCount > 0 ? AppColors.warning.withOpacity(0.2) : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${sync.pendingCount} actions',
                        style: TextStyle(
                          color: sync.pendingCount > 0 ? AppColors.warning : AppColors.textMuted,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  sync.lastSyncedAt != null
                      ? 'Last synced: ${DateFormat('hh:mm:ss a').format(sync.lastSyncedAt!)}'
                      : 'Not synced yet this session',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
                if (sync.lastError != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Error: ${sync.lastError}',
                    style: const TextStyle(color: AppColors.danger, fontSize: 12),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.sync_rounded, size: 18),
                        label: Text(sync.isSyncing ? 'Syncing...' : 'Sync Now'),
                        onPressed: sync.isSyncing ? null : () => sync.syncFull(),
                      ),
                    ),
                    if (sync.pendingCount > 0) ...[
                      const SizedBox(width: 10),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.danger,
                          side: const BorderSide(color: AppColors.border),
                        ),
                        onPressed: () => sync.clearQueue(),
                        child: const Text('Clear'),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Section: Server Connection Configuration
          const Text(
            'Server Connection Settings',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.text),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('API Base URL', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(
                  controller: _serverUrlController,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: AppConstants.defaultApiUrl,
                  ),
                ),
                if (_connectionTestResult != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _connectionTestResult!,
                    style: TextStyle(
                      color: _connectionTestResult!.startsWith('✅') ? AppColors.success : AppColors.danger,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.surfaceLight,
                    foregroundColor: AppColors.text,
                    side: const BorderSide(color: AppColors.border),
                  ),
                  icon: _isTestingConnection
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.network_check_rounded, size: 18),
                  label: const Text('Test Connection & Save'),
                  onPressed: _isTestingConnection ? null : _testAndSaveServerUrl,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
