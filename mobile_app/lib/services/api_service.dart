import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/video.dart';
import '../models/category.dart';
import '../models/watch_history.dart';

class ApiService extends ChangeNotifier {
  String _baseUrl = 'http://10.0.2.2:5000/api'; // Android Emulator default. Localhost is 127.0.0.1
  String? _accessToken;
  String? _refreshToken;
  User? _currentUser;
  bool _isLoading = false;

  ApiService() {
    _loadSettings();
  }

  String get baseUrl => _baseUrl;
  String? get accessToken => _accessToken;
  User? get currentUser => _currentUser;
  bool get isAuthenticated => _accessToken != null && _currentUser != null;
  bool get isLoading => _isLoading;

  set baseUrl(String url) {
    _baseUrl = url;
    _saveSettings();
    notifyListeners();
  }

  // Set loading state
  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  // Load saved credentials from Shared Preferences
  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('baseUrl') ?? 'http://10.0.2.2:5000/api';
    _accessToken = prefs.getString('accessToken');
    _refreshToken = prefs.getString('refreshToken');
    final userStr = prefs.getString('currentUser');
    if (userStr != null) {
      try {
        _currentUser = User.fromJson(jsonDecode(userStr));
      } catch (e) {
        _currentUser = null;
      }
    }
    notifyListeners();
  }

  // Save settings and credentials
  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('baseUrl', _baseUrl);
    if (_accessToken != null) {
      await prefs.setString('accessToken', _accessToken!);
    } else {
      await prefs.remove('accessToken');
    }
    if (_refreshToken != null) {
      await prefs.setString('refreshToken', _refreshToken!);
    } else {
      await prefs.remove('refreshToken');
    }
    if (_currentUser != null) {
      await prefs.setString('currentUser', jsonEncode(_currentUser!.toJson()));
    } else {
      await prefs.remove('currentUser');
    }
  }

  // Helper request builder with automated token refresh handling
  Future<http.Response> _request(String method, String endpoint, {Map<String, String>? headers, Object? body}) async {
    final uri = Uri.parse('$_baseUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    if (_accessToken != null) {
      requestHeaders['Authorization'] = 'Bearer $_accessToken';
    }

    http.Response response;
    
    if (method == 'GET') {
      response = await http.get(uri, headers: requestHeaders);
    } else if (method == 'POST') {
      response = await http.post(uri, headers: requestHeaders, body: jsonEncode(body));
    } else if (method == 'PUT') {
      response = await http.put(uri, headers: requestHeaders, body: jsonEncode(body));
    } else if (method == 'DELETE') {
      response = await http.delete(uri, headers: requestHeaders);
    } else {
      throw Exception('Unsupported HTTP method: $method');
    }

    // Attempt token refresh on 401 or 403
    if ((response.statusCode == 401 || response.statusCode == 403) && _refreshToken != null) {
      final refreshSuccess = await _refreshTokenRotation();
      if (refreshSuccess) {
        requestHeaders['Authorization'] = 'Bearer $_accessToken';
        if (method == 'GET') {
          response = await http.get(uri, headers: requestHeaders);
        } else if (method == 'POST') {
          response = await http.post(uri, headers: requestHeaders, body: jsonEncode(body));
        } else if (method == 'PUT') {
          response = await http.put(uri, headers: requestHeaders, body: jsonEncode(body));
        } else if (method == 'DELETE') {
          response = await http.delete(uri, headers: requestHeaders);
        }
      } else {
        await logout();
      }
    }

    return response;
  }

  // Refresh Token flow
  Future<bool> _refreshTokenRotation() async {
    if (_refreshToken == null) return false;
    try {
      final uri = Uri.parse('$_baseUrl/auth/refresh');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': _refreshToken}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        _accessToken = data['accessToken'];
        _refreshToken = data['refreshToken'];
        await _saveSettings();
        return true;
      }
    } catch (e) {
      print('Token rotation failed: $e');
    }
    return false;
  }

  // ================= AUTH API =================

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    try {
      final res = await _request('POST', '/auth/login', body: {
        'email': email,
        'password': password,
      });

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        _accessToken = data['accessToken'];
        _refreshToken = data['refreshToken'];
        _currentUser = User.fromJson(data['user']);
        await _saveSettings();
        _setLoading(false);
        return true;
      } else {
        final data = jsonDecode(res.body);
        throw Exception(data['message'] ?? 'Login failed');
      }
    } catch (e) {
      _setLoading(false);
      rethrow;
    }
  }

  Future<bool> signup(String name, String email, String mobile, String password) async {
    _setLoading(true);
    try {
      final res = await _request('POST', '/auth/signup', body: {
        'name': name,
        'email': email,
        'mobile': mobile,
        'password': password,
      });

      _setLoading(false);
      if (res.statusCode == 201) {
        return true;
      } else {
        final data = jsonDecode(res.body);
        throw Exception(data['message'] ?? 'Signup failed');
      }
    } catch (e) {
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> logout() async {
    _accessToken = null;
    _refreshToken = null;
    _currentUser = null;
    await _saveSettings();
    notifyListeners();
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    final res = await _request('POST', '/auth/change-password', body: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
    if (res.statusCode != 200) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Failed to change password');
    }
  }

  // ================= CATEGORIES API =================

  Future<List<Category>> fetchCategories() async {
    final res = await _request('GET', '/categories');
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((c) => Category.fromJson(c)).toList();
    }
    throw Exception('Failed to fetch categories');
  }

  Future<void> createCategory(String name, String description) async {
    final res = await _request('POST', '/categories', body: {
      'name': name,
      'description': description,
    });
    if (res.statusCode != 201) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Failed to create category');
    }
  }

  Future<void> deleteCategory(String id) async {
    final res = await _request('DELETE', '/categories/$id');
    if (res.statusCode != 200) {
      throw Exception('Failed to delete category');
    }
  }

  // ================= VIDEOS API =================

  Future<List<Video>> fetchVideos({String? search, String? category}) async {
    String query = '';
    final Map<String, String> params = {};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (category != null && category.isNotEmpty) params['category'] = category;

    if (params.isNotEmpty) {
      query = '?' + Uri(queryParameters: params).query;
    }

    final res = await _request('GET', '/videos$query');
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((v) => Video.fromJson(v)).toList();
    }
    throw Exception('Failed to fetch videos');
  }

  Future<Video> fetchVideoDetails(String id) async {
    final res = await _request('GET', '/videos/$id');
    if (res.statusCode == 200) {
      return Video.fromJson(jsonDecode(res.body));
    }
    throw Exception('Failed to fetch video details');
  }

  Future<void> trackProgress(String videoId, int position, int duration) async {
    await _request('POST', '/videos/track', body: {
      'videoId': videoId,
      'lastPosition': position,
      'duration': duration,
    });
  }

  Future<List<WatchHistory>> fetchWatchHistory() async {
    final res = await _request('GET', '/videos/history');
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((h) => WatchHistory.fromJson(h)).toList();
    }
    throw Exception('Failed to fetch watch history');
  }

  Future<List<Video>> fetchFavorites() async {
    final res = await _request('GET', '/videos/favorites');
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((v) => Video.fromJson(v)).toList();
    }
    throw Exception('Failed to fetch favorites');
  }

  Future<bool> toggleFavorite(String videoId) async {
    final res = await _request('POST', '/videos/$videoId/favorite');
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['isFavorite'] ?? false;
    }
    throw Exception('Failed to toggle favorite');
  }

  // ================= USERS/ADMINS MANAGEMENT =================

  Future<List<User>> fetchUsers() async {
    final res = await _request('GET', '/users');
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((u) => User.fromJson(u)).toList();
    }
    throw Exception('Failed to fetch users');
  }

  Future<void> createUser(String name, String email, String mobile, String password) async {
    final res = await _request('POST', '/users', body: {
      'name': name,
      'email': email,
      'mobile': mobile,
      'password': password,
    });
    if (res.statusCode != 201) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Failed to create user');
    }
  }

  Future<void> updateUser(String id, String name, String mobile, String status) async {
    final res = await _request('PUT', '/users/$id', body: {
      'name': name,
      'mobile': mobile,
      'status': status,
    });
    if (res.statusCode != 200) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Failed to update user');
    }
  }

  Future<List<User>> fetchAdmins() async {
    final res = await _request('GET', '/admins');
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((a) => User.fromJson(a)).toList();
    }
    throw Exception('Failed to fetch admins');
  }

  Future<void> createAdmin(String name, String email, String mobile, String password) async {
    final res = await _request('POST', '/admins', body: {
      'name': name,
      'email': email,
      'mobile': mobile,
      'password': password,
    });
    if (res.statusCode != 201) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Failed to create admin');
    }
  }

  Future<void> updateAdmin(String id, String name, String mobile, String status) async {
    final res = await _request('PUT', '/admins/$id', body: {
      'name': name,
      'mobile': mobile,
      'status': status,
    });
    if (res.statusCode != 200) {
      final data = jsonDecode(res.body);
      throw Exception(data['message'] ?? 'Failed to update admin');
    }
  }

  // ================= DASHBOARD API =================

  Future<Map<String, dynamic>> fetchSuperAdminDashboard() async {
    final res = await _request('GET', '/dashboard/super-admin');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Failed to fetch super admin dashboard');
  }

  Future<Map<String, dynamic>> fetchAdminDashboard() async {
    final res = await _request('GET', '/dashboard/admin');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Failed to fetch admin dashboard');
  }

  Future<Map<String, dynamic>> fetchUserDashboard() async {
    final res = await _request('GET', '/dashboard/user');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Failed to fetch user dashboard');
  }
}
