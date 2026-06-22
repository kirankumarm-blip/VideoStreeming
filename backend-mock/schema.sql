-- SQL Database Schema Scripts for VPLAY STREAM Video Streaming Platform
-- Compatible with PostgreSQL (with JSONB support) and MySQL 8.0+ (standard modifications noted)

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
    duration INT NOT NULL DEFAULT 0 -- Duration in seconds
);

-- Indexes for video searching and filtering
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX idx_videos_visibility ON videos(visibility);


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


-- 5. Create Favorites Table
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
