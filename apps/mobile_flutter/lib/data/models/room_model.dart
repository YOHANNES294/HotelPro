class RoomModel {
  final String id;
  final String number;
  final String typeName;
  final int floor;
  final String status;
  final double pricePerNight;
  final int updatedAt;

  const RoomModel({
    required this.id,
    required this.number,
    required this.typeName,
    required this.floor,
    required this.status,
    required this.pricePerNight,
    required this.updatedAt,
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    return RoomModel(
      id: json['id']?.toString() ?? '',
      number: json['number']?.toString() ?? '',
      typeName: json['typeName']?.toString() ?? json['roomType']?['name']?.toString() ?? 'Standard',
      floor: json['floor'] is int ? json['floor'] : int.tryParse(json['floor']?.toString() ?? '1') ?? 1,
      status: (json['status']?.toString() ?? 'AVAILABLE').toUpperCase(),
      pricePerNight: (json['pricePerNight'] is num)
          ? (json['pricePerNight'] as num).toDouble()
          : double.tryParse(json['roomType']?['basePrice']?.toString() ?? '0') ?? 0.0,
      updatedAt: json['updatedAt'] is int ? json['updatedAt'] : DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'number': number,
      'typeName': typeName,
      'floor': floor,
      'status': status,
      'pricePerNight': pricePerNight,
      'updatedAt': updatedAt,
    };
  }

  RoomModel copyWith({String? status}) {
    return RoomModel(
      id: id,
      number: number,
      typeName: typeName,
      floor: floor,
      status: status ?? this.status,
      pricePerNight: pricePerNight,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );
  }
}
