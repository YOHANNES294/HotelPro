import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme.dart';
import '../../../data/models/order_model.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/storage_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/sync_provider.dart';
import '../../widgets/status_badge.dart';

class OrdersTab extends StatefulWidget {
  const OrdersTab({super.key});

  @override
  State<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<OrdersTab> {
  int _tabIndex = 0; // 0 = New Order (POS), 1 = Active Orders
  List<MenuItemModel> _menuItems = [];
  List<Map<String, dynamic>> _tables = [];
  String? _selectedTableId;
  String _selectedCategory = 'ALL';
  final List<CartItemModel> _cart = [];
  List<OrderModel> _activeOrders = [];
  bool _isLoading = false;

  final _currencyFormat = NumberFormat.currency(symbol: 'ETB ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // 1. Load active orders from cache
    try {
      final storage = await StorageService.getInstance();
      final cached = storage.getCachedOrders();
      if (cached.isNotEmpty && mounted) {
        setState(() {
          _activeOrders = cached;
        });
      }
    } catch (_) {}

    // 2. Fetch fresh tables, menu, and orders from API
    try {
      final api = context.read<ApiService>();

      final results = await Future.wait([
        api.get('/restaurants/tables'),
        api.get('/restaurants/menu'),
        api.get('/restaurants/orders?status=PENDING,IN_KITCHEN,READY'),
      ]);

      if (mounted) {
        final tablesRes = results[0];
        final menuRes = results[1];
        final ordersRes = results[2];

        if (tablesRes.success && tablesRes.data != null) {
          final rawTables = tablesRes.data is List
              ? tablesRes.data as List
              : (tablesRes.data is Map && tablesRes.data['tables'] is List)
                  ? tablesRes.data['tables'] as List
                  : [];
          final tbls = rawTables.whereType<Map>().map((t) => Map<String, dynamic>.from(t)).toList();
          setState(() {
            _tables = tbls;
            if (tbls.isNotEmpty && _selectedTableId == null) {
              _selectedTableId = tbls[0]['id']?.toString();
            }
          });
        }

        if (menuRes.success && menuRes.data != null) {
          final List<MenuItemModel> allItems = [];
          final rawCategories = menuRes.data is List
              ? menuRes.data as List
              : (menuRes.data is Map && menuRes.data['categories'] is List)
                  ? menuRes.data['categories'] as List
                  : [];

          for (final cat in rawCategories) {
            if (cat is! Map) continue;
            final catMap = Map<String, dynamic>.from(cat);
            final catName = catMap['name']?.toString() ?? 'Mains';
            final rawItems = catMap['menuItems'] ?? catMap['items'];
            if (rawItems is List) {
              for (final it in rawItems) {
                if (it is! Map) continue;
                allItems.add(MenuItemModel.fromJson(Map<String, dynamic>.from(it), categoryName: catName));
              }
            }
          }

          setState(() {
            _menuItems = allItems;
          });
        }

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
          setState(() {
            _activeOrders = orders;
          });
          final storage = await StorageService.getInstance();
          await storage.saveCachedOrders(orders);
        }
      }
    } catch (_) {}
  }

  void _addToCart(MenuItemModel item) {
    setState(() {
      final existingIndex = _cart.indexWhere((c) => c.id == item.id);
      if (existingIndex >= 0) {
        _cart[existingIndex].quantity += 1;
      } else {
        _cart.add(CartItemModel(
          id: item.id,
          name: item.nameEn,
          price: item.price,
          quantity: 1,
        ));
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added ${item.nameEn} to order'),
        duration: const Duration(milliseconds: 900),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  double get _cartTotal => _cart.fold(0.0, (sum, item) => sum + item.subtotal);

  Future<void> _submitOrder() async {
    if (_cart.isEmpty) return;

    setState(() => _isLoading = true);
    final api = context.read<ApiService>();
    final sync = context.read<SyncProvider>();

    final auth = context.read<AuthProvider>();
    final branchId = auth.currentUser?.branchId ??
        _tables.firstWhere(
          (t) => t['id']?.toString() == _selectedTableId,
          orElse: () => {},
        )['branchId']?.toString();

    final orderPayload = {
      'branchId': branchId,
      'tableId': _selectedTableId,
      'orderType': 'DINE_IN',
      'items': _cart.map((c) => {
        'menuItemId': c.id,
        'quantity': c.quantity,
      }).toList(),
    };

    try {
      final res = await api.post('/restaurants/orders', body: orderPayload);

      if (!res.success) {
        // Enqueue offline action
        await sync.enqueueAction('CREATE_ORDER', orderPayload);
      }
    } catch (_) {
      await sync.enqueueAction('CREATE_ORDER', orderPayload);
    }

    setState(() {
      _cart.clear();
      _isLoading = false;
    });

    if (mounted) {
      Navigator.of(context).maybePop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Order submitted successfully! Sent to Kitchen Display.'),
          backgroundColor: AppColors.success,
        ),
      );
      _loadData();
    }
  }

  void _showCartSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final tableObj = _tables.firstWhere(
              (t) => t['id']?.toString() == _selectedTableId,
              orElse: () => {'tableNumber': 'Selected Table'},
            );
            final tableName = tableObj['tableNumber']?.toString() ?? tableObj['name']?.toString() ?? 'Table';

            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
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
                        Text(
                          'Order Ticket ($tableName)',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.text),
                        ),
                        Text(
                          '${_cart.length} items',
                          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ConstrainedBox(
                      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
                      child: _cart.isEmpty
                          ? const Center(
                              child: Text('Your cart is empty', style: TextStyle(color: AppColors.textMuted)),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              itemCount: _cart.length,
                              separatorBuilder: (_, __) => const Divider(color: AppColors.border, height: 16),
                              itemBuilder: (context, idx) {
                                final item = _cart[idx];
                                return Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.text)),
                                          Text(_currencyFormat.format(item.price), style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline, color: AppColors.textMuted, size: 20),
                                      onPressed: () {
                                        setSheetState(() {
                                          if (item.quantity > 1) {
                                            item.quantity--;
                                          } else {
                                            _cart.removeAt(idx);
                                          }
                                        });
                                        setState(() {});
                                      },
                                    ),
                                    Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.text)),
                                    IconButton(
                                      icon: const Icon(Icons.add_circle_outline, color: AppColors.primary, size: 20),
                                      onPressed: () {
                                        setSheetState(() {
                                          item.quantity++;
                                        });
                                        setState(() {});
                                      },
                                    ),
                                    const SizedBox(width: 8),
                                    Text(_currencyFormat.format(item.subtotal), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.text)),
                                  ],
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 16),
                    const Divider(color: AppColors.border),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.text)),
                        Text(_currencyFormat.format(_cartTotal), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.success)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _cart.isEmpty || _isLoading ? null : _submitOrder,
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                          : const Text('Send Order to Kitchen'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final categories = ['ALL', ..._menuItems.map((m) => m.category).toSet().toList()];

    final filteredMenu = _menuItems.where((m) {
      return _selectedCategory == 'ALL' || m.category == _selectedCategory;
    }).toList();

    return Column(
      children: [
        // Tab Segment
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: AppColors.surface,
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _tabIndex == 0 ? AppColors.primary : AppColors.surfaceLight,
                    foregroundColor: _tabIndex == 0 ? Colors.white : AppColors.textMuted,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: () => setState(() => _tabIndex = 0),
                  child: const Text('New Order (POS)'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _tabIndex == 1 ? AppColors.primary : AppColors.surfaceLight,
                    foregroundColor: _tabIndex == 1 ? Colors.white : AppColors.textMuted,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: () => setState(() => _tabIndex = 1),
                  child: Text('Active Orders (${_activeOrders.length})'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: AppColors.textMuted, size: 20),
                tooltip: 'Refresh Data',
                onPressed: _loadData,
              ),
            ],
          ),
        ),

        // Sub View
        Expanded(
          child: _tabIndex == 0
              ? _buildPosView(categories, filteredMenu)
              : _buildActiveOrdersView(),
        ),

        // Bottom Cart Bar
        if (_tabIndex == 0 && _cart.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border, width: 1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${_cart.fold(0, (sum, i) => sum + i.quantity)} Items in Order',
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                      Text(
                        _currencyFormat.format(_cartTotal),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.success),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _showCartSheet,
                  icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                  label: const Text('Review Order'),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildPosView(List<String> categories, List<MenuItemModel> filteredMenu) {
    return Column(
      children: [
        // Table Selector
        if (_tables.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.surface.withOpacity(0.5),
            child: Row(
              children: [
                const Icon(Icons.table_restaurant_outlined, size: 18, color: AppColors.textMuted),
                const SizedBox(width: 8),
                const Text('Table: ', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedTableId,
                      dropdownColor: AppColors.surface,
                      style: const TextStyle(color: AppColors.text, fontSize: 13, fontWeight: FontWeight.bold),
                      items: _tables.map((t) {
                        return DropdownMenuItem<String>(
                          value: t['id']?.toString(),
                          child: Text(t['tableNumber']?.toString() ?? t['name']?.toString() ?? 'Table'),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedTableId = val),
                    ),
                  ),
                ),
              ],
            ),
          ),

        // Category Pills
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: categories.map((cat) {
                final isSelected = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    selected: isSelected,
                    label: Text(cat, style: TextStyle(color: isSelected ? Colors.white : AppColors.textMuted, fontSize: 12)),
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.surfaceLight,
                    side: BorderSide(color: isSelected ? AppColors.primary : AppColors.border),
                    onSelected: (_) => setState(() => _selectedCategory = cat),
                  ),
                );
              }).toList(),
            ),
          ),
        ),

        // Menu Grid
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            color: AppColors.primary,
            child: filteredMenu.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 120),
                      Center(
                        child: Text('No menu items available', style: TextStyle(color: AppColors.textMuted)),
                      ),
                    ],
                  )
                : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 1.25,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: filteredMenu.length,
                  itemBuilder: (context, index) {
                    final item = filteredMenu[index];
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.nameEn,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.text, fontSize: 14),
                              ),
                              if (item.nameAm != null)
                                Text(
                                  item.nameAm!,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _currencyFormat.format(item.price),
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
                              ),
                              IconButton.filled(
                                icon: const Icon(Icons.add, size: 18),
                                style: IconButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  padding: const EdgeInsets.all(4),
                                  minimumSize: const Size(32, 32),
                                ),
                                onPressed: () => _addToCart(item),
                              ),
                            ],
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

  Widget _buildActiveOrdersView() {
    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.primary,
      child: _activeOrders.isEmpty
          ? const Center(
              child: Text('No active orders found', style: TextStyle(color: AppColors.textMuted)),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _activeOrders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, idx) {
                final order = _activeOrders[idx];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Order #${order.orderNumber}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.text),
                          ),
                          StatusBadge(status: order.status),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${order.tableName} • ${_currencyFormat.format(order.totalAmount)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 10),
                      const Divider(color: AppColors.border, height: 1),
                      const SizedBox(height: 10),
                      ...order.items.map((it) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            Text('${it.quantity}x ', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                            Expanded(child: Text(it.name, style: const TextStyle(color: AppColors.text, fontSize: 13))),
                            Text(_currencyFormat.format(it.price * it.quantity), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          ],
                        ),
                      )),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
