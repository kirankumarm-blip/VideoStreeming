const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'super-secret-video-streaming-platform-jwt-token-key-2026';
const JWT_REFRESH_SECRET = 'super-secret-refresh-token-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[API] Response: ${res.statusCode}`);
    return originalSend.apply(this, arguments);
  };
  next();
});

// Create public directories if they don't exist
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Configure multer for video and thumbnail uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Helper: Read and write JSON database
const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database", err);
    return { users: [], categories: [], videos: [], watchHistory: [], favorites: [], notifications: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing database", err);
  }
}

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: "Authentication token required" });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    
    // Check if user exists and is active
    const db = readDB();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(403).json({ message: "User not found" });
    if (user.status === 'disabled') return res.status(403).json({ message: "Account is disabled" });
    
    req.user = user;
    next();
  });
}

// Middleware: Check User Roles
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized access for this role" });
    }
    next();
  };
}

// Add notifications helper
function addNotification(userId, title, message) {
  const db = readDB();
  const newNotif = {
    id: 'n-' + Date.now() + Math.floor(Math.random() * 100),
    userId,
    title,
    message,
    date: new Date().toISOString(),
    read: false
  };
  db.notifications.push(newNotif);
  writeDB(db);
}

// ================= AUTH ROUTES =================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ message: "Your account has been disabled" });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Track device login
  const deviceAgent = req.headers['user-agent'] || 'Unknown Device';
  if (!user.devices) user.devices = [];
  const existingDeviceIdx = user.devices.findIndex(d => d.agent === deviceAgent);
  if (existingDeviceIdx !== -1) {
    user.devices[existingDeviceIdx].lastLogin = new Date().toISOString();
  } else {
    user.devices.push({ agent: deviceAgent, lastLogin: new Date().toISOString() });
  }
  writeDB(db);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      avatar: user.avatar
    }
  });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, mobile, password } = req.body;
  
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const db = readDB();
  const duplicate = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (duplicate) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: 'u-' + Date.now(),
    name,
    email,
    mobile,
    password: hashedPassword,
    role: 'user',
    status: 'active',
    avatar: '',
    createdBy: 'self',
    devices: []
  };

  db.users.push(newUser);
  writeDB(db);
  
  addNotification(newUser.id, "Account Created", `Welcome to Video Streaming Platform, ${name}!`);

  res.status(201).json({ message: "User registered successfully" });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "Refresh token is required" });

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired refresh token" });
    
    const db = readDB();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user || user.status === 'disabled') return res.status(403).json({ message: "User not authorized" });

    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    const newRefreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({ accessToken, refreshToken: newRefreshToken });
  });
});

app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: "Both old and new passwords are required" });

  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  const validPassword = bcrypt.compareSync(oldPassword, user.password);
  if (!validPassword) return res.status(400).json({ message: "Incorrect old password" });

  user.password = bcrypt.hashSync(newPassword, 10);
  writeDB(db);

  addNotification(user.id, "Password Changed", "Your password was successfully updated.");

  res.json({ message: "Password updated successfully" });
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    mobile: req.user.mobile,
    role: req.user.role,
    avatar: req.user.avatar,
    devices: req.user.devices || []
  });
});

app.put('/api/auth/profile', authenticateToken, upload.single('avatar'), (req, res) => {
  const { name, mobile } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  if (name) user.name = name;
  if (mobile) user.mobile = mobile;
  if (req.file) {
    user.avatar = `/uploads/${req.file.filename}`;
  }

  writeDB(db);
  res.json({
    message: "Profile updated successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      avatar: user.avatar
    }
  });
});

// ================= CATEGORIES MODULE =================

app.get('/api/categories', (req, res) => {
  const db = readDB();
  res.json(db.categories);
});

app.post('/api/categories', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: "Category name is required" });

  const db = readDB();
  const id = 'cat-' + name.toLowerCase().replace(/\s+/g, '-');
  
  if (db.categories.some(c => c.id === id)) {
    return res.status(400).json({ message: "Category already exists" });
  }

  const newCategory = { id, name, description: description || '' };
  db.categories.push(newCategory);
  writeDB(db);

  // Notify all users about category update
  db.users.filter(u => u.role === 'user').forEach(u => {
    addNotification(u.id, "Category Updated", `A new learning path "${name}" is now available.`);
  });

  res.status(201).json(newCategory);
});

app.put('/api/categories/:id', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, description } = req.body;
  const db = readDB();
  const category = db.categories.find(c => c.id === req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });

  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  writeDB(db);

  res.json(category);
});

app.delete('/api/categories/:id', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const db = readDB();
  const originalLength = db.categories.length;
  db.categories = db.categories.filter(c => c.id !== req.params.id);
  
  if (db.categories.length === originalLength) {
    return res.status(404).json({ message: "Category not found" });
  }
  
  writeDB(db);
  res.json({ message: "Category deleted successfully" });
});

// ================= USER MANAGEMENT =================

app.get('/api/users', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
  const db = readDB();
  let users = db.users.filter(u => u.role === 'user');
  
  if (req.user.role === 'admin') {
    users = users.filter(u => u.createdBy === req.user.id);
  }
  
  // Strip password field
  res.json(users.map(({ password, ...u }) => u));
});

app.post('/api/users', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
  const { name, email, mobile, password } = req.body;
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  const newUser = {
    id: 'u-' + Date.now(),
    name,
    email,
    mobile,
    password: bcrypt.hashSync(password, 10),
    role: 'user',
    status: 'active',
    avatar: '',
    createdBy: req.user.id,
    devices: []
  };

  db.users.push(newUser);
  writeDB(db);

  addNotification(newUser.id, "Account Created", `Your account was created by ${req.user.name}. Welcome!`);

  const { password: _, ...userWithoutPass } = newUser;
  res.status(201).json(userWithoutPass);
});

app.put('/api/users/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
  const { name, mobile, password, status } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id && u.role === 'user');
  
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.user.role === 'admin' && user.createdBy !== req.user.id) {
    return res.status(403).json({ message: "You can only manage your own users" });
  }

  if (name) user.name = name;
  if (mobile) user.mobile = mobile;
  if (status) user.status = status;
  if (password) user.password = bcrypt.hashSync(password, 10);

  writeDB(db);
  const { password: _, ...userWithoutPass } = user;
  res.json(userWithoutPass);
});

// Admin management (Super Admin Only)
app.get('/api/admins', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const db = readDB();
  const admins = db.users.filter(u => u.role === 'admin');
  res.json(admins.map(({ password, ...u }) => u));
});

app.post('/api/admins', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, email, mobile, password } = req.body;
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  const newAdmin = {
    id: 'u-' + Date.now(),
    name,
    email,
    mobile,
    password: bcrypt.hashSync(password, 10),
    role: 'admin',
    status: 'active',
    avatar: '',
    createdBy: 'super_admin',
    devices: []
  };

  db.users.push(newAdmin);
  writeDB(db);

  const { password: _, ...adminWithoutPass } = newAdmin;
  res.status(201).json(adminWithoutPass);
});

app.put('/api/admins/:id', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, mobile, password, status } = req.body;
  const db = readDB();
  const admin = db.users.find(u => u.id === req.params.id && u.role === 'admin');
  
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  if (name) admin.name = name;
  if (mobile) admin.mobile = mobile;
  if (status) admin.status = status;
  if (password) admin.password = bcrypt.hashSync(password, 10);

  writeDB(db);
  const { password: _, ...adminWithoutPass } = admin;
  res.json(adminWithoutPass);
});

// ================= VIDEO MANAGEMENT =================

app.get('/api/videos', authenticateToken, (req, res) => {
  const db = readDB();
  const { search, category, status } = req.query;
  let list = db.videos;

  // Role Scoping
  if (req.user.role === 'admin') {
    list = list.filter(v => v.uploadedBy === req.user.id);
  } else if (req.user.role === 'user') {
    // End users see public videos assigned to their admin, or check assignment
    const adminId = req.user.createdBy;
    list = list.filter(v => v.visibility === 'public' && 
      (adminId === 'self' || adminId === 'super_admin' || adminId === 'u-superadmin' || (v.assignedAdmins || []).includes(adminId))
    );
  }

  // Filters
  if (search) {
    const query = search.toLowerCase();
    list = list.filter(v => 
      v.title.toLowerCase().includes(query) || 
      v.description.toLowerCase().includes(query) ||
      (v.tags && v.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  if (category) {
    list = list.filter(v => v.category.toLowerCase() === category.toLowerCase());
  }

  res.json(list);
});



app.post('/api/videos/upload', authenticateToken, authorizeRoles('super_admin', 'admin'), upload.fields([{ name: 'video' }, { name: 'thumbnail' }]), (req, res) => {
  const { title, description, category, tags, visibility, assignedAdmins } = req.body;
  if (!title || !category) return res.status(400).json({ message: "Title and Category are required" });

  let videoUrl = '/videos/sample1.mp4'; // Fallback
  if (req.files && req.files['video'] && req.files['video'][0]) {
    videoUrl = `/uploads/${req.files['video'][0].filename}`;
  }

  let thumbnail = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800'; // Default placeholder
  if (req.files && req.files['thumbnail'] && req.files['thumbnail'][0]) {
    thumbnail = `/uploads/${req.files['thumbnail'][0].filename}`;
  }

  const db = readDB();
  const videoTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];
  
  // Parse assigned admins
  let parsedAdmins = [];
  if (req.user.role === 'super_admin') {
    parsedAdmins = assignedAdmins ? (Array.isArray(assignedAdmins) ? assignedAdmins : JSON.parse(assignedAdmins)) : [];
  } else {
    // If admin is uploading, it's auto-assigned to them
    parsedAdmins = [req.user.id];
  }

  const newVideo = {
    id: 'v-' + Date.now(),
    title,
    description: description || '',
    category,
    thumbnail,
    videoUrl,
    tags: videoTags,
    visibility: visibility || 'public',
    uploadedBy: req.user.id,
    assignedAdmins: parsedAdmins,
    views: 0,
    duration: 300 // default mock duration in seconds
  };

  db.videos.push(newVideo);
  writeDB(db);

  // Notify target users
  db.users.filter(u => u.role === 'user' && parsedAdmins.includes(u.createdBy)).forEach(u => {
    addNotification(u.id, "New Video Added", `"${title}" has been uploaded in ${category}. Watch it now!`);
  });

  res.status(201).json(newVideo);
});

app.put('/api/videos/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
  const { title, description, category, tags, visibility, assignedAdmins } = req.body;
  const db = readDB();
  const video = db.videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ message: "Video not found" });

  if (req.user.role === 'admin' && video.uploadedBy !== req.user.id) {
    return res.status(403).json({ message: "You can only edit your own videos" });
  }

  if (title) video.title = title;
  if (description !== undefined) video.description = description;
  if (category) video.category = category;
  if (tags) video.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
  if (visibility) video.visibility = visibility;
  if (req.user.role === 'super_admin' && assignedAdmins) {
    video.assignedAdmins = Array.isArray(assignedAdmins) ? assignedAdmins : JSON.parse(assignedAdmins);
  }

  writeDB(db);
  res.json(video);
});

app.delete('/api/videos/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
  const db = readDB();
  const video = db.videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ message: "Video not found" });

  if (req.user.role === 'admin' && video.uploadedBy !== req.user.id) {
    return res.status(403).json({ message: "You can only delete your own videos" });
  }

  db.videos = db.videos.filter(v => v.id !== req.params.id);
  writeDB(db);

  res.json({ message: "Video deleted successfully" });
});

app.post('/api/videos/assign', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { videoId, assignedAdmins } = req.body;
  if (!videoId || !assignedAdmins) return res.status(400).json({ message: "VideoId and assignedAdmins are required" });

  const db = readDB();
  const video = db.videos.find(v => v.id === videoId);
  if (!video) return res.status(404).json({ message: "Video not found" });

  video.assignedAdmins = Array.isArray(assignedAdmins) ? assignedAdmins : [assignedAdmins];
  writeDB(db);

  res.json({ message: "Video assigned successfully", video });
});

// ================= USER TRACKING & HISTORY =================

app.post('/api/videos/track', authenticateToken, authorizeRoles('user'), (req, res) => {
  const { videoId, lastPosition, duration, isNewSession, watchTime, pausedCount, forwardedCount, backwardCount } = req.body;
  if (!videoId || lastPosition === undefined) return res.status(400).json({ message: "VideoId and lastPosition are required" });

  const db = readDB();
  const video = db.videos.find(v => v.id === videoId);
  if (!video) return res.status(404).json({ message: "Video not found" });

  const videoDuration = duration || video.duration || 300;
  const watchPercentage = Math.min(100, Math.round((lastPosition / videoDuration) * 100));
  
  let status = 'unwatched';
  if (watchPercentage >= 95) status = 'completed';
  else if (watchPercentage > 5) status = 'partially_watched';
  else status = 'watched'; // Started watching

  let historyItem = db.watchHistory.find(h => h.userId === req.user.id && h.videoId === videoId);

  if (historyItem) {
    historyItem.watchDate = new Date().toISOString();
    historyItem.lastPosition = lastPosition;
    historyItem.completionPercentage = watchPercentage;
    historyItem.status = status;
    
    // Increment views if new session
    if (isNewSession) {
      historyItem.views = (historyItem.views || 1) + 1;
    }
    
    // Update counters
    historyItem.pausedCount = pausedCount !== undefined ? pausedCount : (historyItem.pausedCount || 0);
    historyItem.forwardedCount = forwardedCount !== undefined ? forwardedCount : (historyItem.forwardedCount || 0);
    historyItem.backwardCount = backwardCount !== undefined ? backwardCount : (historyItem.backwardCount || 0);
    
    // Accumulate actual watch time seconds
    if (watchTime !== undefined) {
      historyItem.watchTime = (historyItem.watchTime || 0) + watchTime;
    }
  } else {
    historyItem = {
      id: 'h-' + Date.now(),
      userId: req.user.id,
      videoId,
      watchDate: new Date().toISOString(),
      watchTime: watchTime || lastPosition || 0,
      lastPosition,
      completionPercentage: watchPercentage,
      status,
      views: 1,
      pausedCount: pausedCount || 0,
      forwardedCount: forwardedCount || 0,
      backwardCount: backwardCount || 0
    };
    db.watchHistory.push(historyItem);
    // Increment views
    video.views = (video.views || 0) + 1;
  }

  writeDB(db);
  res.json(historyItem);
});

app.get('/api/videos/history', authenticateToken, (req, res) => {
  const db = readDB();
  const userId = req.user.id;
  
  const history = db.watchHistory
    .filter(h => h.userId === userId)
    .map(h => {
      const video = db.videos.find(v => v.id === h.videoId);
      return { ...h, video };
    })
    .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate));

  res.json(history);
});

app.post('/api/videos/:id/favorite', authenticateToken, (req, res) => {
  const db = readDB();
  const videoId = req.params.id;
  const userId = req.user.id;

  const existingIdx = db.favorites.findIndex(f => f.userId === userId && f.videoId === videoId);
  let isFavorite = false;

  if (existingIdx !== -1) {
    db.favorites.splice(existingIdx, 1);
  } else {
    db.favorites.push({ userId, videoId });
    isFavorite = true;
  }

  writeDB(db);
  res.json({ isFavorite });
});

app.get('/api/videos/favorites', authenticateToken, (req, res) => {
  const db = readDB();
  const userId = req.user.id;
  
  const userFavorites = db.favorites.filter(f => f.userId === userId);
  const favoriteVideos = userFavorites.map(f => db.videos.find(v => v.id === f.videoId)).filter(Boolean);

  res.json(favoriteVideos);
});

app.get('/api/videos/:id', authenticateToken, (req, res) => {
  const db = readDB();
  const video = db.videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ message: "Video not found" });

  // Access control check
  if (req.user.role === 'admin' && video.uploadedBy !== req.user.id && !(video.assignedAdmins || []).includes(req.user.id)) {
    return res.status(403).json({ message: "Unauthorized access to this video" });
  } else if (req.user.role === 'user') {
    const adminId = req.user.createdBy;
    if (adminId !== 'self' && adminId !== 'super_admin' && adminId !== 'u-superadmin') {
      if (!(video.assignedAdmins || []).includes(adminId)) {
        return res.status(403).json({ message: "This video is not assigned to you" });
      }
    }
  }

  res.json(video);
});

// ================= DASHBOARDS & ANALYTICS =================

app.get('/api/dashboard/super-admin', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const db = readDB();
  
  const totalAdmins = db.users.filter(u => u.role === 'admin').length;
  const totalUsers = db.users.filter(u => u.role === 'user').length;
  const totalVideos = db.videos.length;
  const totalCategories = db.categories.length;
  
  // Watch history count today
  const todayStr = new Date().toISOString().split('T')[0];
  const videosWatchedToday = db.watchHistory.filter(h => h.watchDate.startsWith(todayStr)).length;
  const activeUsers = new Set(db.watchHistory.map(h => h.userId)).size;

  // Chart: Category Wise Views
  const categoryViews = db.categories.map(cat => {
    const vids = db.videos.filter(v => v.category === cat.name);
    const views = vids.reduce((sum, v) => sum + (v.views || 0), 0);
    return { name: cat.name, count: views };
  });

  // Chart: Daily Watch Statistics (last 7 days)
  const dailyWatchStats = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = db.watchHistory.filter(h => h.watchDate.startsWith(dateStr)).length;
    
    // Label as Mon, Tue, etc.
    const label = date.toLocaleDateString('en-US', { weekday: 'short' });
    dailyWatchStats.push({ label, count });
  }

  // Chart: Admin Wise Usage (Videos Uploaded by Admin)
  const adminUsage = db.users.filter(u => u.role === 'admin').map(admin => {
    const videoCount = db.videos.filter(v => v.uploadedBy === admin.id).length;
    return { name: admin.name, count: videoCount };
  });

  // Chart: User Growth
  const userGrowth = [
    { label: "Mar", count: Math.round(totalUsers * 0.4) },
    { label: "Apr", count: Math.round(totalUsers * 0.6) },
    { label: "May", count: Math.round(totalUsers * 0.9) },
    { label: "Jun", count: totalUsers }
  ];

  // Recent activity panel
  const recentActivities = db.watchHistory.slice(-5).map(h => {
    const user = db.users.find(u => u.id === h.userId);
    const video = db.videos.find(v => v.id === h.videoId);
    return {
      id: h.id,
      user: user ? user.name : 'Unknown User',
      video: video ? video.title : 'Deleted Video',
      action: h.status === 'completed' ? 'finished watching' : 'started watching',
      time: h.watchDate
    };
  }).reverse();

  const storageMetrics = {
    totalStorageUsedBytes: 912680550400, // ~850 GB
    awsS3BucketSize: 730144448512, // ~680 GB
    localStorageUsed: 182536101888, // ~170 GB
    bandwidthUsedToday: 48318382080, // ~45 GB
    s3ObjectsCount: 1420
  };

  const systemHealth = {
    cpuUsage: 14,
    memoryUsage: "4.1 GB / 8.0 GB",
    apiLatency: "38ms",
    serverStatus: "Healthy"
  };

  const encodingQueue = [
    { id: "job-1", videoTitle: "Getting Started with Flutter", resolution: "1080p", progress: 85, status: "processing" },
    { id: "job-2", videoTitle: "Advanced Redux Tutorial", resolution: "720p", progress: 30, status: "processing" },
    { id: "job-3", videoTitle: "Kannada Literature Lesson 1", resolution: "1080p", progress: 0, status: "pending" },
    { id: "job-4", videoTitle: "Hindi Grammer Basics", resolution: "480p", progress: 100, status: "completed" }
  ];

  const watchHistoryDetails = db.watchHistory.map(h => {
    const user = db.users.find(u => u.id === h.userId);
    const video = db.videos.find(v => v.id === h.videoId);
    return {
      id: h.id,
      userName: user ? user.name : 'Unknown User',
      userEmail: user ? user.email : 'Unknown Email',
      videoTitle: video ? video.title : 'Deleted Video',
      videoCategory: video ? video.category : 'N/A',
      views: h.views || 1,
      completed: h.status === 'completed' ? 'Yes' : 'No',
      completionPercentage: h.completionPercentage || 0,
      watchTime: h.watchTime || h.lastPosition || 0,
      pausedCount: h.pausedCount || 0,
      forwardedCount: h.forwardedCount || 0,
      backwardCount: h.backwardCount || 0,
      lastPosition: h.lastPosition || 0,
      watchDate: h.watchDate
    };
  });

  res.json({
    cards: { totalAdmins, totalUsers, totalVideos, totalCategories, videosWatchedToday, activeUsers },
    charts: { dailyWatchStats, categoryViews, userGrowth, adminUsage },
    recentActivities,
    storageMetrics,
    systemHealth,
    encodingQueue,
    watchHistoryDetails
  });
});

app.get('/api/dashboard/admin', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const db = readDB();
  const adminId = req.user.id;

  const myUsers = db.users.filter(u => u.role === 'user' && u.createdBy === adminId);
  const myVideos = db.videos.filter(v => v.uploadedBy === adminId);
  const myVideoIds = myVideos.map(v => v.id);

  const totalUsers = myUsers.length;
  const totalVideos = myVideos.length;
  const totalViews = myVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  
  // Active users under this admin (watched any video in past 7 days)
  const myWatchHistories = db.watchHistory.filter(h => myVideoIds.includes(h.videoId));
  const activeUsers = new Set(myWatchHistories.map(h => h.userId)).size;

  // Chart: Most Viewed Videos
  const mostViewedVideos = [...myVideos]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map(v => ({ name: v.title, count: v.views || 0 }));

  // Chart: Category Distribution
  const categoryDistribution = db.categories.map(cat => {
    const count = myVideos.filter(v => v.category === cat.name).length;
    return { name: cat.name, count };
  }).filter(c => c.count > 0);

  // Chart: User Engagement (completion rate)
  const completedCount = myWatchHistories.filter(h => h.status === 'completed').length;
  const partialCount = myWatchHistories.filter(h => h.status === 'partially_watched').length;
  const userEngagement = [
    { label: 'Completed', count: completedCount },
    { label: 'Partial', count: partialCount },
    { label: 'Started', count: Math.max(0, myWatchHistories.length - completedCount - partialCount) }
  ];

  const storageMetrics = {
    totalStorageUsedBytes: 214748364800, // ~200 GB
    localStorageUsed: 214748364800,
    bandwidthUsedToday: 12884901888, // ~12 GB
  };

  const systemHealth = {
    cpuUsage: 8,
    memoryUsage: "2.4 GB / 8.0 GB",
    apiLatency: "24ms",
    serverStatus: "Healthy"
  };

  const encodingQueue = [
    { id: "job-1", videoTitle: "Getting Started with Flutter", resolution: "1080p", progress: 85, status: "processing" }
  ];

  const watchHistoryDetails = myWatchHistories.map(h => {
    const user = db.users.find(u => u.id === h.userId);
    const video = db.videos.find(v => v.id === h.videoId);
    return {
      id: h.id,
      userName: user ? user.name : 'Unknown User',
      userEmail: user ? user.email : 'Unknown Email',
      videoTitle: video ? video.title : 'Deleted Video',
      videoCategory: video ? video.category : 'N/A',
      views: h.views || 1,
      completed: h.status === 'completed' ? 'Yes' : 'No',
      completionPercentage: h.completionPercentage || 0,
      watchTime: h.watchTime || h.lastPosition || 0,
      pausedCount: h.pausedCount || 0,
      forwardedCount: h.forwardedCount || 0,
      backwardCount: h.backwardCount || 0,
      lastPosition: h.lastPosition || 0,
      watchDate: h.watchDate
    };
  });

  res.json({
    cards: { totalUsers, totalVideos, totalViews, activeUsers },
    charts: { mostViewedVideos, categoryDistribution, userEngagement },
    storageMetrics,
    systemHealth,
    encodingQueue,
    watchHistoryDetails
  });
});

app.get('/api/dashboard/user', authenticateToken, authorizeRoles('user'), (req, res) => {
  const db = readDB();
  const userId = req.user.id;
  const adminId = req.user.createdBy;

  // Videos assigned to user's admin
  const assignedVideos = db.videos.filter(v => v.visibility === 'public' && 
    (adminId === 'self' || adminId === 'super_admin' || adminId === 'u-superadmin' || (v.assignedAdmins || []).includes(adminId))
  );

  // Category list
  const categories = db.categories.map(cat => {
    const count = assignedVideos.filter(v => v.category === cat.name).length;
    return { ...cat, videoCount: count };
  }).filter(c => c.videoCount > 0);

  // Continue Watching
  const continueWatching = db.watchHistory
    .filter(h => h.userId === userId && h.status === 'partially_watched')
    .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
    .map(h => {
      const video = assignedVideos.find(v => v.id === h.videoId);
      return video ? { ...video, progress: h } : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  // Recently Watched
  const recentlyWatched = db.watchHistory
    .filter(h => h.userId === userId)
    .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
    .map(h => assignedVideos.find(v => v.id === h.videoId))
    .filter(Boolean)
    .slice(0, 5);

  // Favorites
  const userFavs = db.favorites.filter(f => f.userId === userId).map(f => f.videoId);
  const favorites = assignedVideos.filter(v => userFavs.includes(v.id));

  // New Videos (uploaded in last 30 days, not watched yet)
  const watchedVideoIds = db.watchHistory.filter(h => h.userId === userId).map(h => h.videoId);
  const newVideos = assignedVideos
    .filter(v => !watchedVideoIds.includes(v.id))
    .slice(0, 8);

  // Recommended (uncompleted first, then completed, sorted by views descending)
  const recommended = [...assignedVideos]
    .sort((a, b) => {
      const histA = db.watchHistory.find(h => h.userId === userId && h.videoId === a.id);
      const histB = db.watchHistory.find(h => h.userId === userId && h.videoId === b.id);
      const compA = histA && histA.status === 'completed' ? 1 : 0;
      const compB = histB && histB.status === 'completed' ? 1 : 0;
      
      if (compA !== compB) {
        return compA - compB; // uncompleted (0) before completed (1)
      }
      return (b.views || 0) - (a.views || 0); // sort by views descending
    })
    .slice(0, 8);

  // Trending (top views platform-wide)
  const trending = [...assignedVideos]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 8);

  // Top Rated
  const topRated = [...assignedVideos]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 8);

  // Because You Watched Contextual Recommendation
  const lastHistory = db.watchHistory
    .filter(h => h.userId === userId)
    .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))[0];
  let becauseYouWatched = null;
  if (lastHistory) {
    const lastVideo = db.videos.find(v => v.id === lastHistory.videoId);
    if (lastVideo) {
      const matchVideos = assignedVideos.filter(v => v.category === lastVideo.category && v.id !== lastVideo.id);
      becauseYouWatched = {
        category: lastVideo.category,
        videos: matchVideos.slice(0, 6)
      };
    }
  }

  // User Watch Analytics
  const userHistory = db.watchHistory.filter(h => h.userId === userId);
  const catCounts = {};
  userHistory.forEach(h => {
    const v = db.videos.find(vid => vid.id === h.videoId);
    if (v) {
      catCounts[v.category] = (catCounts[v.category] || 0) + 1;
    }
  });
  let mostWatchedCategory = 'Science';
  let maxCount = 0;
  Object.keys(catCounts).forEach(cat => {
    if (catCounts[cat] > maxCount) {
      maxCount = catCounts[cat];
      mostWatchedCategory = cat;
    }
  });

  const totalWatchMinutes = userHistory.reduce((sum, h) => sum + (h.watchTime || 0), 0);
  const completionRate = userHistory.length > 0 
    ? Math.round((userHistory.filter(h => h.status === 'completed').length / userHistory.length) * 100)
    : 0;

  const userAnalytics = {
    totalWatchTime: totalWatchMinutes, // in minutes
    mostWatchedCategory,
    completionRate,
    favoriteTopic: mostWatchedCategory
  };

  // Progress Dashboard Widgets
  const coursesCompleted = userHistory.filter(h => h.status === 'completed').length;
  const progressDashboard = {
    hoursWatched: Math.round((totalWatchMinutes / 60) * 10) / 10,
    coursesCompleted,
    currentStreak: 5, // mock streak
    certificatesEarned: coursesCompleted,
    weeklyProgress: coursesCompleted > 0 ? Math.min(100, coursesCompleted * 25) : 10
  };

  res.json({
    categories,
    continueWatching,
    recentlyWatched,
    favorites,
    newVideos,
    recommended,
    trending,
    topRated,
    becauseYouWatched,
    userAnalytics,
    progressDashboard
  });
});

// ================= NOTIFICATIONS MODULE =================

app.get('/api/notifications', authenticateToken, (req, res) => {
  const db = readDB();
  const userNotifs = db.notifications.filter(n => n.userId === req.user.id);
  res.json(userNotifs.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const db = readDB();
  const notif = db.notifications.find(n => n.id === req.params.id && n.userId === req.user.id);
  if (!notif) return res.status(404).json({ message: "Notification not found" });

  notif.read = true;
  writeDB(db);
  res.json(notif);
});

// ================= REPORTS & ANALYTICS EXPORTS =================

app.get('/api/reports/super-admin', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const db = readDB();
  
  // Generate a mock detailed list for export
  const adminPerformance = db.users.filter(u => u.role === 'admin').map(admin => {
    const videos = db.videos.filter(v => v.uploadedBy === admin.id);
    const views = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    return {
      adminName: admin.name,
      email: admin.email,
      videosUploaded: videos.length,
      totalViews: views,
      status: admin.status
    };
  });

  const userActivity = db.users.filter(u => u.role === 'user').map(user => {
    const history = db.watchHistory.filter(h => h.userId === user.id);
    const watchTimeMin = Math.round(history.reduce((sum, h) => sum + (h.watchTime || 0), 0) / 60);
    const completed = history.filter(h => h.status === 'completed').length;
    return {
      userName: user.name,
      email: user.email,
      videosStarted: history.length,
      videosCompleted: completed,
      totalWatchTimeMinutes: watchTimeMin
    };
  });

  res.json({
    adminPerformance,
    userActivity,
    exportData: {
      csv: "Admin Name,Email,Videos Uploaded,Total Views,Status\n" + adminPerformance.map(a => `"${a.adminName}","${a.email}",${a.videosUploaded},${a.totalViews},"${a.status}"`).join("\n"),
      excelJSON: adminPerformance
    }
  });
});

app.get('/api/reports/admin', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const db = readDB();
  const adminId = req.user.id;
  const myVideos = db.videos.filter(v => v.uploadedBy === adminId);
  const myVideoIds = myVideos.map(v => v.id);

  const videoPopularity = myVideos.map(v => {
    const history = db.watchHistory.filter(h => h.videoId === v.id);
    const completed = history.filter(h => h.status === 'completed').length;
    return {
      title: v.title,
      category: v.category,
      views: v.views || 0,
      completionRate: history.length ? Math.round((completed / history.length) * 100) + '%' : '0%'
    };
  });

  res.json({
    videoPopularity,
    exportData: {
      csv: "Video Title,Category,Views,Completion Rate\n" + videoPopularity.map(vp => `"${vp.title}","${vp.category}",${vp.views},"${vp.completionRate}"`).join("\n"),
      excelJSON: videoPopularity
    }
  });
});

// ================= NEW WORKSPACE & OVERHAUL ENDPOINTS =================

// 1. Analytics Endpoints
app.get('/api/analytics/user', authenticateToken, (req, res) => {
  const db = readDB();
  const totalUsers = db.users.filter(u => u.role === 'user').length;
  res.json({
    dau: Math.round(totalUsers * 0.36),
    mau: Math.round(totalUsers * 0.85),
    registrations: [
      { label: 'Jan', count: 45 },
      { label: 'Feb', count: 90 },
      { label: 'Mar', count: 145 },
      { label: 'Apr', count: 180 },
      { label: 'May', count: 220 },
      { label: 'Jun', count: totalUsers }
    ],
    retentionRate: 78,
    churnRate: 4.2,
    deviceUsage: [
      { label: 'Mobile', count: 58 },
      { label: 'Web', count: 32 },
      { label: 'Smart TV', count: 10 }
    ]
  });
});

app.get('/api/analytics/content', authenticateToken, (req, res) => {
  const db = readDB();
  const sortedVideos = [...db.videos].sort((a,b) => (b.views || 0) - (a.views || 0));
  const categoryViews = db.categories.map(cat => {
    const vids = db.videos.filter(v => v.category === cat.name);
    const sumViews = vids.reduce((sum, v) => sum + (v.views || 0), 0);
    return { name: cat.name, count: sumViews };
  }).filter(c => c.count > 0);

  res.json({
    mostWatched: sortedVideos.slice(0, 5).map(v => ({ title: v.title, views: v.views })),
    trendingCategories: categoryViews.slice(0, 5),
    watchTimePerVideo: db.videos.map(v => ({ title: v.title, minutes: Math.round((v.views || 0) * (v.duration || 300) / 60) })),
    avgSessionDurationMinutes: 24.5,
    dropOffRatePercent: 18.4,
    completionRatePercent: 72
  });
});

app.get('/api/analytics/revenue', authenticateToken, (req, res) => {
  const db = readDB();
  const txs = db.transactions || [];
  const totalRevenue = txs.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
  const refundCount = txs.filter(t => t.status === 'refunded').length;

  res.json({
    subscriptionRevenue: totalRevenue,
    adRevenue: Math.round(totalRevenue * 0.18),
    refundsCount: refundCount,
    revenueByRegion: [
      { name: 'North India', amount: Math.round(totalRevenue * 0.45) },
      { name: 'South India', amount: Math.round(totalRevenue * 0.35) },
      { name: 'West India', amount: Math.round(totalRevenue * 0.20) }
    ],
    premiumConversionRatePercent: 12.5
  });
});

app.get('/api/analytics/engagement', authenticateToken, (req, res) => {
  const db = readDB();
  const totalViews = db.videos.reduce((sum, v) => sum + (v.views || 0), 0);
  res.json({
    likes: Math.round(totalViews * 0.12),
    comments: Math.round(totalViews * 0.05),
    shares: Math.round(totalViews * 0.08),
    saves: Math.round(totalViews * 0.15),
    followersGrowth: [
      { label: 'Mar', count: 1200 },
      { label: 'Apr', count: 1800 },
      { label: 'May', count: 2400 },
      { label: 'Jun', count: 3200 }
    ]
  });
});

app.get('/api/analytics/streaming', authenticateToken, (req, res) => {
  res.json({
    liveConcurrent: 176,
    streamBitrateKbps: 4500,
    bufferingRatioPercent: 0.85,
    playbackFailuresPercent: 0.12,
    cdnPerformanceMs: 38
  });
});

// 2. Monitoring Endpoints
app.get('/api/monitoring/live', authenticateToken, (req, res) => {
  const db = readDB();
  res.json(db.liveStreams || []);
});

app.get('/api/monitoring/server', authenticateToken, (req, res) => {
  res.json({
    cpuUsage: 28,
    ramUsage: 64,
    storageUsage: 85,
    networkUsageMbps: 120,
    apiResponseTimeMs: 24
  });
});

app.get('/api/monitoring/security', authenticateToken, (req, res) => {
  res.json({
    failedLogins: 4,
    suspiciousActivities: [
      { id: 1, user: 'Unknown User', details: 'Brute force warning on u-admin1', ip: '192.168.1.105', date: new Date().toISOString() }
    ],
    blockedIps: ['192.168.1.105', '185.220.101.4'],
    tokenExpiryLogs: [
      { user: 'user1@stream.com', expiredAt: new Date(Date.now() - 3600000).toISOString() }
    ]
  });
});

app.get('/api/monitoring/alerts', authenticateToken, (req, res) => {
  res.json([
    { id: 1, type: 'Server Down', message: 'Primary storage node (S3 proxy) is slow.', severity: 'medium' },
    { id: 2, type: 'High Traffic', message: 'Traffic spike detected (+40% users).', severity: 'low' },
    { id: 3, type: 'Streaming Failure', message: 'Stream v-178100 exited unexpectedly.', severity: 'high' }
  ]);
});

// 3. Admin Activity Logs
app.get('/api/admin-logs', authenticateToken, (req, res) => {
  const db = readDB();
  const { date, admin, actionType } = req.query;
  let logs = db.adminActivityLogs || [];

  if (admin) {
    logs = logs.filter(l => l.adminName.toLowerCase().includes(admin.toLowerCase()) || l.adminId === admin);
  }
  if (actionType) {
    logs = logs.filter(l => l.action.toLowerCase() === actionType.toLowerCase());
  }
  if (date) {
    logs = logs.filter(l => l.timestamp.startsWith(date));
  }

  res.json(logs);
});

// 4. Subscriptions & Plans
app.get('/api/subscriptions', authenticateToken, (req, res) => {
  const db = readDB();
  // Generate active/expired lists dynamically for view
  const activeList = db.users.filter(u => u.role === 'user' && u.status === 'active').map(u => ({
    userId: u.id,
    userName: u.name,
    planName: 'Premium Scholar',
    startDate: '2026-06-01',
    endDate: '2026-07-01',
    isTrial: false,
    status: 'active'
  }));

  const expiredList = db.users.filter(u => u.role === 'user' && u.status === 'disabled').map(u => ({
    userId: u.id,
    userName: u.name,
    planName: 'Basic Learner',
    startDate: '2026-05-01',
    endDate: '2026-06-01',
    isTrial: true,
    status: 'expired'
  }));

  const failedRenewals = [
    { id: 'f-1', userName: 'User Exp', planName: 'Premium Scholar', amount: 699, failedAt: new Date().toISOString(), reason: 'Insufficient funds' }
  ];

  res.json({
    active: activeList,
    expired: expiredList,
    failed: failedRenewals
  });
});

app.get('/api/plans', authenticateToken, (req, res) => {
  const db = readDB();
  res.json(db.subscriptionPlans || []);
});

app.post('/api/plans', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, price, durationDays, features } = req.body;
  if (!name || !price) return res.status(400).json({ message: "Name and Price are required" });

  const db = readDB();
  const newPlan = {
    id: 'plan-' + Date.now(),
    name,
    price: Number(price),
    durationDays: Number(durationDays || 30),
    features: Array.isArray(features) ? features : (features ? features.split(',').map(f=>f.trim()) : [])
  };

  if (!db.subscriptionPlans) db.subscriptionPlans = [];
  db.subscriptionPlans.push(newPlan);
  writeDB(db);

  res.status(201).json(newPlan);
});

app.put('/api/plans/:id', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, price, durationDays, features } = req.body;
  const db = readDB();
  const plan = db.subscriptionPlans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  if (name) plan.name = name;
  if (price !== undefined) plan.price = Number(price);
  if (durationDays !== undefined) plan.durationDays = Number(durationDays);
  if (features) plan.features = Array.isArray(features) ? features : features.split(',').map(f=>f.trim());

  writeDB(db);
  res.json(plan);
});

app.delete('/api/plans/:id', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const db = readDB();
  db.subscriptionPlans = (db.subscriptionPlans || []).filter(p => p.id !== req.params.id);
  writeDB(db);
  res.json({ message: "Plan deleted successfully" });
});

// 5. Moderation Reports
app.get('/api/moderation/reports', authenticateToken, (req, res) => {
  const db = readDB();
  res.json({
    reportedVideos: db.reportedVideos || [],
    reportedUsers: [
      { id: 'ru-1', userName: 'SpamUser', email: 'spam@stream.com', reportedBy: 'user1@stream.com', reason: 'Spam comments under Flutter videos', status: 'pending' }
    ],
    copyrightIssues: [
      { id: 'cr-1', videoTitle: 'Test Sample', owner: 'Original Creator Inc.', status: 'pending' }
    ],
    spamDetection: [
      { id: 'sp-1', userName: 'varma', commentText: 'Buy cheap Bitcoins now!', videoTitle: 'React JS for Beginners', date: new Date().toISOString() }
    ]
  });
});

app.post('/api/moderation/resolve', authenticateToken, (req, res) => {
  const { reportId, action } = req.body; // action: dismiss, delete, ban
  const db = readDB();

  // Find in reported videos
  const reportIndex = db.reportedVideos.findIndex(r => r.id === reportId);
  if (reportIndex !== -1) {
    if (action === 'delete') {
      const vidId = db.reportedVideos[reportIndex].videoId;
      db.videos = db.videos.filter(v => v.id !== vidId);
    }
    db.reportedVideos.splice(reportIndex, 1);
  }

  writeDB(db);
  res.json({ message: "Report resolved successfully" });
});

// 6. Payments/Transactions & Refund
app.get('/api/payments/transactions', authenticateToken, (req, res) => {
  const db = readDB();
  res.json(db.transactions || []);
});

app.post('/api/payments/refund', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { transactionId } = req.body;
  const db = readDB();
  const tx = db.transactions.find(t => t.id === transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });

  tx.status = 'refunded';
  writeDB(db);

  res.json({ message: "Transaction refunded successfully", transaction: tx });
});

// 7. Push / Email Campaigns
app.post('/api/notifications/campaign', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
  const { type, title, message } = req.body; // push, email, in_app
  const db = readDB();

  // Add notification to all users
  db.users.filter(u => u.role === 'user').forEach(u => {
    addNotification(u.id, `[Campaign: ${type}] ${title}`, message);
  });

  res.json({ message: `Campaign '${title}' triggered successfully via ${type}.` });
});

// 8. Settings
app.get('/api/settings', authenticateToken, (req, res) => {
  const db = readDB();
  res.json(db.settings || {});
});

app.put('/api/settings', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json({ message: "Settings updated successfully", settings: db.settings });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Mock Backend server running on http://localhost:${PORT}`);
});
