import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants.dart';
import '../models/user_model.dart';
import '../models/room_model.dart';
import '../models/order_model.dart';
import '../models/queued_action_model.dart';

class StorageService {
  static StorageService? _instance;
  late SharedPreferences _prefs;

  StorageService._();

  static Future<StorageService> getInstance() async {
    if (_instance == null) {
      _instance = StorageService._();
      _instance!._prefs = await SharedPreferences.getInstance();
    }
    return _instance!;
  }

  // --- Auth Token ---
  String? getAuthToken() {
    return _prefs.getString(AppConstants.keyAuthToken);
  }

  Future<bool> setAuthToken(String token) async {
    return _prefs.setString(AppConstants.keyAuthToken, token);
  }

  Future<bool> removeAuthToken() async {
    return _prefs.remove(AppConstants.keyAuthToken);
  }

  // --- User Data ---
  UserModel? getUser() {
    final raw = _prefs.getString(AppConstants.keyUserData);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return UserModel.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  Future<bool> setUser(UserModel user) async {
    return _prefs.setString(AppConstants.keyUserData, jsonEncode(user.toJson()));
  }

  Future<bool> removeUser() async {
    return _prefs.remove(AppConstants.keyUserData);
  }

  // --- API Base URL ---
  String getApiBaseUrl() {
    return _prefs.getString(AppConstants.keyApiUrl) ?? AppConstants.defaultApiUrl;
  }

  Future<bool> setApiBaseUrl(String url) async {
    return _prefs.setString(AppConstants.keyApiUrl, url.trim());
  }

  // --- Offline Queued Actions ---
  List<QueuedActionModel> getQueuedActions() {
    final raw = _prefs.getString(AppConstants.keyQueuedActions);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((item) => QueuedActionModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveQueuedActions(List<QueuedActionModel> actions) async {
    final list = actions.map((a) => a.toJson()).toList();
    return _prefs.setString(AppConstants.keyQueuedActions, jsonEncode(list));
  }

  // --- Cached Rooms ---
  List<RoomModel> getCachedRooms() {
    final raw = _prefs.getString(AppConstants.keyCachedRooms);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((item) => RoomModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveCachedRooms(List<RoomModel> rooms) async {
    final list = rooms.map((r) => r.toJson()).toList();
    return _prefs.setString(AppConstants.keyCachedRooms, jsonEncode(list));
  }

  // --- Cached Orders ---
  List<OrderModel> getCachedOrders() {
    final raw = _prefs.getString(AppConstants.keyCachedOrders);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((item) => OrderModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveCachedOrders(List<OrderModel> orders) async {
    final list = orders.map((o) => o.toJson()).toList();
    return _prefs.setString(AppConstants.keyCachedOrders, jsonEncode(list));
  }

  Future<void> clearAuth() async {
    await removeAuthToken();
    await removeUser();
  }
}
