class User {
  final String id;
  final String name;
  final String email;
  final String mobile;
  final String role;
  final String avatar;
  final String status;
  final List<DeviceSession> devices;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.mobile,
    required this.role,
    required this.avatar,
    required this.status,
    this.devices = const [],
  });

  factory User.fromJson(Map<String, dynamic> json) {
    var deviceList = json['devices'] as List?;
    List<DeviceSession> parsedDevices = deviceList != null
        ? deviceList.map((d) => DeviceSession.fromJson(d)).toList()
        : [];

    return User(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      mobile: json['mobile'] ?? '',
      role: json['role'] ?? 'user',
      avatar: json['avatar'] ?? '',
      status: json['status'] ?? 'active',
      devices: parsedDevices,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'mobile': mobile,
      'role': role,
      'avatar': avatar,
      'status': status,
      'devices': devices.map((d) => d.toJson()).toList(),
    };
  }
}

class DeviceSession {
  final String agent;
  final String lastLogin;

  DeviceSession({required this.agent, required this.lastLogin});

  factory DeviceSession.fromJson(Map<String, dynamic> json) {
    return DeviceSession(
      agent: json['agent'] ?? 'Unknown Device',
      lastLogin: json['lastLogin'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'agent': agent,
      'lastLogin': lastLogin,
    };
  }
}
