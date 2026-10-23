import 'package:flutter/foundation.dart';
import '../data/models/user_model.dart';
import '../data/services/api_service.dart';
import '../data/services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService;
  final StorageService _storageService;

  UserModel? _currentUser;
  bool _isLoading = true;
  String? _errorMessage;

  AuthProvider(this._apiService, this._storageService) {
    _restoreSession();
  }

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null && _storageService.getAuthToken() != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> _restoreSession() async {
    _isLoading = true;
    notifyListeners();

    final token = _storageService.getAuthToken();
    final savedUser = _storageService.getUser();

    if (token != null && savedUser != null) {
      _currentUser = savedUser;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiService.post('/auth/login', body: {
        'email': email.trim(),
        'password': password,
      });

      if (!res.success || res.data == null) {
        _errorMessage = res.error ?? 'Authentication failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final data = res.data;
      String? token;
      if (data is Map<String, dynamic>) {
        token = data['token']?.toString() ?? data['tokens']?['accessToken']?.toString();
      }

      if (token == null || token.isEmpty) {
        _errorMessage = 'Invalid response: missing authentication token';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Extract user
      Map<String, dynamic> userJson = {};
      String? orgName;
      if (data is Map<String, dynamic>) {
        if (data['user'] is Map<String, dynamic>) {
          userJson = data['user'] as Map<String, dynamic>;
        }
        if (data['organization'] is Map<String, dynamic>) {
          orgName = data['organization']['name']?.toString();
        }
      }

      final user = UserModel.fromJson(userJson, orgName: orgName);

      // Save to storage
      await _storageService.setAuthToken(token);
      await _storageService.setUser(user);

      _currentUser = user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Login error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _currentUser = null;
    await _storageService.clearAuth();
    notifyListeners();
  }
}
