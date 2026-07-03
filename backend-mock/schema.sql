-- ============================================================================
-- SQL Database Schema Scripts for VPLAY STREAM Video Streaming Platform
-- Compatible with PostgreSQL (with JSONB support) and MySQL 8.0+
-- ============================================================================

-- 1. Create Categories Table
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT ''
);

-- Index for category name search
CREATE INDEX idx_categories_name ON categories(name);


-- 2. Create Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hashed with bcrypt
    mobile VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    avatar VARCHAR(255) DEFAULT '',
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    devices JSONB DEFAULT '[]'::jsonb -- Stores device agents and last login timestamps
);

-- Indexes for users login and roles
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_by ON users(created_by);


-- 3. Create Videos Table
CREATE TABLE videos (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100) NOT NULL REFERENCES categories(name) ON UPDATE CASCADE,
    thumbnail VARCHAR(255) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb, -- Stores array of string tags
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    uploaded_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_admins JSONB DEFAULT '[]'::jsonb, -- Stores array of admin user IDs
    views INT NOT NULL DEFAULT 0,
    duration INT NOT NULL DEFAULT 0, -- Duration in seconds
    rating DECIMAL(3, 2) DEFAULT 0.00,
    instructor VARCHAR(100) DEFAULT '',
    difficulty VARCHAR(20) DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced'))
);

-- Indexes for video searching and filtering
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX idx_videos_visibility ON videos(visibility);
CREATE INDEX idx_videos_views ON videos(views DESC);


-- 4. Create Watch History Table
CREATE TABLE watch_history (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id VARCHAR(50) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    watch_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    watch_time INT NOT NULL DEFAULT 0, -- Last position watched (seconds)
    last_position INT NOT NULL DEFAULT 0,
    completion_percentage INT NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    status VARCHAR(30) NOT NULL DEFAULT 'watched' CHECK (status IN ('unwatched', 'watched', 'partially_watched', 'completed'))
);

-- Indexes for watch history query performance
CREATE INDEX idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX idx_watch_history_video_id ON watch_history(video_id);
CREATE INDEX idx_watch_history_date ON watch_history(watch_date DESC);


-- 5. Create Favorites Table (Bookmarks)
CREATE TABLE favorites (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id VARCHAR(50) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

-- Index for user favorites search
CREATE INDEX idx_favorites_user_id ON favorites(user_id);


-- 6. Create Notifications Table
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for notifications retrieval
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);


-- 7. Create Reported Videos Table
CREATE TABLE reported_videos (
    id VARCHAR(50) PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    video_title VARCHAR(255) NOT NULL,
    reported_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved'))
);

CREATE INDEX idx_reported_videos_status ON reported_videos(status);
CREATE INDEX idx_reported_videos_video_id ON reported_videos(video_id);


-- 8. Create Subscription Plans Table
CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INT NOT NULL,
    features JSONB DEFAULT '[]'::jsonb -- List of featured strings included in the plan
);


-- 9. Create Transactions Table
CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100) NOT NULL,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    plan_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'refunded')),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    region VARCHAR(100) DEFAULT ''
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(date DESC);


-- 10. Create Live Streams Table
CREATE TABLE live_streams (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    admin_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    admin_name VARCHAR(100) NOT NULL,
    viewers INT DEFAULT 0,
    bitrate INT DEFAULT 0, -- kbps
    fps INT DEFAULT 30,
    errors INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ended'))
);

CREATE INDEX idx_live_streams_admin_id ON live_streams(admin_id);
CREATE INDEX idx_live_streams_status ON live_streams(status);


-- 11. Create Admin Activity Logs Table
CREATE TABLE admin_activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    admin_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    admin_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT '',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_date ON admin_activity_logs(timestamp DESC);


-- 12. Create Settings Table (Key-Value)
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL -- Stores configuration JSON structures dynamically
);
