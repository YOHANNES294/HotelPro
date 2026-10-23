class UserModel {
  final String id;
  final String email;
  final String name;
  final String role;
  final String? organizationId;
  final String? organizationName;
  final String? branchId;

  const UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.organizationId,
    this.organizationName,
    this.branchId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? orgName}) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ?? json['fullName']?.toString() ?? 'Staff Member',
      role: (json['role']?.toString() ?? 'STAFF').toUpperCase(),
      organizationId: json['organizationId']?.toString(),
      organizationName: orgName ?? json['organization']?['name']?.toString() ?? json['organizationName']?.toString() ?? 'HotelPro',
      branchId: json['branchId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'organizationId': organizationId,
      'organizationName': organizationName,
      'branchId': branchId,
    };
  }

  bool get isKitchen => role == 'CHEF' || role == 'KITCHEN_STAFF';
  bool get isHousekeeping => role == 'HOUSEKEEPING';
  bool get isManager => role == 'ADMIN' || role == 'SUPERADMIN' || role == 'MANAGER';
  bool get isFrontDesk => role == 'FRONT_DESK' || role == 'RECEPTIONIST';
  bool get isWaiter => role == 'WAITER' || role == 'SERVER';
}
