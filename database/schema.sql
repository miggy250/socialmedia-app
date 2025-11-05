-- Social Media App Database Schema for MySQL/MariaDB (XAMPP)
-- Run this in phpMyAdmin or MySQL command line

CREATE DATABASE IF NOT EXISTS socialmedia_app;
USE socialmedia_app;

-- Users table (replaces Supabase auth.users)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE profiles (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Posts table
CREATE TABLE posts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_posts_user_id (user_id),
    INDEX idx_posts_created_at (created_at)
);

-- Comments table
CREATE TABLE comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_comments_post_id (post_id),
    INDEX idx_comments_user_id (user_id)
);

-- Likes table
CREATE TABLE likes (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (post_id, user_id),
    INDEX idx_likes_post_id (post_id),
    INDEX idx_likes_user_id (user_id)
);

-- Follows table
CREATE TABLE follows (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    follower_id VARCHAR(36) NOT NULL,
    following_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follows_follower (follower_id),
    INDEX idx_follows_following (following_id)
);

-- Messages table
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sender_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_receiver (receiver_id)
);

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read)
);

-- Hashtags table
CREATE TABLE hashtags (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hashtags_name (name)
);

-- Post hashtags junction table
CREATE TABLE post_hashtags (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    post_id VARCHAR(36) NOT NULL,
    hashtag_id VARCHAR(36) NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_post_hashtag (post_id, hashtag_id)
);

-- Saved posts table
CREATE TABLE saved_posts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    post_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_saved_post (user_id, post_id),
    INDEX idx_saved_posts_user (user_id),
    INDEX idx_saved_posts_post (post_id)
);

-- Stories table
CREATE TABLE stories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)),
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_stories_user (user_id),
    INDEX idx_stories_expires (expires_at)
);

-- Story views table
CREATE TABLE story_views (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    story_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_story_view (story_id, user_id),
    INDEX idx_story_views_story (story_id)
);

-- Triggers to update counts
DELIMITER //

-- Update post likes count
CREATE TRIGGER update_likes_count_insert
AFTER INSERT ON likes
FOR EACH ROW
BEGIN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
END//

CREATE TRIGGER update_likes_count_delete
AFTER DELETE ON likes
FOR EACH ROW
BEGIN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
END//

-- Update post comments count
CREATE TRIGGER update_comments_count_insert
AFTER INSERT ON comments
FOR EACH ROW
BEGIN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
END//

CREATE TRIGGER update_comments_count_delete
AFTER DELETE ON comments
FOR EACH ROW
BEGIN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
END//

DELIMITER ;

-- Create view for profile follow counts
CREATE VIEW profile_follow_counts AS
SELECT 
    p.id AS profile_id,
    (SELECT COUNT(*) FROM follows f WHERE f.following_id = p.id) AS followers_count,
    (SELECT COUNT(*) FROM follows f WHERE f.follower_id = p.id) AS following_count
FROM profiles p;

-- Insert some sample data for testing
INSERT INTO users (id, email, password_hash) VALUES 
('user1', 'john@example.com', '$2b$10$example_hash_1'),
('user2', 'jane@example.com', '$2b$10$example_hash_2');

INSERT INTO profiles (id, username, full_name, bio) VALUES 
('user1', 'john_doe', 'John Doe', 'Software developer from Rwanda'),
('user2', 'jane_smith', 'Jane Smith', 'Designer and photographer');

INSERT INTO posts (user_id, content) VALUES 
('user1', 'Hello from XAMPP! This is my first post.'),
('user2', 'Loving the new database setup! 🚀');
