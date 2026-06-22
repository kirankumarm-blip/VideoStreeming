import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/user.dart';
import '../models/video.dart';
import '../models/category.dart';
import '../models/watch_history.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentUserTab = 0; // 0 = Home, 1 = Search, 2 = Favorites
  String _searchQuery = '';
  String _selectedCategory = '';
  
  // Lists for Admin/Super Admin
  List<User> _adminUsers = [];
  List<User> _platformAdmins = [];
  List<Category> _platformCategories = [];
  List<Video> _platformVideos = [];
  Map<String, dynamic>? _dashboardStats;
  bool _localLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRoleSpecificData();
    });
  }

  void _loadRoleSpecificData() async {
    final api = Provider.of<ApiService>(context, listen: false);
    if (!api.isAuthenticated) return;

    setState(() => _localLoading = true);
    try {
      if (api.currentUser!.role == 'super_admin') {
        _dashboardStats = await api.fetchSuperAdminDashboard();
        _platformAdmins = await api.fetchAdmins();
        _platformCategories = await api.fetchCategories();
        _platformVideos = await api.fetchVideos();
      } else if (api.currentUser!.role == 'admin') {
        _dashboardStats = await api.fetchAdminDashboard();
        _adminUsers = await api.fetchUsers();
        _platformVideos = await api.fetchVideos();
      } else {
        // End User: Data will be fetched via FutureBuilders/State updates
        _platformCategories = await api.fetchCategories();
      }
    } catch (e) {
      print('Error loading role stats: $e');
    } finally {
      if (mounted) setState(() => _localLoading = false);
    }
  }

  // --- Category Create Dialog ---
  void _showAddCategoryDialog() {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1B1B22),
        title: const Text('Add New Category', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Category Name',
                labelStyle: TextStyle(color: Colors.grey),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Description',
                labelStyle: TextStyle(color: Colors.grey),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isEmpty) return;
              final api = Provider.of<ApiService>(context, listen: false);
              try {
                await api.createCategory(nameController.text.trim(), descController.text.trim());
                Navigator.pop(context);
                _loadRoleSpecificData();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  // --- Admin/User Create Dialog ---
  void _showAddUserDialog({required bool isAdminCreation}) {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final mobileController = TextEditingController();
    final passController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1B1B22),
        title: Text(isAdminCreation ? 'Add New Admin' : 'Add New End User', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Full Name', labelStyle: TextStyle(color: Colors.grey)),
              ),
              TextField(
                controller: emailController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Email Address', labelStyle: TextStyle(color: Colors.grey)),
              ),
              TextField(
                controller: mobileController,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Mobile Number', labelStyle: TextStyle(color: Colors.grey)),
              ),
              TextField(
                controller: passController,
                style: const TextStyle(color: Colors.white),
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password', labelStyle: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isEmpty || emailController.text.isEmpty || passController.text.isEmpty) return;
              final api = Provider.of<ApiService>(context, listen: false);
              try {
                if (isAdminCreation) {
                  await api.createAdmin(
                    nameController.text.trim(),
                    emailController.text.trim(),
                    mobileController.text.trim(),
                    passController.text,
                  );
                } else {
                  await api.createUser(
                    nameController.text.trim(),
                    emailController.text.trim(),
                    mobileController.text.trim(),
                    passController.text,
                  );
                }
                Navigator.pop(context);
                _loadRoleSpecificData();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  // Toggle user/admin active status
  void _toggleUserStatus(User user, bool isAdminRole) async {
    final api = Provider.of<ApiService>(context, listen: false);
    final nextStatus = user.status == 'active' ? 'disabled' : 'active';
    try {
      if (isAdminRole) {
        await api.updateAdmin(user.id, user.name, user.mobile, nextStatus);
      } else {
        await api.updateUser(user.id, user.name, user.mobile, nextStatus);
      }
      _loadRoleSpecificData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
    }
  }

  // --- BUILD METRICS CARDS (Admins/Super Admins) ---
  Widget _buildMetricsCard(String title, String value) {
    return Card(
      color: const Color(0xFF121217),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.white.withOpacity(0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, fontFamily: 'Space Grotesk'),
            ),
          ],
        ),
      ),
    );
  }

  // ================= ROLE WIDGETS =================

  Widget _buildSuperAdminView(ApiService api) {
    if (_localLoading || _dashboardStats == null) {
      return const Center(child: CircularProgressIndicator(color: Colors.red));
    }
    
    final cards = _dashboardStats!['cards'] as Map;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Platform Analytics Summary', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.6,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: [
              _buildMetricsCard('Total Admins', cards['totalAdmins']?.toString() ?? '0'),
              _buildMetricsCard('Total Users', cards['totalUsers']?.toString() ?? '0'),
              _buildMetricsCard('Video Assets', cards['totalVideos']?.toString() ?? '0'),
              _buildMetricsCard('Categories', cards['totalCategories']?.toString() ?? '0'),
            ],
          ),
          const SizedBox(height: 32),

          // Categories CRUD header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('🏷️ Categories', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(icon: const Icon(Icons.add_circle, color: Colors.red), onPressed: _showAddCategoryDialog),
            ],
          ),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _platformCategories.length,
            itemBuilder: (context, index) {
              final cat = _platformCategories[index];
              return ListTile(
                title: Text(cat.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                subtitle: Text(cat.description, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                trailing: IconButton(
                  icon: const Icon(Icons.delete, color: Colors.grey),
                  onPressed: () async {
                    if (await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: const Color(0xFF1B1B22),
                            title: const Text('Delete Category', style: TextStyle(color: Colors.white)),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                              ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes')),
                            ],
                          ),
                        ) ?? false) {
                      await api.deleteCategory(cat.id);
                      _loadRoleSpecificData();
                    }
                  },
                ),
              );
            },
          ),
          const SizedBox(height: 32),

          // Admin listing with Enable/Disable toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('👥 Manage Admins', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(icon: const Icon(Icons.person_add, color: Colors.red), onPressed: () => _showAddUserDialog(isAdminCreation: true)),
            ],
          ),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _platformAdmins.length,
            itemBuilder: (context, index) {
              final admin = _platformAdmins[index];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.purple,
                  child: Text(admin.name.substring(0, 1).toUpperCase()),
                ),
                title: Text(admin.name, style: const TextStyle(color: Colors.white)),
                subtitle: Text(admin.email, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                trailing: Switch(
                  value: admin.status == 'active',
                  activeColor: Colors.red,
                  onChanged: (val) => _toggleUserStatus(admin, true),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAdminView(ApiService api) {
    if (_localLoading || _dashboardStats == null) {
      return const Center(child: CircularProgressIndicator(color: Colors.red));
    }

    final cards = _dashboardStats!['cards'] as Map;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My Analytics Summary', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.6,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: [
              _buildMetricsCard('Assigned Users', cards['totalUsers']?.toString() ?? '0'),
              _buildMetricsCard('Videos Uploaded', cards['totalVideos']?.toString() ?? '0'),
              _buildMetricsCard('Total Video Views', cards['totalViews']?.toString() ?? '0'),
              _buildMetricsCard('Active Users (7d)', cards['activeUsers']?.toString() ?? '0'),
            ],
          ),
          const SizedBox(height: 32),

          // User list
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('👥 My Assigned Users', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(icon: const Icon(Icons.person_add, color: Colors.red), onPressed: () => _showAddUserDialog(isAdminCreation: false)),
            ],
          ),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _adminUsers.length,
            itemBuilder: (context, index) {
              final user = _adminUsers[index];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.blue,
                  child: Text(user.name.substring(0, 1).toUpperCase()),
                ),
                title: Text(user.name, style: const TextStyle(color: Colors.white)),
                subtitle: Text(user.email, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                trailing: Switch(
                  value: user.status == 'active',
                  activeColor: Colors.red,
                  onChanged: (val) => _toggleUserStatus(user, false),
                ),
              );
            },
          ),
          const SizedBox(height: 32),

          // Content list
          const Text('🎥 My Uploaded Videos', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _platformVideos.length,
            itemBuilder: (context, index) {
              final video = _platformVideos[index];
              return ListTile(
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    video.thumbnail.startsWith('http') ? video.thumbnail : '${api.baseUrl.replaceAll('/api', '')}${video.thumbnail}',
                    width: 72,
                    height: 40,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey, width: 72, height: 40),
                  ),
                ),
                title: Text(video.title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                subtitle: Text(video.category, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                trailing: Text('${video.views} views', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              );
            },
          ),
        ],
      ),
    );
  }

  // --- End User View (Netflix Style Rows) ---
  Widget _buildEndUserView(ApiService api) {
    return FutureBuilder<Map<String, dynamic>>(
      future: api.fetchUserDashboard(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.red));
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error loading dashboard: ${snapshot.error}', style: const TextStyle(color: Colors.red)));
        }

        final data = snapshot.data!;
        
        // Map lists
        final continueList = (data['continueWatching'] as List).map((v) => Video.fromJson(v)).toList();
        final recList = (data['recommended'] as List).map((v) => Video.fromJson(v)).toList();
        final favList = (data['favorites'] as List).map((v) => Video.fromJson(v)).toList();
        final newList = (data['newVideos'] as List).map((v) => Video.fromJson(v)).toList();
        final historyList = (data['recentlyWatched'] as List).map((v) => Video.fromJson(v)).toList();

        // Load progress details map if any
        final continueRaw = data['continueWatching'] as List;

        if (_currentUserTab == 1) {
          // SEARCH TAB
          return _buildUserSearchTab(api);
        }

        if (_currentUserTab == 2) {
          // FAVORITES TAB
          return _buildUserFavoritesTab(api, favList);
        }

        // HOME TAB
        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Input Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: TextField(
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Search title, tags, category...',
                    hintStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF121217),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                  ),
                  onSubmitted: (val) {
                    setState(() {
                      _searchQuery = val;
                      _currentUserTab = 1;
                    });
                  },
                ),
              ),
              const SizedBox(height: 24),

              // Category filters
              SizedBox(
                height: 36,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _platformCategories.length + 1,
                  itemBuilder: (context, index) {
                    final isAll = index == 0;
                    final catName = isAll ? 'All Topics' : _platformCategories[index - 1].name;
                    final isSelected = isAll ? _selectedCategory.isEmpty : _selectedCategory == catName;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ActionChip(
                        backgroundColor: isSelected ? Colors.red : const Color(0xFF1B1B22),
                        label: Text(catName, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          setState(() {
                            _selectedCategory = isAll ? '' : catName;
                            if (!isAll) {
                              _currentUserTab = 1; // Direct to search results
                            }
                          });
                        },
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),

              // Horizontal Video rows
              _buildVideoRow(api, '🎬 Continue Watching', continueRaw, isContinueWatching: true),
              _buildVideoRow(api, '🔥 Recommended for You', recList),
              _buildVideoRow(api, '⭐ My Favorites', favList),
              _buildVideoRow(api, '🆕 New Lessons', newList),
              _buildVideoRow(api, '⌛ Recently Watched', historyList),
            ],
          ),
        );
      },
    );
  }

  // Horizontal Scrolling List Container
  Widget _buildVideoRow(ApiService api, String title, List list, {bool isContinueWatching = false}) {
    if (list.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 16.0, bottom: 12.0),
          child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        ),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: list.length,
            itemBuilder: (context, index) {
              final item = list[index];
              // Extract video and progress
              final Video video = isContinueWatching ? Video.fromJson(item) : item as Video;
              final progressPct = isContinueWatching ? (item['progress']?['completionPercentage'] ?? 0) : 0;

              final thumbUrl = video.thumbnail.startsWith('http') 
                ? video.thumbnail 
                : '${api.baseUrl.replaceAll('/api', '')}${video.thumbnail}';

              return GestureDetector(
                onTap: () {
                  Navigator.pushNamed(context, '/watch', arguments: video.id).then((_) => setState(() {}));
                },
                child: Container(
                  width: 200,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Video Card Image
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              thumbUrl,
                              width: 200,
                              height: 110,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey, width: 200, height: 110),
                            ),
                          ),
                          if (isContinueWatching)
                            Positioned(
                              bottom: 0,
                              left: 0,
                              right: 0,
                              child: Container(
                                height: 4,
                                color: Colors.grey.withOpacity(0.3),
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: Container(
                                    height: 4,
                                    width: (200 * (progressPct / 100)).toDouble(),
                                    color: Colors.red,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Video text info
                      Text(video.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      Text('${video.category} • ${video.views} views', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  // --- End User Search Tab ---
  Widget _buildUserSearchTab(ApiService api) {
    return FutureBuilder<List<Video>>(
      future: api.fetchVideos(search: _searchQuery, category: _selectedCategory),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.red));
        }
        
        final list = snapshot.data ?? [];

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Search title, tags, category...',
                        hintStyle: const TextStyle(color: Colors.grey),
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.clear, color: Colors.grey),
                          onPressed: () {
                            setState(() {
                              _searchQuery = '';
                              _selectedCategory = '';
                              _currentUserTab = 0; // Back to home
                            });
                          },
                        ),
                        filled: true,
                        fillColor: const Color(0xFF121217),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                      ),
                      onSubmitted: (val) {
                        setState(() => _searchQuery = val);
                      },
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: list.isEmpty
                  ? const Center(child: Text('No videos match your filter search', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      itemCount: list.length,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemBuilder: (context, index) {
                        final video = list[index];
                        final thumbUrl = video.thumbnail.startsWith('http') 
                          ? video.thumbnail 
                          : '${api.baseUrl.replaceAll('/api', '')}${video.thumbnail}';
                          
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(vertical: 8),
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Image.network(
                              thumbUrl,
                              width: 100,
                              height: 60,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey, width: 100, height: 60),
                            ),
                          ),
                          title: Text(video.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Text('${video.category} • ${video.views} views', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                          onTap: () {
                            Navigator.pushNamed(context, '/watch', arguments: video.id).then((_) => setState(() {}));
                          },
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  // --- End User Favorites Tab ---
  Widget _buildUserFavoritesTab(ApiService api, List<Video> list) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text('★ My Favorites Bookmarks', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        Expanded(
          child: list.isEmpty
              ? const Center(child: Text('No bookmarks saved yet.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  itemCount: list.length,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemBuilder: (context, index) {
                    final video = list[index];
                    final thumbUrl = video.thumbnail.startsWith('http') 
                      ? video.thumbnail 
                      : '${api.baseUrl.replaceAll('/api', '')}${video.thumbnail}';

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.network(
                          thumbUrl,
                          width: 100,
                          height: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey, width: 100, height: 60),
                        ),
                      ),
                      title: Text(video.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text('${video.category} • ${video.views} views', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      trailing: IconButton(
                        icon: const Icon(Icons.star, color: Colors.amber),
                        onPressed: () async {
                          await api.toggleFavorite(video.id);
                          setState(() {}); // refresh
                        },
                      ),
                      onTap: () {
                        Navigator.pushNamed(context, '/watch', arguments: video.id).then((_) => setState(() {}));
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    if (!api.isAuthenticated) return const Scaffold();

    final user = api.currentUser!;
    Widget body = const SizedBox.shrink();

    if (user.role == 'super_admin') body = _buildSuperAdminView(api);
    else if (user.role == 'admin') body = _buildAdminView(api);
    else body = _buildEndUserView(api);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0C),
      appBar: AppBar(
        title: Text(
          user.role == 'super_admin' 
              ? 'Super Admin Dashboard' 
              : user.role == 'admin' ? 'Admin Control' : 'VPLAY Learn',
          style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Space Grotesk'),
        ),
        backgroundColor: const Color(0xFF121217),
        elevation: 0,
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF121217),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF1B1B22)),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.red,
                child: Text(user.name.substring(0,1).toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
              ),
              accountName: Text(user.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              accountEmail: Text(user.email, style: const TextStyle(color: Colors.grey)),
            ),
            ListTile(
              leading: const Icon(Icons.person, color: Colors.white),
              title: const Text('My Profile Settings', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context); // close drawer
                Navigator.pushNamed(context, '/profile').then((_) => _loadRoleSpecificData());
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout Session', style: TextStyle(color: Colors.red)),
              onTap: () async {
                await api.logout();
                if (mounted) Navigator.pushReplacementNamed(context, '/login');
              },
            ),
          ],
        ),
      ),
      body: body,
      bottomNavigationBar: user.role == 'user'
          ? BottomNavigationBar(
              backgroundColor: const Color(0xFF121217),
              selectedItemColor: Colors.red,
              unselectedItemColor: Colors.grey,
              currentIndex: _currentUserTab,
              onTap: (index) {
                setState(() {
                  _currentUserTab = index;
                });
              },
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
                BottomNavigationBarItem(icon: Icon(Icons.star), label: 'Favorites'),
              ],
            )
          : null,
    );
  }
}
