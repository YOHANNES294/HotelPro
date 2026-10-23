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

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    return MenuItemModel(
      id: json['id']?.toString() ?? '',
      nameEn: json['nameEn']?.toString() ?? json['name']?.toString() ?? 'Item',
      nameAm: json['nameAm']?.toString(),
      category: json['category'] is Map
          ? json['category']['name']?.toString() ?? 'Mains'
          : json['category']?.toString() ?? 'Mains',
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
    return OrderItemModel(
      id: json['id']?.toString() ?? '',
      name: itemInfo['nameEn']?.toString() ?? json['name']?.toString() ?? 'Item',
      quantity: json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
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
    final rawItems = json['items'] as List<dynamic>? ?? [];
    final itemsList = rawItems.map((i) => OrderItemModel.fromJson(i as Map<String, dynamic>)).toList();
    
    final tableInfo = json['table'];
    String tblName = 'Takeout / Bar';
    if (tableInfo is Map) {
      tblName = tableInfo['name']?.toString() ?? 'Table ${tableInfo['number'] ?? ''}';
    } else if (json['tableName'] != null) {
      tblName = json['tableName'].toString();
    }

    DateTime created;
    try {
      created = DateTime.parse(json['createdAt']?.toString() ?? DateTime.now().toIso8601String());
    } catch (_) {
      created = DateTime.now();
    }

    return OrderModel(
      id: json['id']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? json['id']?.toString().substring(0, 8) ?? 'ORD',
      tableId: json['tableId']?.toString(),
      tableName: tblName,
      status: (json['status']?.toString() ?? 'PENDING').toUpperCase(),
      totalAmount: (json['totalAmount'] is num)
          ? (json['totalAmount'] as num).toDouble()
          : double.tryParse(json['totalAmount']?.toString() ?? '0') ?? 0.0,
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
