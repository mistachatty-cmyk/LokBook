-- Social Graph Tables for LokBook
-- Adds follows, bookmarks, and per-user reactions persistence.
-- Run after schema.sql or in Supabase SQL editor.

-- 1. Follows table — who follows whom
CREATE TABLE IF NOT EXISTS lok_follows (
  id         SERIAL PRIMARY KEY,
  follower   TEXT NOT NULL,
  followee   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower, followee)
);

CREATE INDEX IF NOT EXISTS idx_lok_follows_follower ON lok_follows (follower);
CREATE INDEX IF NOT EXISTS idx_lok_follows_followee ON lok_follows (followee);

ALTER TABLE lok_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can follow"
  ON lok_follows FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read follows"
  ON lok_follows FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can unfollow"
  ON lok_follows FOR DELETE TO anon USING (true);

-- 2. Bookmarks table — who bookmarked which post
CREATE TABLE IF NOT EXISTS lok_bookmarks (
  id         SERIAL PRIMARY KEY,
  handle     TEXT NOT NULL,
  post_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(handle, post_id)
);

CREATE INDEX IF NOT EXISTS idx_lok_bookmarks_handle ON lok_bookmarks (handle);

ALTER TABLE lok_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can bookmark"
  ON lok_bookmarks FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read bookmarks"
  ON lok_bookmarks FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can unbookmark"
  ON lok_bookmarks FOR DELETE TO anon USING (true);

-- 3. Reactions table — per-user reactions on posts
CREATE TABLE IF NOT EXISTS lok_reactions (
  id         SERIAL PRIMARY KEY,
  handle     TEXT NOT NULL,
  post_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(handle, post_id, type)
);

CREATE INDEX IF NOT EXISTS idx_lok_reactions_post ON lok_reactions (post_id);

ALTER TABLE lok_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can react"
  ON lok_reactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read reactions"
  ON lok_reactions FOR SELECT TO anon USING (true);

-- 4. Quick-lookup columns on lok_accounts
ALTER TABLE lok_accounts ADD COLUMN IF NOT EXISTS following JSONB DEFAULT '[]';
ALTER TABLE lok_accounts ADD COLUMN IF NOT EXISTS bookmarks JSONB DEFAULT '[]';
