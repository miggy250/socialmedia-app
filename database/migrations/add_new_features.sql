-- Migration: Add new Instagram-level features
-- Run this in phpMyAdmin to add new tables and columns

USE socialmedia_app;

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER location,
ADD COLUMN is_private BOOLEAN DEFAULT FALSE AFTER is_verified;

-- Create saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
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

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
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

-- Create story_views table
CREATE TABLE IF NOT EXISTS story_views (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    story_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_story_view (story_id, user_id),
    INDEX idx_story_views_story (story_id)
);

-- Add is_verified to profiles (if needed by user queries)
-- Check if posts table needs any updates
SELECT 'Migration completed successfully!' AS status;
