import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'HotelPro';
  static const String appTagline = 'Mobile Operations Terminal';
  
  static String get defaultApiUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:4000';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:4000';
    }
    return 'http://127.0.0.1:4000';
  }

  // Storage keys
  static const String keyAuthToken = 'hotelpro_auth_token';
  static const String keyUserData = 'hotelpro_user_data';
  static const String keyApiUrl = 'hotelpro_api_url';
  static const String keyQueuedActions = 'hotelpro_queued_actions';
  static const String keyCachedRooms = 'hotelpro_cached_rooms';
  static const String keyCachedOrders = 'hotelpro_cached_orders';
}
