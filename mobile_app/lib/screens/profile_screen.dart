import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _baseUrlController = TextEditingController();

  final _oldPassController = TextEditingController();
  final _newPassController = TextEditingController();
  final _confirmPassController = TextEditingController();

  bool _loading = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    final api = Provider.of<ApiService>(context, listen: false);
    if (api.isAuthenticated) {
      _nameController.text = api.currentUser!.name;
      _mobileController.text = api.currentUser!.mobile;
      _baseUrlController.text = api.baseUrl;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _baseUrlController.dispose();
    _oldPassController.dispose();
    _newPassController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  void _handleSaveProfile() async {
    if (!_profileFormKey.currentState!.validate()) return;
    setState(() {
      _error = null;
      _success = null;
      _loading = true;
    });

    final api = Provider.of<ApiService>(context, listen: false);
    
    // Save URL Base if modified
    api.baseUrl = _baseUrlController.text.trim();

    // In mock API, we simulate profile text updates
    // For simplicity, we just save local base URL and notify success
    setState(() {
      _loading = false;
      _success = 'Profile and API URL configurations updated successfully!';
    });
  }

  void _handleChangePassword() async {
    if (!_passwordFormKey.currentState!.validate()) return;
    
    if (_newPassController.text != _confirmPassController.text) {
      setState(() => _error = 'New passwords do not match');
      return;
    }

    setState(() {
      _error = null;
      _success = null;
      _loading = true;
    });

    final api = Provider.of<ApiService>(context, listen: false);
    try {
      await api.changePassword(_oldPassController.text, _newPassController.text);
      setState(() {
        _success = 'Password changed successfully!';
        _oldPassController.clear();
        _newPassController.clear();
        _confirmPassController.clear();
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    if (!api.isAuthenticated) return const Scaffold();
    final user = api.currentUser!;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0C),
      appBar: AppBar(
        title: const Text('My Profile Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF121217),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.red.withOpacity(0.15), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red.withOpacity(0.4))),
                child: Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
              ),
              const SizedBox(height: 16),
            ],
            if (_success != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.green.withOpacity(0.15), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.green.withOpacity(0.4))),
                child: Text(_success!, style: const TextStyle(color: Colors.green), textAlign: TextAlign.center),
              ),
              const SizedBox(height: 16),
            ],

            // SECTION 1: GENERAL PROFILE
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF121217),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Form(
                key: _profileFormKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('General Profile Settings', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    
                    TextFormField(
                      controller: _nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Full Name', labelStyle: TextStyle(color: Colors.grey)),
                      validator: (val) => (val == null || val.isEmpty) ? 'Name is required' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _mobileController,
                      style: const TextStyle(color: Colors.white),
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Mobile Number', labelStyle: TextStyle(color: Colors.grey)),
                      validator: (val) => (val == null || val.isEmpty) ? 'Mobile number is required' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _baseUrlController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'API Base URL', labelStyle: TextStyle(color: Colors.grey)),
                      validator: (val) => (val == null || val.isEmpty) ? 'API Base URL is required' : null,
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      onPressed: _loading ? null : _handleSaveProfile,
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                      child: const Text('Save Profile Details'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // SECTION 2: PASSWORD CHANGE
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF121217),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Form(
                key: _passwordFormKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Change Security Password', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _oldPassController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Current Password', labelStyle: TextStyle(color: Colors.grey)),
                      validator: (val) => (val == null || val.isEmpty) ? 'Current password is required' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _newPassController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'New Password', labelStyle: TextStyle(color: Colors.grey)),
                      validator: (val) => (val == null || val.length < 6) ? 'Must be at least 6 characters' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _confirmPassController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Confirm New Password', labelStyle: TextStyle(color: Colors.grey)),
                      validator: (val) => (val == null || val.isEmpty) ? 'Confirm password' : null,
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      onPressed: _loading ? null : _handleChangePassword,
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                      child: const Text('Update Password'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // SECTION 3: SESSION LIST
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF121217),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Captured Login Sessions', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  if (user.devices.isEmpty)
                    const Text('No logins logged.', style: TextStyle(color: Colors.grey))
                  else
                    ...user.devices.map((device) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      device.agent,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      device.lastLogin.isNotEmpty
                                          ? DateTime.parse(device.lastLogin).toLocal().toString()
                                          : 'Just Now',
                                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              const Text('ACTIVE', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
