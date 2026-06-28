// lib/api.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// .NET API adresi. Emülatör için: Android = 10.0.2.2, iOS/masaüstü = localhost.
const String kBaseUrl = 'http://localhost:5080/api/v1';

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => message;
}

class Api {
  static String? _token;

  static Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('lo_token');
  }

  static Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('lo_token', token);
  }

  static Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('lo_token');
  }

  static bool get hasToken => _token != null;

  static Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final uri = Uri.parse('$kBaseUrl$path');
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (auth && _token != null) headers['Authorization'] = 'Bearer $_token';

    late http.Response res;
    final encoded = body != null ? jsonEncode(body) : null;
    switch (method) {
      case 'POST':
        res = await http.post(uri, headers: headers, body: encoded);
        break;
      case 'PUT':
        res = await http.put(uri, headers: headers, body: encoded);
        break;
      default:
        res = await http.get(uri, headers: headers);
    }

    final data = res.body.isNotEmpty ? jsonDecode(res.body) : null;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = (data is Map && data['message'] != null)
          ? data['message'].toString()
          : 'Hata (${res.statusCode})';
      throw ApiException(res.statusCode, msg);
    }
    return data;
  }
}
