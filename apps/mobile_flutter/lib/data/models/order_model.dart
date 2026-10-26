class MenuItemModel {
  final String id;
  final String nameEn;
  final String? nameAm;
  final String category;
  final double price;

  const MenuItemModel({
    required this.id,
    required this.nameEn,
    this.nameAm,
    required this.category,
    required this.price,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json, {String? categoryName}) {
    return MenuItemModel(
      id: json['id']?.toString() ?? '',
      nameEn: json['name']?.toString() ?? json['nameEn']?.toString() ?? 'Item',
      nameAm: json['nameAmharic']?.toString() ?? json['nameAm']?.toString(),
      category: categoryName ?? (json['category'] is Map
          ? json['category']['name']?.toString() ?? 'Mains'
          : json['category']?.toString() ?? 'Mains'),
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class CartItemModel {
  final String id;
  final String name;
  final double price;
  int quantity;

  CartItemModel({
    required this.id,
    required this.name,
    required this.price,
    this.quantity = 1,
  });

  double get subtotal => price * quantity;
}

class OrderItemModel {
  final String id;
  final String name;
  final int quantity;
  final double price;
  final String? notes;

  const OrderItemModel({
    required this.id,
    required this.name,
    required this.quantity,
    required this.price,
    this.notes,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    final itemInfo = json['menuItem'] ?? json['item'] ?? {};
    final unitPrice = json['unitPrice'] ?? json['price'];
    return OrderItemModel(
      id: json['id']?.toString() ?? '',
      name: json['itemName']?.toString() ?? itemInfo['name']?.toString() ?? itemInfo['nameEn']?.toString() ?? json['name']?.toString() ?? 'Item',
      quantity: json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      price: (unitPrice is num)
          ? (unitPrice as num).toDouble()
          : double.tryParse(unitPrice?.toString() ?? '0') ?? 0.0,
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'quantity': quantity,
      'price': price,
      'notes': notes,
    };
  }
}

class OrderModel {
  final String id;
  final String orderNumber;
  final String? tableId;
  final String tableName;
  final String status;
  final double totalAmount;
  final List<OrderItemModel> items;
  final DateTime createdAt;

  const OrderModel({
    required this.id,
    required this.orderNumber,
    this.tableId,
    required this.tableName,
    required this.status,
    required this.totalAmount,
    required this.items,
    required this.createdAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    // If ticket wraps order
    final effectiveOrder = (json['order'] is Map<String, dynamic>)
        ? json['order'] as Map<String, dynamic>
        : json;

    final rawItems = (effectiveOrder['items'] ?? json['items']) as List<dynamic>? ?? [];
    final itemsList = rawItems.map((i) => OrderItemModel.fromJson(i as Map<String, dynamic>)).toList();

    final tableInfo = effectiveOrder['table'] ?? json['table'];
    String tblName = 'Takeout / Bar';
    if (tableInfo is Map) {
      tblName = tableInfo['tableNumber']?.toString() ?? tableInfo['name']?.toString() ?? 'Table ${tableInfo['number'] ?? ''}';
    } else if (effectiveOrder['tableName'] != null) {
      tblName = effectiveOrder['tableName'].toString();
    } else if (json['tableName'] != null) {
      tblName = json['tableName'].toString();
    }

    DateTime created;
    try {
      created = DateTime.parse((json['createdAt'] ?? effectiveOrder['createdAt'])?.toString() ?? DateTime.now().toIso8601String());
    } catch (_) {
      created = DateTime.now();
    }

    final totalRaw = effectiveOrder['totalAmount'] ?? json['totalAmount'];

    return OrderModel(
      id: (json['orderId'] ?? effectiveOrder['id'] ?? json['id'])?.toString() ?? '',
      orderNumber: (json['orderNumber'] ?? effectiveOrder['orderNumber'])?.toString() ?? (json['id']?.toString().substring(0, 8)) ?? 'ORD',
      tableId: (effectiveOrder['tableId'] ?? json['tableId'])?.toString(),
      tableName: tblName,
      status: (json['status'] ?? effectiveOrder['status'])?.toString().toUpperCase() ?? 'PENDING',
      totalAmount: (totalRaw is num)
          ? (totalRaw as num).toDouble()
          : double.tryParse(totalRaw?.toString() ?? '0') ?? 0.0,
      items: itemsList,
      createdAt: created,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'tableId': tableId,
      'tableName': tableName,
      'status': status,
      'totalAmount': totalAmount,
      'items': items.map((i) => i.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  OrderModel copyWith({String? status}) {
    return OrderModel(
      id: id,
      orderNumber: orderNumber,
      tableId: tableId,
      tableName: tableName,
      status: status ?? this.status,
      totalAmount: totalAmount,
      items: items,
      createdAt: createdAt,
    );
  }
}
