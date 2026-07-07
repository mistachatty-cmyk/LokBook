-- Lok Rooms: shared private infinite canvases + journals + stamp library.
-- ALPHA SECURITY MODEL: RLS is permissive; access is functionally code-gated —
-- the client only ever queries lok_rooms by exact code and never lists private
-- rooms. BEFORE BETA:
--   1. Replace open select on lok_rooms with a security-definer RPC
--      get_room_by_code(text) so codes can't be enumerated.
--   2. Scope lok_room_strokes select/insert to lok_room_members via auth.uid().
--   3. Enforce bleep rate limits with an insert trigger
--      (count author_id + room_id + created_at::date).

CREATE TABLE IF NOT EXISTS lok_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  owner_id      TEXT NOT NULL,
  owner_name    TEXT NOT NULL,
  title         TEXT DEFAULT 'Our canvas',
  mode          TEXT NOT NULL DEFAULT 'private' CHECK (mode IN ('private','gallery')),
  journal_style JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lok_room_members (
  room_id  UUID REFERENCES lok_rooms(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL,
  name     TEXT NOT NULL,
  role     TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('owner','writer','reader')),
  requested_write BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS lok_room_strokes (
  id         TEXT PRIMARY KEY,          -- client-generated → idempotent re-insert
  room_id    UUID REFERENCES lok_rooms(id) ON DELETE CASCADE,
  chunk      TEXT NOT NULL,             -- "cx,cy" cell of bbox origin, CHUNK=1024
  author_id  TEXT NOT NULL,
  author     TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'stroke' CHECK (kind IN ('stroke','stamp','bleep')),
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_strokes_room_chunk ON lok_room_strokes (room_id, chunk);
CREATE INDEX IF NOT EXISTS idx_room_strokes_room_created ON lok_room_strokes (room_id, created_at);

CREATE TABLE IF NOT EXISTS lok_stamps (
  id TEXT PRIMARY KEY,
  author TEXT,
  kind TEXT DEFAULT 'mini',             -- 'mini' (drawn frames) | 'proc' (painter ref)
  frames JSONB,
  pace_ms INT DEFAULT 140,
  ref TEXT,
  public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lok_journals (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  room_id UUID,
  title TEXT DEFAULT 'Untitled journal',
  style JSONB DEFAULT '{}',             -- cover theme, ribbon, paper, stickers
  pages JSONB DEFAULT '[]',             -- JPEG dataURLs
  public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journals_owner ON lok_journals (owner_name);

ALTER TABLE lok_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lok_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lok_room_strokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lok_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lok_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alpha read rooms" ON lok_rooms FOR SELECT USING (true);
CREATE POLICY "alpha create rooms" ON lok_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "alpha update rooms" ON lok_rooms FOR UPDATE USING (true);

CREATE POLICY "alpha read members" ON lok_room_members FOR SELECT USING (true);
CREATE POLICY "alpha join" ON lok_room_members FOR INSERT WITH CHECK (true);
CREATE POLICY "alpha update members" ON lok_room_members FOR UPDATE USING (true);

CREATE POLICY "alpha read strokes" ON lok_room_strokes FOR SELECT USING (true);
CREATE POLICY "alpha draw" ON lok_room_strokes FOR INSERT WITH CHECK (true);
CREATE POLICY "alpha undo" ON lok_room_strokes FOR DELETE USING (true);

CREATE POLICY "alpha read stamps" ON lok_stamps FOR SELECT USING (true);
CREATE POLICY "alpha create stamps" ON lok_stamps FOR INSERT WITH CHECK (true);

CREATE POLICY "alpha read journals" ON lok_journals FOR SELECT USING (true);
CREATE POLICY "alpha create journals" ON lok_journals FOR INSERT WITH CHECK (true);
CREATE POLICY "alpha update journals" ON lok_journals FOR UPDATE USING (true);
