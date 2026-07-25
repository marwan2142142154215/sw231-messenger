-- NYXORA Database Schema
-- Run in Supabase SQL Editor

-- Disable RLS (app handles auth via backend)
-- Run after creating all tables: 
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY; (etc for all tables)

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_approved INTEGER DEFAULT 1,
  public_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIS (separate from users, for master panel)
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  refresh_token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ADMIN SESSIONS
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'private',
  name TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVERSATION MEMBERS
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- MESSAGES (E2E encrypted - server stores ciphertext only)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  media_url TEXT,
  media_type TEXT,
  mime_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  duration INTEGER,
  reply_to TEXT,
  is_edited INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  deleted_for TEXT DEFAULT 'sender',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- READ RECEIPTS
CREATE TABLE IF NOT EXISTS read_receipts (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- REACTIONS
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- FRIENDS (add friend system)
CREATE TABLE IF NOT EXISTS friends (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- QR TOKENS (for add friend via QR)
CREATE TABLE IF NOT EXISTS qr_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGE REQUESTS (DM from non-friends)
CREATE TABLE IF NOT EXISTS message_requests (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POSTS (social feed)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT,
  media_urls TEXT DEFAULT '[]',
  media_type TEXT,
  visibility TEXT DEFAULT 'public',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POST LIKES
CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- POST COMMENTS
CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORIES (24h)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  caption TEXT DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORY VIEWS
CREATE TABLE IF NOT EXISTS story_views (
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

-- MARKETPLACE LISTINGS
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'IDR',
  media_urls TEXT DEFAULT '[]',
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'available',
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLLOW SYSTEM
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- BLOCKED USERS
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- ADMIN LOGS (chained hash audit trail)
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  prev_hash TEXT,
  block_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FEATURE FLAGS
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIREWALL LOGS (anomaly detection)
CREATE TABLE IF NOT EXISTS firewall_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  ip_address TEXT,
  event_type TEXT NOT NULL,
  details TEXT,
  severity TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENCRYPTION KEYS (parcel rotation)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_data TEXT NOT NULL,
  parcel_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_read_receipts_msg ON read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_msg ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_msg_user ON reactions(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_user ON qr_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_to ON message_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_hash ON admin_logs(block_hash);
CREATE INDEX IF NOT EXISTS idx_firewall_logs_user ON firewall_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_firewall_logs_ip ON firewall_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_firewall_logs_created ON firewall_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_expires ON encryption_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);

-- DISABLE RLS ON ALL TABLES
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE story_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE firewall_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys DISABLE ROW LEVEL SECURITY;

-- INSERT DEFAULT DATA
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('chat', 1, 'Chat module'),
  ('social', 1, 'Social feed module'),
  ('marketplace', 1, 'Marketplace module'),
  ('stories', 1, 'Stories module'),
  ('qr_add_friend', 1, 'QR code add friend')
ON CONFLICT (key) DO NOTHING;

-- DEFAULT ADMIN (password: Admin123! - bcrypt hash)
INSERT INTO admins (id, username, password_hash, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', '$2a$12$LJ3m4yPnVz4HKhQOzFbQXO7FpR3VzYqZcCqVqYbXqR3VzYqZcCqV', 'Master Admin')
ON CONFLICT (username) DO NOTHING;
