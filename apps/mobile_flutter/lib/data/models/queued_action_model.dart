class QueuedActionModel {
  final String id;
  final String type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int retryCount;
  final String status;
  final String? lastError;

  const QueuedActionModel({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
    this.status = 'PENDING',
    this.lastError,
  });

  factory QueuedActionModel.fromJson(Map<String, dynamic> json) {
    return QueuedActionModel(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      payload: (json['payload'] is Map<String, dynamic>)
          ? json['payload'] as Map<String, dynamic>
          : {},
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      retryCount: json['retryCount'] is int ? json['retryCount'] : 0,
      status: json['status']?.toString() ?? 'PENDING',
      lastError: json['lastError']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'payload': payload,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
      'status': status,
      'lastError': lastError,
    };
  }

  QueuedActionModel copyWith({
    String? status,
    int? retryCount,
    String? lastError,
  }) {
    return QueuedActionModel(
      id: id,
      type: type,
      payload: payload,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
      status: status ?? this.status,
      lastError: lastError ?? this.lastError,
    );
  }
}
