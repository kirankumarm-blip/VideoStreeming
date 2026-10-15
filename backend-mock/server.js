const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

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
  if (req.body.formstep === 'getGender') {
    return res.json([
      { id: 1, name: "Male" },
      { id: 2, name: "Female" },
      { id: 3, name: "Other" }
    ]);
  }

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

app.all(['/api/auth/forgot-password', '/vdauth/forgot-password', '/vdforgot-password'], (req, res) => {
  const { email } = req.body || {};
  return res.json({
    status: 200,
    message: `Password reset instructions sent to ${email || 'email'}. Use reset token: RESET-MOCK-123`,
    resetToken: "RESET-MOCK-123"
  });
});

app.all(['/api/auth/reset-password', '/vdauth/reset-password', '/vdreset-password'], (req, res) => {
  return res.json({
    status: 200,
    message: "Password reset successfully. Please login with your new password."
  });
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

const handleVdCategories = (req, res) => {
  const formstep = req.body.formstep || req.body.formStep;
  if (formstep === 'dropdown_data') {
    const db = readDB();
    return res.json({
      categories: db.categories || [],
      subcategories: db.sub_categories || [],
      languages: [
        { id: "1", name: "English" },
        { id: "2", name: "Spanish" },
        { id: "3", name: "French" }
      ],
      visibilities: [
        { id: "public", name: "public" },
        { id: "private", name: "private" }
      ],
      levels: [
        { id: "Beginner", name: "Beginner" },
        { id: "Intermediate", name: "Intermediate" },
        { id: "Advanced", name: "Advanced" }
      ],
      plans: [
        { id: "free", name: "Free" },
        { id: "premium", name: "Premium" }
      ],
      admins: db.admins || [],
      author_admins: db.author_admins || [
        { id: "1", name: "Dr. Angela Yu", first_name: "Angela", last_name: "Yu" },
        { id: "2", name: "Maximilian Schwarzmuller", first_name: "Maximilian", last_name: "Schwarzmuller" }
      ],
      quiz_types: [
        { id: "1", name: "Multiple Choice" },
        { id: "2", name: "True/False" },
        { id: "3", name: "Short Answer" }
      ]
    });
  }
  if (formstep === 'getStates') {
    return res.json([
      { state_id: "1", name: "California" },
      { state_id: "2", name: "Texas" },
      { state_id: "3", name: "New York" },
      { state_id: "4", name: "Florida" },
      { state_id: "5", name: "Illinois" },
      { state_id: "6", name: "Maharashtra" },
      { state_id: "7", name: "Karnataka" },
      { state_id: "8", name: "Delhi" }
    ]);
  }
  if (formstep === 'getCity') {
    const stateId = String(req.body.state_id || req.body.stat_id || '1');
    const citiesMap = {
      "1": [{ city_id: "101", name: "Los Angeles" }, { city_id: "102", name: "San Francisco" }, { city_id: "103", name: "San Diego" }],
      "2": [{ city_id: "201", name: "Houston" }, { city_id: "202", name: "Austin" }, { city_id: "203", name: "Dallas" }],
      "3": [{ city_id: "301", name: "New York City" }, { city_id: "302", name: "Buffalo" }, { city_id: "303", name: "Albany" }],
      "4": [{ city_id: "401", name: "Miami" }, { city_id: "402", name: "Orlando" }, { city_id: "403", name: "Tampa" }],
      "5": [{ city_id: "501", name: "Chicago" }, { city_id: "502", name: "Springfield" }, { city_id: "503", name: "Peoria" }],
      "6": [{ city_id: "601", name: "Mumbai" }, { city_id: "602", name: "Pune" }, { city_id: "603", name: "Nagpur" }],
      "7": [{ city_id: "701", name: "Bengaluru" }, { city_id: "702", name: "Mysuru" }, { city_id: "703", name: "Mangaluru" }],
      "8": [{ city_id: "801", name: "New Delhi" }, { city_id: "802", name: "North Delhi" }, { city_id: "803", name: "South Delhi" }]
    };
    return res.json(citiesMap[stateId] || [
      { city_id: "901", name: "City Center" },
      { city_id: "902", name: "Metro Area" }
    ]);
  }
  if (formstep === 'getSubCategory' || formstep === 'getSubCategories' || formstep === 'subcategory') {
    const db = readDB();
    const rawCategories = db.categories || [];
    const catId = req.body.category_id || req.body.categoryId || req.body.cat_id || req.body.id || req.body.category;
    if (catId) {
      const cat = rawCategories.find(c => 
        String(c.id).toLowerCase() === String(catId).toLowerCase() ||
        String(c.name).toLowerCase() === String(catId).toLowerCase()
      );
      const subCats = (cat && cat.sub_categories) ? cat.sub_categories : [];
      return res.json(subCats);
    }
    const allSub = [];
    rawCategories.forEach(c => {
      if (c.sub_categories && Array.isArray(c.sub_categories)) {
        c.sub_categories.forEach(s => allSub.push({ id: s, name: s, cat_id: c.id, category_name: c.name }));
      }
    });
    return res.json(allSub);
  }
  return res.json([]);
};

app.post('/vdcategories', handleVdCategories);
app.post('/api/vdcategories', handleVdCategories);
app.post('/webhook/vdcategories', handleVdCategories);

// ================= DRAFTS MODULE =================
const handleVdDrafts = (req, res) => {
  const db = readDB();
  if (!db.course_drafts) {
    db.course_drafts = [];
    writeDB(db);
  }
  const formstep = req.body.formstep || req.body.formStep;
  if (formstep === 'getCourseDraft' || formstep === 'getDrafts' || !formstep) {
    return res.json(db.course_drafts);
  }
  if (formstep === 'saveDraft' || formstep === 'addCourseDraft') {
    const newDraft = {
      ...req.body,
      id: String(req.body.id || (db.course_drafts.length + 1)),
      created_at: new Date().toISOString()
    };
    db.course_drafts.push(newDraft);
    writeDB(db);
    return res.json({ message: "Draft saved successfully", draft: newDraft });
  }
  if (formstep === 'deleteDraft' || formstep === 'deleteCourseDraft') {
    const draftId = String(req.body.id);
    db.course_drafts = db.course_drafts.filter(d => String(d.id) !== draftId);
    writeDB(db);
    return res.json({ message: "Draft deleted successfully" });
  }
  return res.json(db.course_drafts);
};

app.post('/vd_drafts', handleVdDrafts);
app.post('/api/vd_drafts', handleVdDrafts);
app.post('/webhook/vd_drafts', handleVdDrafts);
app.post('/vdDrafts', handleVdDrafts);
app.post('/api/vdDrafts', handleVdDrafts);
app.post('/webhook/vdDrafts', handleVdDrafts);

// ================= BULK UPLOAD MODULE =================
const handleVdBulkUpload = (req, res) => {
  const formstep = req.body?.formstep || req.body?.formStep || 'bulk_upload';
  const testStatus = req.headers['x-test-status'] || req.query?.testStatus;

  if (testStatus === '410') {
    return res.status(410).json([{
      count: "1",
      emails: ["deepa@stream.com"]
    }]);
  }
  if (testStatus === '420') {
    return res.status(420).json([{
      count: "1",
      phone_numbers: ["9876543210"]
    }]);
  }

  return res.json({
    message: "Bulk users uploaded successfully!",
    formstep,
    uploaded_count: 5
  });
};

app.post('/vd_bulk_upload', upload.single('file'), handleVdBulkUpload);
app.post('/api/vd_bulk_upload', upload.single('file'), handleVdBulkUpload);
app.post('/webhook/vd_bulk_upload', upload.single('file'), handleVdBulkUpload);

// ================= CLIENTS MODULE =================
const handleVdClients = (req, res) => {
  const db = readDB();
  if (!db.clients) {
    db.clients = [
      {
        id: "1",
        name: "Acme Media Corp",
        phonenumber: "9876543210",
        mobile: "9876543210",
        address_line1: "100 Silicon Way",
        address_line2: "Suite 500",
        state: "California",
        state_id: "1",
        city: "Los Angeles",
        city_id: "101",
        zipcode: "90001"
      }
    ];
    writeDB(db);
  }

  const formstep = req.body.formstep || req.body.formStep;

  if (formstep === 'getClients' || formstep === 'get client') {
    return res.json(db.clients);
  }

  if (formstep === 'add client' || formstep === 'addClient') {
    const newClient = {
      id: String(Date.now()),
      name: req.body.name || req.body.client_name || '',
      phonenumber: req.body.phonenumber || req.body.mobile || req.body.phone_number || '',
      mobile: req.body.mobile || req.body.phonenumber || req.body.phone_number || '',
      address_line1: req.body.address_line1 || req.body.address1 || req.body.address_line_1 || '',
      address_line2: req.body.address_line2 || req.body.address2 || req.body.address_line_2 || '',
      state: req.body.state || '',
      state_id: req.body.state_id || '',
      city: req.body.city || '',
      city_id: req.body.city_id || '',
      zipcode: req.body.zipcode || ''
    };
    db.clients.push(newClient);
    writeDB(db);
    return res.json({ success: true, message: "Client added successfully", client: newClient });
  }

  if (formstep === 'edit client' || formstep === 'editClient') {
    const clientId = String(req.body.id);
    const index = db.clients.findIndex(c => String(c.id) === clientId);
    if (index !== -1) {
      db.clients[index] = {
        ...db.clients[index],
        name: req.body.name || req.body.client_name || db.clients[index].name,
        phonenumber: req.body.phonenumber || req.body.mobile || db.clients[index].phonenumber,
        mobile: req.body.mobile || req.body.phonenumber || db.clients[index].mobile,
        address_line1: req.body.address_line1 || req.body.address1 || db.clients[index].address_line1,
        address_line2: req.body.address_line2 || req.body.address2 || db.clients[index].address_line2,
        state: req.body.state || db.clients[index].state,
        state_id: req.body.state_id || db.clients[index].state_id,
        city: req.body.city || db.clients[index].city,
        city_id: req.body.city_id || db.clients[index].city_id,
        zipcode: req.body.zipcode || db.clients[index].zipcode
      };
      writeDB(db);
      return res.json({ success: true, message: "Client updated successfully", client: db.clients[index] });
    }
  }

  if (formstep === 'delete client' || formstep === 'deleteClient') {
    const clientId = String(req.body.id);
    db.clients = db.clients.filter(c => String(c.id) !== clientId);
    writeDB(db);
    return res.json({ success: true, message: "Client deleted successfully" });
  }

  return res.json(db.clients);
};

app.post('/vdClients', handleVdClients);
app.post('/api/vdClients', handleVdClients);
app.post('/webhook/vdClients', handleVdClients);
app.post('/vdclients', handleVdClients);
app.post('/api/vdclients', handleVdClients);
app.post('/webhook/vdclients', handleVdClients);

// ================= VdAdmins GET ADMINS & LISTING =================
const handleVdAdmins = (req, res) => {
  const formstep = req.body.formstep || req.body.formStep;
  const db = readDB();

  if (formstep === 'getClients') {
    const clients = db.clients || [{ id: "1", name: "Acme Media Corp" }];
    return res.json(clients);
  }

  if (formstep === 'getGender' || formstep === 'getGenders') {
    return res.json([
      { id: "1", name: "Male" },
      { id: "2", name: "Female" },
      { id: "3", name: "Other" }
    ]);
  }

  if (formstep === 'getStates') {
    return res.json([
      { state_id: "1", name: "California" },
      { state_id: "2", name: "Texas" },
      { state_id: "3", name: "New York" },
      { state_id: "4", name: "Florida" },
      { state_id: "5", name: "Illinois" },
      { state_id: "6", name: "Maharashtra" },
      { state_id: "7", name: "Karnataka" },
      { state_id: "8", name: "Delhi" }
    ]);
  }

  if (formstep === 'getCity') {
    const stateId = String(req.body.state_id || req.body.stat_id || '1');
    const citiesMap = {
      "1": [{ city_id: "101", name: "Los Angeles" }, { city_id: "102", name: "San Francisco" }, { city_id: "103", name: "San Diego" }],
      "2": [{ city_id: "201", name: "Houston" }, { city_id: "202", name: "Austin" }, { city_id: "203", name: "Dallas" }],
      "3": [{ city_id: "301", name: "New York City" }, { city_id: "302", name: "Buffalo" }, { city_id: "303", name: "Albany" }],
      "4": [{ city_id: "401", name: "Miami" }, { city_id: "402", name: "Orlando" }, { city_id: "403", name: "Tampa" }],
      "5": [{ city_id: "501", name: "Chicago" }, { city_id: "502", name: "Springfield" }, { city_id: "503", name: "Peoria" }],
      "6": [{ city_id: "601", name: "Mumbai" }, { city_id: "602", name: "Pune" }, { city_id: "603", name: "Nagpur" }],
      "7": [{ city_id: "701", name: "Bengaluru" }, { city_id: "702", name: "Mysuru" }, { city_id: "703", name: "Mangaluru" }],
      "8": [{ city_id: "801", name: "New Delhi" }, { city_id: "802", name: "North Delhi" }, { city_id: "803", name: "South Delhi" }]
    };
    return res.json(citiesMap[stateId] || [
      { city_id: "901", name: "City Center" },
      { city_id: "902", name: "Metro Area" }
    ]);
  }

  if (formstep === 'authorAdmin') {
    const authorAdmins = db.authorAdmins || [
      { id: "1", first_name: "Sarah", last_name: "Connor", name: "Sarah Connor", email: "sarah@lurnax.com", phonenumber: "9876543211", role: "Author Admin", status: "Active", created_at: "2026-08-14" }
    ];
    return res.json(authorAdmins);
  }

  if (formstep === 'addAuthorAdmin') {
    if (!db.authorAdmins) db.authorAdmins = [];
    const newAuthor = {
      id: String(Date.now()),
      first_name: req.body.first_name || req.body.firstName || '',
      last_name: req.body.last_name || req.body.lastName || '',
      name: `${req.body.first_name || req.body.firstName || ''} ${req.body.last_name || req.body.lastName || ''}`.trim(),
      email: req.body.email || '',
      phonenumber: req.body.phonenumber || req.body.mobile || '',
      gender_id: req.body.gender_id || req.body.gender || null,
      date_of_birth: req.body.date_of_birth || req.body.dob || null,
      address: req.body.address || '',
      state: req.body.state || '',
      city: req.body.city || '',
      zipcode: req.body.zipcode || '',
      client_id: req.body.client_id || null,
      role: "Author Admin",
      status: "Active",
      created_at: new Date().toISOString().slice(0, 10)
    };
    db.authorAdmins.unshift(newAuthor);
    writeDB(db);
    return res.json({ success: true, message: "Author Admin added successfully", authorAdmin: newAuthor });
  }

  if (formstep === 'getAllAdmins' || formstep === 'getAdmins' || formstep === 'get_admins') {
    const clientId = String(req.body.client_id || req.body.admin_id || '');
    let adminsList = db.admins || [
      { id: "1", first_name: "Shetty", last_name: "Amogh", email: "amogh@lurnax.com", phonenumber: "9876543210", role: "admin", status: "Active", client_id: "1" }
    ];
    if (clientId) {
      adminsList = adminsList.filter(a => String(a.client_id || a.clientId || '1') === clientId);
    }
    return res.json(adminsList);
  }

  return res.json(db.admins || []);
};

app.post('/vdadmins', handleVdAdmins);
app.post('/api/vdadmins', handleVdAdmins);
app.post('/webhook/vdadmins', handleVdAdmins);

app.post(['/adminUsers', '/api/adminUsers', '/webhook/adminUsers'], (req, res) => {
  const formstep = req.body.formstep || req.body.formStep;
  if (formstep === 'getGender') {
    return res.json([
      { id: "1", name: "Male" },
      { id: "2", name: "Female" },
      { id: "3", name: "Other" }
    ]);
  }
  return res.json([]);
});


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
  db.users.filter(u => u.role === 'user' || u.role === 'student' || !u.role).forEach(u => {
    addNotification(u.id, "New Video Added", `"${title}" has been uploaded. Watch it now!`);
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

// Handler for vdadminVideos and vdSuperAdminVideos (UAT & Mock Webhooks)
const handleVdAdminVideos = (req, res) => {
  const db = readDB();
  const formstep = req.body?.formstep || req.body?.formStep || 'getAllVideos';

  if (formstep === 'transcript') {
    const videoId = String(req.body.video_id || req.body.videoId || req.body.id || '');
    const video = db.videos.find(v => String(v.id) === videoId || String(v.video_id) === videoId);
    if (video) {
      if (req.body.subtitles) video.subtitles = req.body.subtitles;
      if (req.body.subtitleTracks || req.body.subtitle_tracks) video.subtitleTracks = req.body.subtitleTracks || req.body.subtitle_tracks;
      if (req.body.transcripts) video.transcripts = req.body.transcripts;
      if (req.body.transcript) video.transcript = req.body.transcript;
      writeDB(db);
      return res.json({ success: true, message: "Transcripts and subtitles updated successfully", video });
    }
    return res.json({ success: true, message: `Transcript received for video ${videoId}` });
  }

  if (formstep === 'transcriptCourse') {
    const courseId = String(req.body.course_id || req.body.courseId || req.body.id || '');
    console.log('[Mock Backend] Received transcriptCourse for courseId:', courseId, 'chapters:', req.body.chapters);
    const course = (db.courses || []).find(c => String(c.id) === courseId || String(c.course_id) === courseId);
    if (course && Array.isArray(req.body.chapters)) {
      req.body.chapters.forEach(ch => {
        const matchingChapter = (course.chapters || []).find(cCh => String(cCh.id || cCh.chapter_id) === String(ch.chapter_id || ch.id));
        if (matchingChapter && Array.isArray(ch.videos)) {
          ch.videos.forEach(v => {
            const matchingVid = (matchingChapter.videos || []).find(cV => String(cV.id || cV.video_id) === String(v.video_id || v.id));
            if (matchingVid) {
              if (v.subtitles) matchingVid.subtitles = v.subtitles;
              if (v.subtitleTracks || v.subtitle_tracks) matchingVid.subtitleTracks = v.subtitleTracks || v.subtitle_tracks;
              if (v.transcripts) matchingVid.transcripts = v.transcripts;
              if (v.transcript) matchingVid.transcript = v.transcript;
            }
          });
        }
      });
      writeDB(db);
    }
    return res.json({ success: true, message: `transcriptCourse received for course ${courseId}` });
  }

  if (formstep === 'uploadVideo') {
    const newId = 'v-' + Date.now();
    const newVideo = {
      id: newId,
      video_id: newId,
      title: req.body.title || 'Untitled Video',
      description: req.body.description || '',
      category: req.body.category || '1',
      subcategory_id: req.body.subcategory_id || '1',
      language_id: req.body.language_id || '1',
      tags: req.body.tags || [],
      visibility: req.body.visibility || '1',
      videoUrl: req.body.videoUrl || '',
      thumbnailUrl: req.body.thumbnailUrl || '',
      subtitles: req.body.subtitles || null,
      subtitleTracks: req.body.subtitleTracks || req.body.subtitle_tracks || null,
      transcripts: req.body.transcripts || null,
      transcript: req.body.transcript || null,
      created_at: new Date().toISOString()
    };
    db.videos.unshift(newVideo);
    writeDB(db);
    return res.json({ success: true, video_id: newId, id: newId, videoId: newId, video: newVideo });
  }

  if (formstep === 'getAllVideos' || formstep === 'getMyVideos' || formstep === 'getAssignedVideos') {
    return res.json(db.videos || []);
  }

  return res.json(db.videos || []);
};

app.post(['/vdadminVideos', '/api/vdadminVideos', '/webhook/vdadminVideos', '/vdSuperAdminVideos', '/api/vdSuperAdminVideos', '/webhook/vdSuperAdminVideos'], handleVdAdminVideos);

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
  const rawId = req.params.id;
  let video = db.videos.find(v => String(v.id) === String(rawId) || v.id === `v-${rawId}`);
  
  if (!video) {
    const numIdx = parseInt(rawId, 10);
    if (!isNaN(numIdx) && numIdx > 0 && numIdx <= db.videos.length) {
      video = db.videos[numIdx - 1];
    } else {
      video = db.videos.find(v => v.videoUrl && v.videoUrl.startsWith('/uploads/')) || db.videos[0];
    }
  }

  if (!video) return res.status(404).json({ message: "Video not found" });

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
    progressDashboard,
    allVideos: assignedVideos
  });
});

// ================= NOTIFICATIONS MODULE =================

const handleVdNotification = (req, res) => {
  const db = readDB();
  const formstep = req.body.formstep || req.body.formStep;
  const token = req.body.token;

  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (e) {}
  }
  if (!userId && req.user) {
    userId = req.user.id;
  }

  if (!db.user_notification_reads) {
    db.user_notification_reads = [];
  }

  if (formstep === 'markAsRead') {
    const notifId = String(req.body.id || req.body.notification_id || req.body.notificationId || '');
    
    // Update main notification
    const notif = db.notifications.find(n => String(n.id) === notifId);
    if (notif) {
      notif.read = true;
    }

    // Save entry into user_notification_reads table
    const now = new Date().toISOString();
    const existingReadIndex = db.user_notification_reads.findIndex(
      r => String(r.user_id) === String(userId) && String(r.notification_id) === notifId
    );

    if (existingReadIndex >= 0) {
      db.user_notification_reads[existingReadIndex].is_read = true;
      db.user_notification_reads[existingReadIndex].read_at = now;
    } else {
      db.user_notification_reads.push({
        id: `unr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: userId || 'unknown',
        notification_id: notifId,
        is_read: true,
        read_at: now,
        created_at: now
      });
    }

    writeDB(db);
    return res.json({ success: true, message: 'Read status stored in user_notification_reads table' });
  }

  if (formstep === 'getUserNotificationReads' || formstep === 'getReadStatus') {
    const reads = db.user_notification_reads.filter(r => !userId || String(r.user_id) === String(userId));
    return res.json({ success: true, data: reads, user_notification_reads: reads });
  }

  if (formstep === 'sendCampaign') {
    const { type, title, message } = req.body;
    db.users.filter(u => u.role === 'user' || u.role === 'student' || !u.role).forEach(u => {
      addNotification(u.id, title || 'Announcement', message || '');
    });
    return res.json({ success: true, message: 'Campaign sent successfully' });
  }

  // Default: getNotifications
  const rawNotifs = userId ? db.notifications.filter(n => n.userId === userId || !n.userId) : db.notifications;
  const userNotifs = rawNotifs.map(n => {
    const readRecord = db.user_notification_reads.find(
      r => String(r.user_id) === String(userId) && String(r.notification_id) === String(n.id)
    );
    return {
      ...n,
      read: readRecord ? Boolean(readRecord.is_read) : Boolean(n.read)
    };
  });
  return res.json(userNotifs.sort((a, b) => new Date(b.date) - new Date(a.date)));
};

app.post('/vdnotification', handleVdNotification);
app.post('/api/vdnotification', handleVdNotification);
app.post('/webhook/vdnotification', handleVdNotification);
app.post('/vdnotifications', handleVdNotification);
app.post('/api/vdnotifications', handleVdNotification);
app.post('/webhook/vdnotifications', handleVdNotification);

const handleVdUser = (req, res) => {
  const db = readDB();
  const formstep = req.body.formstep || req.body.formStep;
  const token = req.body.token;

  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (e) {}
  }
  if (!userId && req.user) {
    userId = req.user.id;
  }

  if (formstep === 'saveNotification') {
    const rawNotifId = req.body.notification_id || req.body.notificationId || req.body.notification_ids || req.body.id;
    const status = req.body.status || 'read';
    const isReadStatus = (status === 'read' || status === true || status === '1' || status === 1);

    if (!db.user_notification_reads) {
      db.user_notification_reads = [];
    }

    const now = new Date().toISOString();
    let notifIds = [];

    if (Array.isArray(rawNotifId)) {
      notifIds = rawNotifId.map(id => String(id));
    } else if (typeof rawNotifId === 'string' && rawNotifId.includes(',')) {
      notifIds = rawNotifId.split(',').map(id => id.trim());
    } else if (rawNotifId) {
      notifIds = [String(rawNotifId)];
    }

    notifIds.forEach(notifId => {
      // Update main notification
      const notif = db.notifications.find(n => String(n.id) === String(notifId));
      if (notif) {
        notif.read = isReadStatus;
      }

      // Update or insert into user_notification_reads table
      const existingIdx = db.user_notification_reads.findIndex(
        r => String(r.user_id) === String(userId) && String(r.notification_id) === String(notifId)
      );

      if (existingIdx >= 0) {
        db.user_notification_reads[existingIdx].is_read = isReadStatus;
        db.user_notification_reads[existingIdx].status = status;
        db.user_notification_reads[existingIdx].read_at = now;
      } else {
        db.user_notification_reads.push({
          id: `unr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_id: userId || 'unknown',
          notification_id: notifId,
          is_read: isReadStatus,
          status: status,
          read_at: now,
          created_at: now
        });
      }
    });

    writeDB(db);
    return res.json({
      success: true,
      message: 'Notification read status saved via vdUser',
      notification_id: rawNotifId,
      status: status,
      processed_count: notifIds.length
    });
  }

  // --- PLAYLIST API (vdUser: formstep = getPlayList) ---
  if (formstep === 'getPlayList' || formstep === 'getPlaylist' || formstep === 'getPlaylists') {
    const allVideos = db.videos || [];
    let userPlaylists = (db.playlists || []).filter(p => !p.userId || !userId || String(p.userId) === String(userId));

    if (userPlaylists.length === 0) {
      // Provide default categorized user playlists for rich experience
      userPlaylists = [
        {
          id: 'pl-1',
          playlist_id: 'pl-1',
          name: 'Full Stack Web Development Essentials',
          title: 'Full Stack Web Development Essentials',
          playlist_name: 'Full Stack Web Development Essentials',
          description: 'Curated list of lessons for mastering React, Node.js, and Modern Web Architecture.',
          thumbnail: allVideos[0]?.thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60',
          image: allVideos[0]?.thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60',
          video_count: Math.min(allVideos.length, 4),
          videos_count: Math.min(allVideos.length, 4),
          videos: allVideos.slice(0, 4).map(v => ({
            ...v,
            video_id: v.id,
            video_title: v.title
          })),
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'pl-2',
          playlist_id: 'pl-2',
          name: 'AI, Machine Learning & Data Science Toolkit',
          title: 'AI, Machine Learning & Data Science Toolkit',
          playlist_name: 'AI, Machine Learning & Data Science Toolkit',
          description: 'Deep dive into neural networks, transformer pipelines, and data processing.',
          thumbnail: allVideos[1]?.thumbnail || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60',
          image: allVideos[1]?.thumbnail || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60',
          video_count: Math.min(allVideos.length, 3),
          videos_count: Math.min(allVideos.length, 3),
          videos: (allVideos.length > 2 ? allVideos.slice(2, 5) : allVideos).map(v => ({
            ...v,
            video_id: v.id,
            video_title: v.title
          })),
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'pl-3',
          playlist_id: 'pl-3',
          name: 'Cloud Computing & DevOps Mastery',
          title: 'Cloud Computing & DevOps Mastery',
          playlist_name: 'Cloud Computing & DevOps Mastery',
          description: 'Best practices for Docker, Kubernetes, CI/CD, and Cloud Infrastructure.',
          thumbnail: allVideos[2]?.thumbnail || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60',
          image: allVideos[2]?.thumbnail || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60',
          video_count: Math.min(allVideos.length, 2),
          videos_count: Math.min(allVideos.length, 2),
          videos: (allVideos.length > 1 ? allVideos.slice(1, 3) : allVideos).map(v => ({
            ...v,
            video_id: v.id,
            video_title: v.title
          })),
          created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }

    return res.json({
      success: true,
      formstep: 'getPlayList',
      playlists: userPlaylists,
      data: userPlaylists,
      result: userPlaylists
    });
  }

  // --- WATCH HISTORY API (vdUser: formstep = getWatchHistory) ---
  if (formstep === 'getWatchHistory' || formstep === 'watchHistory' || formstep === 'get_watch_history') {
    const rawHistory = (db.watchHistory || []).filter(h => !userId || !h.userId || String(h.userId) === String(userId));
    const allVideos = db.videos || [];

    const enrichedHistory = rawHistory.map(h => {
      const video = allVideos.find(v => String(v.id) === String(h.videoId)) || {};
      return {
        id: h.id,
        history_id: h.id,
        video_id: h.videoId || video.id,
        videoId: h.videoId || video.id,
        title: h.title || video.title || 'Untitled Video Lesson',
        video_title: h.title || video.title || 'Untitled Video Lesson',
        thumbnail: h.thumbnail || video.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60',
        duration: h.duration || video.duration || '12:45',
        category: h.category || video.category || 'General',
        course_id: h.course_id || h.courseId || 0,
        chapter_id: h.chapter_id || h.chapterId || 0,
        course_title: h.course_title || h.courseTitle || '',
        chapter_title: h.chapter_title || h.chapterTitle || '',
        watch_time: h.watchTime || 0,
        watchTime: h.watchTime || 0,
        last_position: h.lastPosition || 0,
        lastPosition: h.lastPosition || 0,
        completion_percentage: h.completionPercentage || 0,
        completionPercentage: h.completionPercentage || 0,
        status: h.status || 'in_progress',
        watched_at: h.watchDate || new Date().toISOString(),
        watchDate: h.watchDate || new Date().toISOString(),
        views: h.views || 1
      };
    }).sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));

    return res.json({
      success: true,
      formstep: 'getWatchHistory',
      watchHistory: enrichedHistory,
      history: enrichedHistory,
      data: enrichedHistory,
      result: enrichedHistory
    });
  }

  // --- ADD TO PLAYLIST API (vdUser: formstep = addPlaylist) ---
  if (formstep === 'addPlaylist' || formstep === 'addToPlaylist' || formstep === 'addPlayList') {
    const videoId = req.body.video_id || req.body.videoId || req.body.id;
    const title = req.body.title || req.body.video_title || '';
    const thumbnail = req.body.thumbnail || req.body.thumnail || req.body.image || '';
    const videoUrl = req.body.video_url || req.body.videoUrl || req.body.url || '';

    if (!videoId && !title) {
      return res.status(400).json({ success: false, message: 'Video ID or Title is required.' });
    }

    if (!db.playlists) {
      db.playlists = [];
    }

    // Find default or first playlist for user, or create one
    let targetPlaylist = db.playlists.find(p => (!userId || !p.userId || String(p.userId) === String(userId)));
    if (!targetPlaylist) {
      targetPlaylist = {
        id: `pl-${Date.now()}`,
        playlist_id: `pl-${Date.now()}`,
        userId: userId || 'u-user1',
        name: 'My Saved Playlist',
        title: 'My Saved Playlist',
        playlist_name: 'My Saved Playlist',
        description: 'Videos saved by user.',
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60',
        video_count: 0,
        videos_count: 0,
        videos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.playlists.push(targetPlaylist);
    }

    if (!Array.isArray(targetPlaylist.videos)) {
      targetPlaylist.videos = [];
    }

    const alreadyExists = targetPlaylist.videos.some(v => String(v.id || v.video_id) === String(videoId));
    if (alreadyExists) {
      return res.status(431).json({
        success: false,
        status: 431,
        statusCode: 431,
        message: 'Video is already in playlist.'
      });
    }

    targetPlaylist.videos.push({
      id: videoId,
      video_id: videoId,
      title: title,
      video_title: title,
      thumbnail: thumbnail,
      video_url: videoUrl,
      videoUrl: videoUrl,
      added_at: new Date().toISOString()
    });
    targetPlaylist.video_count = targetPlaylist.videos.length;
    targetPlaylist.videos_count = targetPlaylist.videos.length;
    targetPlaylist.updated_at = new Date().toISOString();

    writeDB(db);

    return res.json({
      success: true,
      status: 200,
      statusCode: 200,
      formstep: 'addPlaylist',
      message: 'Video has been added to playlist.',
      playlist: targetPlaylist
    });
  }

  // --- GET ALL CATEGORIES API (vdUser: formstep = getAllCategories) ---
  if (formstep === 'getAllCategories' || formstep === 'getCategories') {
    const rawCategories = db.categories || [];
    const allVideos = db.videos || [];

    const defaultIcons = ['💻', '🤖', '⚛️', '📱', '☁️', '🧠', '🎨', '🚀', '📊', '🔒'];
    const enrichedCategories = rawCategories.map((c, idx) => {
      const catName = c.name || c.title || c.category_name || '';
      const videoCount = allVideos.filter(v => 
        String(v.category || '').toLowerCase() === catName.toLowerCase() ||
        String(v.categoryId || v.category_id || '') === String(c.id)
      ).length;

      const iconEmoji = c.icon && !c.icon.startsWith('http') && !c.icon.startsWith('fa') 
        ? c.icon 
        : defaultIcons[idx % defaultIcons.length];

      return {
        id: c.id || `cat-${idx + 1}`,
        category_id: c.id || `cat-${idx + 1}`,
        name: catName,
        title: catName,
        category_name: catName,
        description: c.description || c.desc || `Explore courses and lessons in ${catName}.`,
        icon: iconEmoji,
        icon_url: c.icon_url || c.thumbnail || '',
        video_count: c.video_count !== undefined ? c.video_count : videoCount,
        videoCount: c.video_count !== undefined ? c.video_count : videoCount,
        sub_categories: c.sub_categories || c.subCategories || []
      };
    });

    return res.json({
      success: true,
      formstep: 'getAllCategories',
      categories: enrichedCategories,
      data: enrichedCategories,
      result: enrichedCategories
    });
  }

  // --- GET SUB CATEGORIES API (vdUser: formstep = getSubCategory) ---
  if (formstep === 'getSubCategory' || formstep === 'getSubCategories' || formstep === 'subcategory') {
    const rawCategories = db.categories || [];
    const catId = req.body.category_id || req.body.categoryId || req.body.cat_id || req.body.id || req.body.category;
    const cat = rawCategories.find(c => 
      String(c.id).toLowerCase() === String(catId).toLowerCase() ||
      String(c.name).toLowerCase() === String(catId).toLowerCase()
    );
    const subCats = (cat && cat.sub_categories) ? cat.sub_categories : [];
    return res.json({
      success: true,
      formstep: 'getSubCategory',
      sub_categories: subCats,
      data: subCats,
      result: subCats
    });
  }

  return res.json({ success: true, message: 'vdUser processed' });
};

app.post('/vdUser', handleVdUser);
app.post('/api/vdUser', handleVdUser);
app.post('/webhook/vdUser', handleVdUser);

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

app.all(['/api/admin/report', '/vdadmin/report', '/api/vdadmin/report'], (req, res) => {
  const body = req.body || {};
  const formstep = body.formstep || req.query.formstep || 'course_analytics';

  if (formstep === 'course_analytics') {
    return res.json([
      {
        course_name: 'Java Fundamentals & OOP',
        enrolled: 1420,
        completed_count: 980,
        complete_percentage: '69%',
        avg_watch_time: '4h 15m',
        drop_off: '12%',
        status: 'Active'
      },
      {
        course_name: 'React 18 Masterclass',
        enrolled: 2100,
        completed_count: 1750,
        complete_percentage: '83%',
        avg_watch_time: '6h 40m',
        drop_off: '8%',
        status: 'Active'
      },
      {
        course_name: 'Spring Boot Microservices',
        enrolled: 890,
        completed_count: 540,
        complete_percentage: '60%',
        avg_watch_time: '5h 10m',
        drop_off: '18%',
        status: 'Active'
      },
      {
        course_name: 'Python for Data Science',
        enrolled: 1650,
        completed_count: 1210,
        complete_percentage: '73%',
        avg_watch_time: '3h 50m',
        drop_off: '15%',
        status: 'Active'
      }
    ]);
  } else if (formstep === 'engagement_analytics') {
    return res.json([
      {
        course_name: 'Java Fundamentals & OOP',
        views: 12450,
        watch_time: '185h 30m',
        complete_percentage: '74%',
        most_viewed: 'OOP Concepts & Inheritance',
        least_viewed: 'Generics & Wildcards',
        downloads: 320
      },
      {
        course_name: 'React 18 Masterclass',
        views: 28900,
        watch_time: '412h 15m',
        complete_percentage: '86%',
        most_viewed: 'UseState & UseEffect Hooks',
        least_viewed: 'Custom Hooks Deep Dive',
        downloads: 850
      },
      {
        course_name: 'Spring Boot Microservices',
        views: 9400,
        watch_time: '130h 45m',
        complete_percentage: '62%',
        most_viewed: 'REST API Controller Setup',
        least_viewed: 'Circuit Breaker Pattern',
        downloads: 210
      },
      {
        course_name: 'Python for Data Science',
        views: 18200,
        watch_time: '240h 10m',
        complete_percentage: '78%',
        most_viewed: 'Pandas DataFrames',
        least_viewed: 'Scikit-learn Regressors',
        downloads: 540
      }
    ]);
  } else if (formstep === 'user_analytics') {
    return res.json([
      {
        user_name: 'Rahul Sharma',
        login_frequency: 'Daily (24 days/mo)',
        last_login: '2026-08-03 10:15 AM',
        avg_session: '42 min',
        watch_time: '38h 20m',
        course_completed: 4,
        incomplete_course: 1,
        last_accessed_course: 'React 18 Masterclass',
        status: 'Active'
      },
      {
        user_name: 'Priya Patel',
        login_frequency: '3-4 times/week',
        last_login: '2026-08-02 04:30 PM',
        avg_session: '28 min',
        watch_time: '22h 15m',
        course_completed: 2,
        incomplete_course: 2,
        last_accessed_course: 'Java Fundamentals & OOP',
        status: 'Active'
      },
      {
        user_name: 'Amit Verma',
        login_frequency: 'Weekly',
        last_login: '2026-07-29 11:00 AM',
        avg_session: '15 min',
        watch_time: '9h 40m',
        course_completed: 1,
        incomplete_course: 3,
        last_accessed_course: 'Python for Data Science',
        status: 'Inactive'
      },
      {
        user_name: 'Sneha Reddy',
        login_frequency: 'Daily (28 days/mo)',
        last_login: '2026-08-03 11:45 AM',
        avg_session: '55 min',
        watch_time: '64h 00m',
        course_completed: 6,
        incomplete_course: 0,
        last_accessed_course: 'Spring Boot Microservices',
        status: 'Active'
      }
    ]);
  }

  res.json([]);
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

// 9. AI Video Copilot Endpoint
app.post('/api/ai/ask', (req, res) => {
  const { query, timestamp, videoTitle, chapterTitle, surroundingText, language } = req.body;
  
  const timeFormatted = typeof timestamp === 'number' 
    ? `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`
    : (timestamp || 'current time');

  // Intelligent Context Synthesis
  let answer = "";
  const lang = (language || 'en').toLowerCase();
  const cleanQuery = (query || '').toLowerCase().trim();

  if (cleanQuery.includes('summarize') || cleanQuery.includes('summary')) {
    if (lang === 'hi') {
      answer = `📌 **समय ${timeFormatted} का सारांश:**\n\nइस भाग में, प्रशिक्षक "${chapterTitle || videoTitle || 'पाठ'}" के मुख्य अवधारणाओं पर चर्चा कर रहे हैं।\n\n• **मुख्य बिंदु:** ${surroundingText ? surroundingText.slice(0, 180) + '...' : 'पाठ के मुख्य चरण और व्यावहारिक तकनीकें।'}\n• **अभ्यास:** इन सिद्धांतों को दोहराएं और अगले खंड पर आगे बढ़ें।`;
    } else if (lang === 'kn') {
      answer = `📌 **ಸಮಯ ${timeFormatted} ರ ಸಾರಾಂಶ:**\n\nಈ ವಿಭಾಗದಲ್ಲಿ, ಬೋಧಕರು "${chapterTitle || videoTitle || 'ಪಾಠ'}" ದ ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ವಿವರಿಸುತ್ತಿದ್ದಾರೆ.\n\n• **ಪ್ರಮುಖ ಅಂಶಗಳು:** ${surroundingText ? surroundingText.slice(0, 180) + '...' : 'ಪಾಠದ ಪ್ರಮುಖ ಹಂತಗಳು ಮತ್ತು ಪ್ರಾಯೋಗಿಕ ತಂತ್ರಗಳು.'}\n• **ಅಭ್ಯಾಸ:** ಈ ತತ್ವಗಳನ್ನು ಪುನರಾವರ್ತಿಸಿ ಮತ್ತು ಮುಂದಿನ ಅಧ್ಯಾಯಕ್ಕೆ ಸಾಗಿ.`;
    } else {
      answer = `📌 **Summary at ${timeFormatted}:**\n\nIn this section of "${chapterTitle || videoTitle || 'this lesson'}", the instructor highlights the core fundamentals:\n\n• **Key Takeaway:** ${surroundingText ? surroundingText.slice(0, 200) + '...' : 'Understanding the architectural flow and applying it step-by-step.'}\n• **Action Item:** Make sure to review this timestamp if you are taking the upcoming chapter quiz!`;
    }
  } else if (cleanQuery.includes('analogy') || cleanQuery.includes('example')) {
    answer = `💡 **Real-World Analogy (Timestamp ${timeFormatted}):**\n\nThink of this concept like an airport baggage routing system. Instead of checking every suitcase manually, the conveyor uses unique barcodes (indexes) to instantly route bags to the right flight without delay.\n\nHere, "${chapterTitle || videoTitle || 'the concept'}" operates on the exact same logic—organizing data flow so processing stays fast and predictable!`;
  } else if (cleanQuery.includes('hindi') || cleanQuery.includes('हिंदी')) {
    answer = `🌐 **हिंदी में स्पष्टीकरण (समय ${timeFormatted}):**\n\nइस समय प्रशिक्षक समझा रहे हैं:\n"${surroundingText ? surroundingText.slice(0, 220) : 'इस विषय की मुख्य प्रक्रिया और इसके व्यावहारिक उपयोग।'}"\n\nसरल शब्दों में: यह विधि जटिल कार्यों को छोटे, आसान चरणों में विभाजित करके उन्हें कुशलतापूर्वक पूरा करने में मदद करती है।`;
  } else if (cleanQuery.includes('kannada') || cleanQuery.includes('ಕನ್ನಡ')) {
    answer = `🌐 **ಕನ್ನಡ ವಿವರಣೆ (ಸಮಯ ${timeFormatted}):**\n\nಈ ಸಮಯದಲ್ಲಿ ಬೋಧಕರು ವಿವರಿಸುತ್ತಿದ್ದಾರೆ:\n"${surroundingText ? surroundingText.slice(0, 220) : 'ಈ ವಿಷಯದ ಪ್ರಮುಖ ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ಪ್ರಾಯೋಗಿಕ ಬಳಕೆ.'}"\n\nಸರಳವಾಗಿ ಹೇಳುವುದಾದರೆ: ಈ ತಂತ್ರಜ್ಞಾನವು ಸಂಕೀರ್ಣ ಕೆಲಸಗಳನ್ನು ಸಣ್ಣ, ಸುಲಭ ಹಂತಗಳಾಗಿ ವಿಂಗಡಿಸಿ ತ್ವರಿತವಾಗಿ ಪೂರ್ಣಗೊಳಿಸಲು ನೆರವಾಗುತ್ತದೆ.`;
  } else if (cleanQuery.includes('quiz') || cleanQuery.includes('test')) {
    answer = `🎯 **Quick Checkpoint Question for ${timeFormatted}:**\n\n**Q:** In "${chapterTitle || videoTitle || 'this concept'}", what is the primary purpose of the technique demonstrated around this timestamp?\n\nA) To increase redundancy\nB) To optimize execution and prevent bottlenecks (Correct)\nC) To bypass validation\n\n*Review this section to prepare for the end-of-chapter assessment!*`;
  } else {
    answer = `🤖 **Explanation at ${timeFormatted}:**\n\n${surroundingText ? `Around this moment, the instructor explains: "*${surroundingText.slice(0, 250)}...*"` : `Here the instructor focuses on **${chapterTitle || videoTitle || 'the lesson concept'}**.`}\n\n**Core Insight:**\n1. This step establishes the essential foundation for subsequent chapters.\n2. Notice how this directly influences performance and error-free execution.\n\n*Tip: Click the timestamp button to replay this exact segment.*`;
  }

  res.json({
    answer,
    timestamp: timeFormatted,
    rawTimestamp: timestamp,
    chapter: chapterTitle || videoTitle
  });
});

// ==========================================
// 10. Real-Time Virtual Study Rooms & Watch Party
// ==========================================

const studyRooms = new Map();

// Seed initial active study rooms for discovery
studyRooms.set('STUDY-REACT', {
  id: 'STUDY-REACT',
  title: 'React Hooks & State Group Revision',
  courseId: '1',
  courseTitle: 'Full Stack Web Development with React & Node',
  videoId: 'v-1',
  thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
  hostName: 'Rahul Verma',
  hostId: 'u-101',
  members: [
    { id: 'u-101', name: 'Rahul Verma', avatar: '👨‍💻', isHost: true },
    { id: 'u-102', name: 'Priya Sharma', avatar: '👩‍💻', isHost: false }
  ],
  currentTime: 120,
  isPlaying: false,
  messages: [
    { id: 1, sender: 'Rahul Verma', text: 'Hey Priya, let us review the useEffect hook dependencies section!', timestamp: 60, timeStr: '10:15 AM' },
    { id: 2, sender: 'Priya Sharma', text: 'Yes! Timestamp 02:45 is where the cleanup function is explained.', timestamp: 120, timeStr: '10:16 AM' }
  ],
  createdAt: Date.now()
});

studyRooms.set('STUDY-PYTHON', {
  id: 'STUDY-PYTHON',
  title: 'Python for Beginners - Weekend Study Circle',
  courseId: '2',
  courseTitle: 'Complete Python Bootcamp 2026',
  videoId: 'v-2',
  thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
  hostName: 'Amit Patel',
  hostId: 'u-201',
  members: [
    { id: 'u-201', name: 'Amit Patel', avatar: '🚀', isHost: true },
    { id: 'u-202', name: 'Sneha Rao', avatar: '✨', isHost: false },
    { id: 'u-203', name: 'Deepak Joshi', avatar: '🎯', isHost: false }
  ],
  currentTime: 45,
  isPlaying: true,
  messages: [
    { id: 1, sender: 'Amit Patel', text: 'Starting the list comprehensions demo now.', timestamp: 30, timeStr: '11:00 AM' }
  ],
  createdAt: Date.now()
});

// REST: Get all active study rooms
app.get('/api/study-rooms', (req, res) => {
  const rooms = [];
  studyRooms.forEach((room) => {
    rooms.push({
      id: room.id,
      title: room.title,
      courseId: room.courseId,
      courseTitle: room.courseTitle,
      videoId: room.videoId,
      thumbnail: room.thumbnail,
      hostName: room.hostName,
      membersCount: room.members.length,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      createdAt: room.createdAt
    });
  });
  res.json(rooms);
});

// REST: Create a study room
app.post('/api/study-rooms/create', (req, res) => {
  const { title, courseId, courseTitle, videoId, thumbnail, userName, userId } = req.body;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const roomId = `STUDY-${randomSuffix}`;

  const newRoom = {
    id: roomId,
    title: title || `Study Room: ${courseTitle || 'Lesson'}`,
    courseId: courseId || '1',
    courseTitle: courseTitle || 'Course',
    videoId: String(videoId || '1'),
    thumbnail: thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
    hostName: userName || 'Learner',
    hostId: userId || 'u-guest',
    members: [{ id: userId || 'u-guest', name: userName || 'Learner', isHost: true }],
    currentTime: 0,
    isPlaying: false,
    messages: [
      { id: Date.now(), sender: 'System', text: `Welcome to study room ${roomId}! Play, pause, or seek will synchronize for all members.`, timestamp: 0, timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ],
    createdAt: Date.now()
  };

  studyRooms.set(roomId, newRoom);
  res.json({ success: true, room: newRoom, roomId });
});

// REST: Get single room details
app.get('/api/study-rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = studyRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ message: "Study room not found or expired" });
  }
  res.json(room);
});

// ==========================================
// VIRTUAL CLASS ROOM & LIVE WEBCASTS SYSTEM
// ==========================================
const liveClasses = new Map();

// Pre-seed realistic live webcasts
liveClasses.set('LIVE-101', {
  id: 'LIVE-101',
  title: 'Masterclass: Modern Full-Stack AI & Cloud Architecture',
  instructor: 'Dr. Alice Carter',
  instructorRole: 'Lead Architect @ XLurn',
  category: 'Technology',
  status: 'live',
  scheduledAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  durationMinutes: 60,
  streamUrl: '/uploads/video-1783335443739-730573726.mp4',
  thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  description: 'Deep dive into real-time collaborative state, WebSocket architectures, React 19 Server Actions, and deploying intelligent agent workflows.',
  attendeesCount: 42,
  attendees: [
    { id: 'u-1', name: 'Surya', avatar: '👨‍💻' },
    { id: 'u-2', name: 'Rohan Sharma', avatar: '🧑‍🎓' },
    { id: 'u-3', name: 'Ananya Roy', avatar: '👩‍💻' }
  ],
  handRaises: [
    { id: 'hr-1', studentId: 'u-2', studentName: 'Rohan Sharma', avatar: '🧑‍🎓', time: '11:15 AM' }
  ],
  activePoll: {
    id: 'poll-101',
    question: 'Which WebSocket client architecture do you prefer for real-time apps?',
    options: [
      { id: 'opt-1', text: 'Native WebSocket with Heartbeat', votes: 18 },
      { id: 'opt-2', text: 'Socket.IO / Engine.IO', votes: 15 },
      { id: 'opt-3', text: 'GraphQL Subscriptions / SSE', votes: 9 }
    ],
    totalVotes: 42,
    status: 'active'
  },
  chatMessages: [
    { id: 1, sender: 'Dr. Alice Carter', role: 'instructor', text: 'Welcome everyone! We are live. Feel free to ask questions in the chat or raise your hand ✋.', timestamp: Date.now() - 14 * 60 * 1000, timeStr: '11:01 AM' },
    { id: 2, sender: 'Rohan Sharma', role: 'student', text: 'Excited for today’s session! Audio and video are crystal clear.', timestamp: Date.now() - 10 * 60 * 1000, timeStr: '11:05 AM' },
    { id: 3, sender: 'Ananya Roy', role: 'student', text: 'Can we discuss error handling with disconnected sockets later?', timestamp: Date.now() - 5 * 60 * 1000, timeStr: '11:10 AM' }
  ]
});

liveClasses.set('LIVE-102', {
  id: 'LIVE-102',
  title: 'Quantum Computing: Qubits, Superposition & Post-Quantum Crypto',
  instructor: 'Prof. Vikram Sen',
  instructorRole: 'Quantum Research Fellow',
  category: 'Science',
  status: 'upcoming',
  scheduledAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
  durationMinutes: 90,
  streamUrl: '/uploads/video-1783160868201-113435163.mp4',
  thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
  description: 'Explore quantum gates, Bloch spheres, entanglement, and how quantum key distribution is revolutionizing cybersecurity.',
  attendeesCount: 28,
  attendees: [],
  handRaises: [],
  activePoll: null,
  chatMessages: []
});

liveClasses.set('LIVE-103', {
  id: 'LIVE-103',
  title: 'UI/UX Design Systems & Motion Physics Workshop',
  instructor: 'Sarah Jenkins',
  instructorRole: 'Principal UX Director',
  category: 'Design',
  status: 'completed',
  scheduledAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  durationMinutes: 75,
  streamUrl: '/uploads/video-1783335443739-730573726.mp4',
  thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800',
  description: 'Recorded session: crafting cohesive design tokens, fluid spring physics, and accessible contrast patterns.',
  attendeesCount: 94,
  attendees: [],
  handRaises: [],
  activePoll: null,
  chatMessages: []
});

// REST: Get all live classes
app.get('/api/live-classes', (req, res) => {
  const classesList = [];
  liveClasses.forEach((cls) => {
    classesList.push({
      id: cls.id,
      title: cls.title,
      instructor: cls.instructor,
      instructorRole: cls.instructorRole,
      category: cls.category,
      status: cls.status,
      scheduledAt: cls.scheduledAt,
      durationMinutes: cls.durationMinutes,
      thumbnail: cls.thumbnail,
      attendeesCount: cls.attendeesCount,
      description: cls.description,
      streamUrl: cls.streamUrl,
      hasActivePoll: !!cls.activePoll,
      handRaisesCount: cls.handRaises ? cls.handRaises.length : 0
    });
  });
  res.json(classesList);
});

// REST: Get single live class details
app.get('/api/live-classes/:id', (req, res) => {
  const { id } = req.params;
  const cls = liveClasses.get(id);
  if (!cls) {
    return res.status(404).json({ message: "Live classroom session not found" });
  }
  res.json(cls);
});

// REST: Create new live class
app.post('/api/live-classes/create', (req, res) => {
  const { title, instructor, instructorRole, category, scheduledAt, durationMinutes, description, streamUrl, thumbnail } = req.body;
  const newId = `LIVE-${Math.floor(100 + Math.random() * 900)}`;
  const newClass = {
    id: newId,
    title: title || 'New Live Webcast',
    instructor: instructor || 'Admin Instructor',
    instructorRole: instructorRole || 'Instructor',
    category: category || 'Technology',
    status: 'upcoming',
    scheduledAt: scheduledAt || new Date().toISOString(),
    durationMinutes: Number(durationMinutes) || 60,
    thumbnail: thumbnail || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    description: description || 'Interactive live session with real-time Q&A and polls.',
    streamUrl: streamUrl || '/uploads/video-1783335443739-730573726.mp4',
    attendeesCount: 0,
    attendees: [],
    handRaises: [],
    activePoll: null,
    chatMessages: []
  };

  liveClasses.set(newId, newClass);
  res.json({ success: true, liveClass: newClass });
});

// REST: Update class status
app.put('/api/live-classes/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const cls = liveClasses.get(id);
  if (!cls) return res.status(404).json({ message: "Class not found" });

  cls.status = status;
  broadcastToLiveClass(id, {
    type: 'CLASS_STATUS_CHANGED',
    status: cls.status,
    classId: id
  });

  res.json({ success: true, liveClass: cls });
});

// REST: Launch a poll
app.post('/api/live-classes/:id/poll', (req, res) => {
  const { id } = req.params;
  const { question, options } = req.body;
  const cls = liveClasses.get(id);
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const pollId = `poll-${Date.now()}`;
  const formattedOptions = (options || []).map((opt, idx) => ({
    id: `opt-${idx + 1}`,
    text: typeof opt === 'string' ? opt : opt.text,
    votes: 0
  }));

  cls.activePoll = {
    id: pollId,
    question,
    options: formattedOptions,
    totalVotes: 0,
    status: 'active'
  };

  broadcastToLiveClass(id, {
    type: 'POLL_LAUNCHED',
    poll: cls.activePoll
  });

  res.json({ success: true, poll: cls.activePoll });
});

// REST: Vote on poll
app.post('/api/live-classes/:id/poll/vote', (req, res) => {
  const { id } = req.params;
  const { optionId } = req.body;
  const cls = liveClasses.get(id);
  if (!cls || !cls.activePoll) return res.status(404).json({ message: "Active poll not found" });

  const opt = cls.activePoll.options.find(o => o.id === optionId);
  if (opt) {
    opt.votes += 1;
    cls.activePoll.totalVotes += 1;
    broadcastToLiveClass(id, {
      type: 'POLL_UPDATED',
      poll: cls.activePoll
    });
  }

  res.json({ success: true, poll: cls.activePoll });
});

// Create HTTP server and bind WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map to track client socket -> { roomId, classId, user }
const socketClients = new Map();

function broadcastToRoom(roomId, data, excludeWs = null) {
  const json = JSON.stringify(data);
  for (const [clientWs, clientMeta] of socketClients.entries()) {
    if (clientMeta.roomId === roomId && clientWs.readyState === WebSocket.OPEN && clientWs !== excludeWs) {
      clientWs.send(json);
    }
  }
}

function broadcastToLiveClass(classId, data, excludeWs = null) {
  const json = JSON.stringify(data);
  for (const [clientWs, clientMeta] of socketClients.entries()) {
    if (clientMeta.classId === classId && clientWs.readyState === WebSocket.OPEN && clientWs !== excludeWs) {
      clientWs.send(json);
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw);
      const { type, roomId, classId, user, action, time, text, optionId, poll } = data;
      const clientInfo = socketClients.get(ws) || {};
      const targetRoomId = roomId || clientInfo.roomId;
      const targetClassId = classId || clientInfo.classId;
      const clientUser = user || clientInfo.user || {};
      const senderName = clientUser.username || clientUser.name || 'Peer';
      const effectiveTime = typeof time === 'number' ? time : (typeof data.currentTime === 'number' ? data.currentTime : 0);

      // ==========================
      // LIVE CLASSROOM WS HANDLERS
      // ==========================
      if (type === 'JOIN_LIVE_CLASS') {
        const cls = liveClasses.get(targetClassId);
        if (cls) {
          socketClients.set(ws, { ...clientInfo, classId: targetClassId, user: clientUser });
          cls.attendeesCount = Math.max(cls.attendeesCount, (cls.attendees ? cls.attendees.length : 0) + 1);

          // Add to attendees list if user info present
          if (clientUser && clientUser.id) {
            cls.attendees = cls.attendees || [];
            if (!cls.attendees.some(a => String(a.id) === String(clientUser.id))) {
              cls.attendees.push({
                id: clientUser.id,
                name: senderName,
                avatar: clientUser.avatar || '🧑‍🎓',
                role: clientUser.role || 'student'
              });
            }
          }

          // Send current state to newly joined member
          ws.send(JSON.stringify({
            type: 'LIVE_CLASS_STATE',
            classId: cls.id,
            liveClass: cls
          }));

          // Broadcast attendee count
          broadcastToLiveClass(targetClassId, {
            type: 'ATTENDEE_UPDATE',
            attendeesCount: cls.attendeesCount,
            attendees: cls.attendees,
            message: `${senderName} joined the live webcast.`
          });
        }
      }

      else if (type === 'LIVE_CHAT_MESSAGE') {
        const cls = liveClasses.get(targetClassId);
        if (cls) {
          const chatMsg = {
            id: Date.now(),
            sender: senderName,
            role: clientUser.role || 'student',
            avatar: clientUser.avatar || '',
            text: text || data.message || '',
            timestamp: Date.now(),
            timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          cls.chatMessages = cls.chatMessages || [];
          cls.chatMessages.push(chatMsg);
          broadcastToLiveClass(targetClassId, {
            type: 'LIVE_CHAT_MESSAGE',
            message: chatMsg
          });
        }
      }

      else if (type === 'RAISE_HAND') {
        const cls = liveClasses.get(targetClassId);
        if (cls) {
          cls.handRaises = cls.handRaises || [];
          const existing = cls.handRaises.find(h => String(h.studentId) === String(clientUser.id));
          if (!existing) {
            const handItem = {
              id: `hr-${Date.now()}`,
              studentId: clientUser.id || `u-${Date.now()}`,
              studentName: senderName,
              avatar: clientUser.avatar || '✋',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            cls.handRaises.push(handItem);
            broadcastToLiveClass(targetClassId, {
              type: 'HAND_QUEUE_UPDATED',
              handRaises: cls.handRaises,
              latest: handItem,
              message: `${senderName} raised a hand ✋`
            });
          }
        }
      }

      else if (type === 'LOWER_HAND') {
        const cls = liveClasses.get(targetClassId);
        if (cls) {
          const targetStudentId = data.studentId || clientUser.id;
          cls.handRaises = (cls.handRaises || []).filter(h => String(h.studentId) !== String(targetStudentId));
          broadcastToLiveClass(targetClassId, {
            type: 'HAND_QUEUE_UPDATED',
            handRaises: cls.handRaises
          });
        }
      }

      else if (type === 'LAUNCH_POLL') {
        const cls = liveClasses.get(targetClassId);
        if (cls && poll) {
          cls.activePoll = {
            id: `poll-${Date.now()}`,
            question: poll.question,
            options: (poll.options || []).map((o, i) => ({
              id: `opt-${i + 1}`,
              text: typeof o === 'string' ? o : o.text,
              votes: 0
            })),
            totalVotes: 0,
            status: 'active'
          };
          broadcastToLiveClass(targetClassId, {
            type: 'POLL_LAUNCHED',
            poll: cls.activePoll
          });
        }
      }

      else if (type === 'VOTE_POLL') {
        const cls = liveClasses.get(targetClassId);
        if (cls && cls.activePoll) {
          const opt = cls.activePoll.options.find(o => o.id === optionId);
          if (opt) {
            opt.votes += 1;
            cls.activePoll.totalVotes += 1;
            broadcastToLiveClass(targetClassId, {
              type: 'POLL_UPDATED',
              poll: cls.activePoll
            });
          }
        }
      }

      else if (type === 'CLOSE_POLL') {
        const cls = liveClasses.get(targetClassId);
        if (cls && cls.activePoll) {
          cls.activePoll.status = 'closed';
          broadcastToLiveClass(targetClassId, {
            type: 'POLL_CLOSED',
            poll: cls.activePoll
          });
        }
      }

      // ==========================
      // LIVE WEBRTC BROADCAST SIGNALING
      // ==========================
      else if (type === 'REQUEST_STREAM' || type === 'WEBRTC_OFFER' || type === 'WEBRTC_ANSWER' || type === 'WEBRTC_ICE_CANDIDATE' || type === 'BROADCASTER_READY' || type === 'BROADCASTER_STOPPED') {
        if (data.to) {
          // Route message directly to the target socket
          for (const [clientWs, clientMeta] of socketClients.entries()) {
            if (clientWs.readyState === WebSocket.OPEN && clientMeta.user && String(clientMeta.user.id) === String(data.to)) {
              clientWs.send(JSON.stringify(data));
              break;
            }
          }
        } else {
          // Broadcast to everyone in this live classroom session (excluding sender)
          broadcastToLiveClass(targetClassId, data, ws);
        }
      }

      // ==========================
      // STUDY ROOM WS HANDLERS
      // ==========================
      else if (type === 'JOIN_ROOM') {
        const room = studyRooms.get(targetRoomId);
        if (room) {
          socketClients.set(ws, { ...clientInfo, roomId: targetRoomId, user: clientUser });
          // Check if already in member list
          const existingIdx = room.members.findIndex(m => String(m.id) === String(clientUser.id));
          if (existingIdx === -1) {
            room.members.push({ 
              id: clientUser.id || Date.now(), 
              name: senderName, 
              username: senderName, 
              isHost: room.members.length === 0 
            });
          }

          // Send current state and chat history to the newly joined peer
          ws.send(JSON.stringify({
            type: 'ROOM_STATE',
            room: {
              id: room.id,
              roomId: room.id,
              title: room.title,
              currentTime: room.currentTime,
              isPlaying: room.isPlaying,
              activeMembers: room.members,
              members: room.members,
              chatMessages: room.messages,
              messages: room.messages
            }
          }));

          // Notify everyone in the room
          const joinNotification = {
            type: 'MEMBER_JOINED',
            user: clientUser,
            activeMembers: room.members,
            members: room.members,
            message: `${senderName} joined the study room.`
          };
          broadcastToRoom(targetRoomId, joinNotification);
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
        }
      }

      else if (type === 'SYNC_PLAY') {
        const room = studyRooms.get(targetRoomId);
        if (room) {
          room.isPlaying = true;
          room.currentTime = effectiveTime;
          broadcastToRoom(targetRoomId, {
            type: 'SYNC_PLAY',
            time: room.currentTime,
            currentTime: room.currentTime,
            senderName,
            user: clientUser
          }, ws); // exclude sender
        }
      }

      else if (type === 'SYNC_PAUSE') {
        const room = studyRooms.get(targetRoomId);
        if (room) {
          room.isPlaying = false;
          room.currentTime = effectiveTime;
          broadcastToRoom(targetRoomId, {
            type: 'SYNC_PAUSE',
            time: room.currentTime,
            currentTime: room.currentTime,
            senderName,
            user: clientUser
          }, ws); // exclude sender
        }
      }

      else if (type === 'SYNC_SEEK') {
        const room = studyRooms.get(targetRoomId);
        if (room) {
          room.currentTime = effectiveTime;
          broadcastToRoom(targetRoomId, {
            type: 'SYNC_SEEK',
            time: room.currentTime,
            currentTime: room.currentTime,
            senderName,
            user: clientUser
          }, ws); // exclude sender
        }
      }

      else if (type === 'CHAT_MESSAGE') {
        const room = studyRooms.get(targetRoomId);
        if (room) {
          const chatMsg = {
            id: Date.now(),
            sender: senderName,
            senderName,
            senderId: clientUser.id,
            text: text || data.message || '',
            timestamp: Date.now(),
            timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          room.messages.push(chatMsg);
          broadcastToRoom(targetRoomId, {
            type: 'CHAT_MESSAGE',
            message: chatMsg
          });
        }
      }
    } catch (err) {
      console.error('[WS Error]', err);
    }
  });

  ws.on('close', () => {
    const client = socketClients.get(ws);
    if (client) {
      const { roomId, classId, user } = client;
      if (roomId) {
        const room = studyRooms.get(roomId);
        if (room) {
          room.members = room.members.filter(m => String(m.id) !== String(user?.id));
          broadcastToRoom(roomId, {
            type: 'MEMBER_LEFT',
            user,
            activeMembers: room.members,
            members: room.members,
            message: `${user?.username || user?.name || 'A learner'} left the study room.`
          });
        }
      }
      if (classId) {
        const cls = liveClasses.get(classId);
        if (cls) {
          cls.attendeesCount = Math.max(0, cls.attendeesCount - 1);
          if (user && user.id && cls.attendees) {
            cls.attendees = cls.attendees.filter(a => String(a.id) !== String(user.id));
          }
          broadcastToLiveClass(classId, {
            type: 'ATTENDEE_UPDATE',
            attendeesCount: cls.attendeesCount,
            attendees: cls.attendees
          });
        }
      }
      socketClients.delete(ws);
    }
  });
});

// Start Server with WebSockets
server.listen(PORT, () => {
  console.log(`Mock Backend server & WebSockets running on http://localhost:${PORT}`);
});

