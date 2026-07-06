-- LokBook Supabase Schema
-- Run this in the Supabase SQL editor to create the required tables.

-- 1. Accounts table — stores profile data and cloud save blobs
CREATE TABLE IF NOT EXISTS lok_accounts (
  handle      TEXT PRIMARY KEY,
  pin_hash    TEXT NOT NULL,
  save_blob   JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for login lookups
CREATE INDEX IF NOT EXISTS idx_lok_accounts_handle ON lok_accounts (handle);

-- Enable Row Level Security
ALTER TABLE lok_accounts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (signup) — PIN hash provides auth
CREATE POLICY "Allow signup insert"
  ON lok_accounts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anyone to read (login lookup, save fetch)
CREATE POLICY "Allow login read"
  ON lok_accounts FOR SELECT
  TO anon
  USING (true);

-- Allow anyone to update (save push — authenticated via PIN match in app)
CREATE POLICY "Allow save update"
  ON lok_accounts FOR UPDATE
  TO anon
  USING (true);

-- 2. Posts table — published flipbook animations
CREATE TABLE IF NOT EXISTS lok_posts (
  id              TEXT PRIMARY KEY,
  author          TEXT NOT NULL,
  title           TEXT,
  frames          JSONB,
  frame_durations JSONB,
  pace_ms         INTEGER DEFAULT 160,
  mode            TEXT DEFAULT 'A',
  style           TEXT DEFAULT 'bold',
  loop            BOOLEAN DEFAULT false,
  votes           INTEGER DEFAULT 0,
  views           INTEGER DEFAULT 0,
  reactions       JSONB DEFAULT '{"humhah":0,"bomhogwah":0,"splat":0,"heart":0,"drip":0}',
  "echoedAt"      TIMESTAMPTZ,
  "echoCount"     INTEGER DEFAULT 0,
  "echoParent"    TEXT,
  "echoExpiresAt" TIMESTAMPTZ,
  origin          TEXT DEFAULT 'studio',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for feed queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_lok_posts_created_at ON lok_posts (created_at DESC);

-- Index for author queries
CREATE INDEX IF NOT EXISTS idx_lok_posts_author ON lok_posts (author);

-- Enable Row Level Security
ALTER TABLE lok_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published posts
CREATE POLICY "Allow feed read"
  ON lok_posts FOR SELECT
  TO anon
  USING (true);

-- Allow anyone to insert (moderated client-side)
CREATE POLICY "Allow post insert"
  ON lok_posts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anyone to update (vote counting, etc.)
CREATE POLICY "Allow post update"
  ON lok_posts FOR UPDATE
  TO anon
  USING (true);

-- 5. Auth saves table — cloud saves for Supabase Auth users (keyed by user UUID)
CREATE TABLE IF NOT EXISTS auth_saves (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  save_blob   JSONB,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE auth_saves ENABLE ROW LEVEL SECURITY;

-- Users can read and upsert their own saves
CREATE POLICY "Users manage own saves"
  ON auth_saves
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. LokPass purchases table — tracks Stripe payments
CREATE TABLE IF NOT EXISTS lok_pass_purchases (
  id                SERIAL PRIMARY KEY,
  user_id           TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  amount            INTEGER,
  status            TEXT DEFAULT 'pending',
  email             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lok_pass_purchases ENABLE ROW LEVEL SECURITY;

-- Allow the service role to read/write (edge functions use service role key)
CREATE POLICY "Service role full access"
  ON lok_pass_purchases
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Founder signups table
CREATE TABLE IF NOT EXISTS founder_signups (
  id          SERIAL PRIMARY KEY,
  handle      TEXT NOT NULL,
  email       TEXT,
  source      TEXT DEFAULT 'lok_alpha',
  save_blob   JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE founder_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow founder signup insert"
  ON founder_signups FOR INSERT
  TO anon
  WITH CHECK (true);

-- 6. Battles table — weekly leaderboard
CREATE TABLE IF NOT EXISTS lok_battles (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  won BOOLEAN NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  prompt TEXT,
  format TEXT,
  pages INTEGER DEFAULT 0,
  strokes INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battles_week ON lok_battles (week_start DESC);
CREATE INDEX IF NOT EXISTS idx_battles_author ON lok_battles (author);

ALTER TABLE lok_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON lok_battles FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can record battle"
  ON lok_battles FOR INSERT TO anon WITH CHECK (true);
