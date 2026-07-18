import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Modal, Switch } from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'explore', 'watch_later', 'downloads'
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // End-user stats
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [newLessons, setNewLessons] = useState([]);
  const [exploreVideos, setExploreVideos] = useState([]);
  const [watchLaterList, setWatchLaterList] = useState([]);
  const [downloadsList, setDownloadsList] = useState([]);

  // Admin/Super-Admin stats
  const [statsData, setStatsData] = useState(null);
  const [platformAdmins, setPlatformAdmins] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [platformVideos, setPlatformVideos] = useState([]);

  // Modals state
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [showAddUser, setShowAddUser] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSuperAdminData();
    } else if (user?.role === 'admin') {
      loadAdminData();
    } else {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'user') {
      if (activeTab === 'explore') {
        loadExploreVideos();
      } else if (activeTab === 'watch_later') {
        loadWatchLater();
      } else if (activeTab === 'downloads') {
        loadDownloads();
      }
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.getUserDashboard('Dashboard');
      const data = Array.isArray(res) ? (res[0] || {}) : (res || {});
      
      setCategories(data.categories || []);
      setRecommended(data.recommended || []);
      setTrending(data.trending || []);
      setTopRated(data.top_rated || data.topRated || []);
      setNewLessons(data.new_lessons || data.newVideos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSuperAdminData = async () => {
    setLoading(true);
    try {
      const stats = await api.admin.fetchSuperAdminDashboard();
      setStatsData(stats || {});
      const admins = await api.admin.fetchAdmins();
      setPlatformAdmins(admins || []);
      const cats = await api.admin.fetchCategories();
      setCategories(cats || []);
      const vids = await api.admin.fetchVideos();
      setPlatformVideos(vids || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const stats = await api.admin.fetchAdminDashboard();
      setStatsData(stats || {});
      const users = await api.admin.fetchUsers();
      setAdminUsers(users || []);
      const vids = await api.admin.fetchVideos();
      setPlatformVideos(vids || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadExploreVideos = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.fetchExploreVideos();
      const list = Array.isArray(res) ? res : (res.json || res.videos || []);
      setExploreVideos(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchLater = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.fetchWatchLater();
      const list = Array.isArray(res) ? res : (res.json || res.watchLater || res.watchLaterVideos || []);
      setWatchLaterList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.fetchDownloadHistory();
      const list = Array.isArray(res) ? res : (res.json || res.downloads || res.download_history || []);
      setDownloadsList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = async (category) => {
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(category);
    setLoading(true);
    try {
      const res = await api.dashboard.fetchCategoryVideos(category.id);
      const list = Array.isArray(res) ? res : (res.json || res.videos || []);
      setExploreVideos(list);
      setActiveTab('explore');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategorySubmit = async () => {
    if (!catName) return;
    setLoading(true);
    try {
      await api.admin.createCategory(catName, catDesc);
      setCatName('');
      setCatDesc('');
      setShowAddCat(false);
      loadSuperAdminData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await api.admin.deleteCategory(id);
            loadSuperAdminData();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete category');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const handleAddUserSubmit = async () => {
    if (!formName || !formEmail || !formPassword) return;
    setLoading(true);
    try {
      if (isCreatingAdmin) {
        await api.admin.createAdmin(formName, formEmail, formMobile, formPassword);
      } else {
        await api.admin.createUser(formName, formEmail, formMobile, formPassword);
      }
      setFormName('');
      setFormEmail('');
      setFormMobile('');
      setFormPassword('');
      setShowAddUser(false);
      if (user?.role === 'super_admin') {
        loadSuperAdminData();
      } else {
        loadAdminData();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (item, isToggleAdmin) => {
    const nextStatus = item.status === 'active' ? 'disabled' : 'active';
    setLoading(true);
    try {
      if (isToggleAdmin) {
        await api.admin.updateAdmin(item.id, item.name, item.mobile, nextStatus);
        loadSuperAdminData();
      } else {
        await api.admin.updateUser(item.id, item.name, item.mobile, nextStatus);
        if (user?.role === 'super_admin') {
          loadSuperAdminData();
        } else {
          loadAdminData();
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const renderVideoCard = ({ item }) => {
    const title = item.title || item.videoTitle || 'Untitled Video';
    const rawThumb = item.thumbnail || item.thumbnailUrl || item.thumbnail_url || '';
    const thumbUrl = rawThumb.startsWith('http') 
      ? rawThumb 
      : `https://uat-02-admin-api.darpanx.com/webhook/uploads/${rawThumb.split('/').pop()}`;

    return (
      <TouchableOpacity 
        style={styles.videoCard} 
        onPress={() => navigation.navigate('/watch', item.id)}
      >
        <Image source={{ uri: thumbUrl }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.cardDetails}>
          <Text style={styles.videoTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.videoMeta}>{item.category_name || item.videoCategory || 'Lesson'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMetricsCard = (title, value) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );

  // ================= RENDER ROLES WIDGETS =================

  if (user?.role === 'super_admin') {
    const cards = statsData?.cards || {};
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Super Admin Control</Text>
          <TouchableOpacity onPress={() => navigation.navigate('/profile')}>
            <Text style={styles.profileToggle}>👤 Profile</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#E50914" style={{ flex: 1 }} size="large" />
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
            <Text style={styles.sectionTitle}>Platform Analytics Summary</Text>
            <View style={styles.metricsGrid}>
              {renderMetricsCard('Total Admins', cards.totalAdmins?.toString() || '0')}
              {renderMetricsCard('Total Users', cards.totalUsers?.toString() || '0')}
              {renderMetricsCard('Video Assets', cards.totalVideos?.toString() || '0')}
              {renderMetricsCard('Categories', cards.totalCategories?.toString() || '0')}
            </View>

            {/* Categories Management */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitleInline}>🏷️ Categories</Text>
              <TouchableOpacity onPress={() => setShowAddCat(true)}>
                <Text style={styles.addBtnText}>➕ Add Category</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardList}>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTextName}>{cat.name}</Text>
                    <Text style={styles.listTextSubtitle}>{cat.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Admins Management */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitleInline}>👥 Manage Admins</Text>
              <TouchableOpacity onPress={() => { setIsCreatingAdmin(true); setShowAddUser(true); }}>
                <Text style={styles.addBtnText}>➕ Add Admin</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardList}>
              {platformAdmins.map((admin) => (
                <View key={admin.id} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTextName}>{admin.name}</Text>
                    <Text style={styles.listTextSubtitle}>{admin.email}</Text>
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={[styles.statusText, admin.status === 'active' && { color: '#10B981' }]}>
                      {admin.status}
                    </Text>
                    <Switch
                      value={admin.status === 'active'}
                      onValueChange={() => toggleUserStatus(admin, true)}
                      trackColor={{ false: '#27272A', true: '#E50914' }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Add Category Modal */}
        <Modal visible={showAddCat} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Category Name"
                placeholderTextColor="#555"
                value={catName}
                onChangeText={setCatName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Description"
                placeholderTextColor="#555"
                value={catDesc}
                onChangeText={setCatDesc}
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowAddCat(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSubmit} onPress={handleAddCategorySubmit}>
                  <Text style={styles.btnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Admin/User Modal */}
        <Modal visible={showAddUser} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{isCreatingAdmin ? 'Add New Admin' : 'Add New End User'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Full Name"
                placeholderTextColor="#555"
                value={formName}
                onChangeText={setFormName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email Address"
                placeholderTextColor="#555"
                value={formEmail}
                onChangeText={setFormEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Mobile Number"
                placeholderTextColor="#555"
                value={formMobile}
                onChangeText={setFormMobile}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                placeholderTextColor="#555"
                value={formPassword}
                onChangeText={setFormPassword}
                secureTextEntry
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowAddUser(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSubmit} onPress={handleAddUserSubmit}>
                  <Text style={styles.btnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (user?.role === 'admin') {
    const cards = statsData?.cards || {};
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Control Dashboard</Text>
          <TouchableOpacity onPress={() => navigation.navigate('/profile')}>
            <Text style={styles.profileToggle}>👤 Profile</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#E50914" style={{ flex: 1 }} size="large" />
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
            <Text style={styles.sectionTitle}>My Analytics Summary</Text>
            <View style={styles.metricsGrid}>
              {renderMetricsCard('Assigned Users', cards.totalUsers?.toString() || '0')}
              {renderMetricsCard('Videos Uploaded', cards.totalVideos?.toString() || '0')}
              {renderMetricsCard('Total Video Views', cards.totalViews?.toString() || '0')}
              {renderMetricsCard('Active Users (7d)', cards.activeUsers?.toString() || '0')}
            </View>

            {/* My Assigned Users */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitleInline}>👥 My Assigned Users</Text>
              <TouchableOpacity onPress={() => { setIsCreatingAdmin(false); setShowAddUser(true); }}>
                <Text style={styles.addBtnText}>➕ Add User</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardList}>
              {adminUsers.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTextName}>{item.name}</Text>
                    <Text style={styles.listTextSubtitle}>{item.email}</Text>
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={[styles.statusText, item.status === 'active' && { color: '#10B981' }]}>
                      {item.status}
                    </Text>
                    <Switch
                      value={item.status === 'active'}
                      onValueChange={() => toggleUserStatus(item, false)}
                      trackColor={{ false: '#27272A', true: '#E50914' }}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Uploaded Videos List */}
            <Text style={styles.sectionTitle}>🎥 My Uploaded Videos</Text>
            <View style={styles.cardList}>
              {platformVideos.map((video) => {
                const rawThumb = video.thumbnail || video.thumbnailUrl || video.thumbnail_url || '';
                const thumbUrl = rawThumb.startsWith('http') 
                  ? rawThumb 
                  : `https://uat-02-admin-api.darpanx.com/webhook/uploads/${rawThumb.split('/').pop()}`;
                return (
                  <View key={video.id} style={styles.listItem}>
                    <Image source={{ uri: thumbUrl }} style={styles.smallThumb} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.listTextName} numberOfLines={1}>{video.title}</Text>
                      <Text style={styles.listTextSubtitle}>{video.category || 'Lesson'}</Text>
                    </View>
                    <Text style={styles.listViews}>{video.views || 0} views</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Add User Modal */}
        <Modal visible={showAddUser} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New End User</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Full Name"
                placeholderTextColor="#555"
                value={formName}
                onChangeText={setFormName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email Address"
                placeholderTextColor="#555"
                value={formEmail}
                onChangeText={setFormEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Mobile Number"
                placeholderTextColor="#555"
                value={formMobile}
                onChangeText={setFormMobile}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                placeholderTextColor="#555"
                value={formPassword}
                onChangeText={setFormPassword}
                secureTextEntry
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowAddUser(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSubmit} onPress={handleAddUserSubmit}>
                  <Text style={styles.btnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ================= END USER VIEW =================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VStream Learn</Text>
        <TouchableOpacity onPress={() => navigation.navigate('/profile')}>
          <Text style={styles.profileToggle}>👤 Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('dashboard.search')}
          placeholderTextColor="#71717A"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs Menu Navigation */}
      <View style={styles.tabContainer}>
        {['home', 'explore', 'watch_later', 'downloads'].map((tab) => {
          const isSelected = activeTab === tab;
          const label = tab === 'home' ? t('nav.home') : tab === 'explore' ? t('nav.explore') : tab === 'watch_later' ? t('nav.watchLater') : t('nav.downloads');
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#E50914" style={{ flex: 1 }} size="large" />
      ) : (
        <ScrollView style={styles.content}>
          {activeTab === 'home' && (
            <>
              {/* Categories */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('nav.categories')}</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={categories}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.categoriesList}
                renderItem={({ item }) => {
                  const isSelected = selectedCategory?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      onPress={() => handleCategoryPress(item)}
                    >
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Recommended Lessons */}
              {recommended.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recommended</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={recommended}
                    keyExtractor={(item) => item.id}
                    renderItem={renderVideoCard}
                    contentContainerStyle={styles.horizontalList}
                  />
                </>
              )}

              {/* Trending */}
              {trending.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Trending Now</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={trending}
                    keyExtractor={(item) => item.id}
                    renderItem={renderVideoCard}
                    contentContainerStyle={styles.horizontalList}
                  />
                </>
              )}

              {/* Top Rated */}
              {topRated.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Top Rated</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={topRated}
                    keyExtractor={(item) => item.id}
                    renderItem={renderVideoCard}
                    contentContainerStyle={styles.horizontalList}
                  />
                </>
              )}

              {/* New Lessons */}
              {newLessons.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>New Lessons</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={newLessons}
                    keyExtractor={(item) => item.id}
                    renderItem={renderVideoCard}
                    contentContainerStyle={styles.horizontalList}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'explore' && (
            <FlatList
              data={exploreVideos}
              keyExtractor={(item) => item.id}
              renderItem={renderVideoCard}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
              columnWrapperStyle={styles.gridRow}
            />
          )}

          {activeTab === 'watch_later' && (
            <FlatList
              data={watchLaterList}
              keyExtractor={(item) => item.id}
              renderItem={renderVideoCard}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
              columnWrapperStyle={styles.gridRow}
            />
          )}

          {activeTab === 'downloads' && (
            <FlatList
              data={downloadsList}
              keyExtractor={(item) => item.id}
              renderItem={renderVideoCard}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
              columnWrapperStyle={styles.gridRow}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#121217',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  profileToggle: {
    color: '#A0A0AB',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#121217',
  },
  tabBtnActive: {
    backgroundColor: '#E50914',
  },
  tabText: {
    color: '#A0A0AB',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleInline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  addBtnText: {
    color: '#E50914',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoriesList: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  categoryPill: {
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  categoryPillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  categoryPillText: {
    color: '#A0A0AB',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFF',
  },
  horizontalList: {
    paddingLeft: 16,
    paddingBottom: 16,
    gap: 16,
  },
  videoCard: {
    width: 200,
    backgroundColor: '#121217',
    borderRadius: 8,
    overflow: 'hidden',
    borderColor: '#27272A',
    borderWidth: 1,
  },
  thumbnail: {
    width: '100%',
    height: 110,
    backgroundColor: '#000',
  },
  cardDetails: {
    padding: 10,
  },
  videoTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  videoMeta: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 4,
  },
  gridContainer: {
    padding: 16,
    gap: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '47%',
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  metricLabel: {
    color: '#71717A',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardList: {
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#27272A',
  },
  listTextName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listTextSubtitle: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#71717A',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  smallThumb: {
    width: 60,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#000',
  },
  listViews: {
    color: '#71717A',
    fontSize: 12,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0A0A0C',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#27272A',
  },
  btnSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#E50914',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
