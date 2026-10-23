import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'storage_service.dart';

class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? error;
  final int? statusCode;

  const ApiResponse({
    required this.success,
    this.data,
    this.error,
    this.statusCode,
  });

  factory ApiResponse.success(T data, {int statusCode = 200}) {
    return ApiResponse(
      success: true,
      data: data,
      statusCode: statusCode,
    );
  }

  factory ApiResponse.failure(String error, {int? statusCode}) {
    return ApiResponse(
      success: false,
      error: error,
      statusCode: statusCode,
    );
  }
}

class ApiService {
  final StorageService _storage;
  final http.Client _client;

  ApiService(this._storage, [http.Client? client]) : _client = client ?? http.Client();

  String _buildUrl(String endpoint) {
    String base = _storage.getApiBaseUrl().trim();
    if (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }

    String path = endpoint.trim();
    if (!path.startsWith('/')) {
      path = '/$path';
    }

    if (!path.startsWith('/api/v1') && !path.startsWith('/health')) {
      path = '/api/v1$path';
    }

    return '$base$path';
  }

  Map<String, String> _buildHeaders([Map<String, String>? extra]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = _storage.getAuthToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    if (extra != null) {
      headers.addAll(extra);
    }

    return headers;
  }

  Future<ApiResponse<dynamic>> get(
    String endpoint, {
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    try {
      final uri = Uri.parse(_buildUrl(endpoint));
      final response = await _client
          .get(uri, headers: _buildHeaders(headers))
          .timeout(timeout);

      return _handleResponse(response);
    } on SocketException catch (_) {
      return ApiResponse.failure('Cannot reach server. Please check connection.', statusCode: 503);
    } on TimeoutException catch (_) {
      return ApiResponse.failure('Request timed out. Please try again.', statusCode: 408);
    } catch (e) {
      return ApiResponse.failure('Network error: ${e.toString()}');
    }
  }

  Future<ApiResponse<dynamic>> post(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    try {
      final uri = Uri.parse(_buildUrl(endpoint));
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout);

      return _handleResponse(response);
    } on SocketException catch (_) {
      return ApiResponse.failure('Cannot reach server. Please check connection.', statusCode: 503);
    } on TimeoutException catch (_) {
      return ApiResponse.failure('Request timed out. Please try again.', statusCode: 408);
    } catch (e) {
      return ApiResponse.failure('Network error: ${e.toString()}');
    }
  }

  Future<ApiResponse<dynamic>> patch(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    try {
      final uri = Uri.parse(_buildUrl(endpoint));
      final response = await _client
          .patch(
            uri,
            headers: _buildHeaders(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout);

      return _handleResponse(response);
    } on SocketException catch (_) {
      return ApiResponse.failure('Cannot reach server. Please check connection.', statusCode: 503);
    } on TimeoutException catch (_) {
      return ApiResponse.failure('Request timed out. Please try again.', statusCode: 408);
    } catch (e) {
      return ApiResponse.failure('Network error: ${e.toString()}');
    }
  }

  ApiResponse<dynamic> _handleResponse(http.Response response) {
    dynamic bodyData;
    try {
      if (response.body.isNotEmpty) {
        bodyData = jsonDecode(response.body);
      }
    } catch (_) {
      bodyData = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      // If server wraps data in { data: ... }
      if (bodyData is Map<String, dynamic> && bodyData.containsKey('data')) {
        return ApiResponse.success(bodyData['data'], statusCode: response.statusCode);
      }
      return ApiResponse.success(bodyData, statusCode: response.statusCode);
    }

    String errorMsg = 'Request failed (${response.statusCode})';
    if (bodyData is Map<String, dynamic>) {
      errorMsg = bodyData['message']?.toString() ??
          bodyData['error']?.toString() ??
          errorMsg;
    }

    return ApiResponse.failure(errorMsg, statusCode: response.statusCode);
  }
}
