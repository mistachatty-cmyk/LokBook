-- Public, searchable profile for every signed-in account.
-- auth.users is not readable by clients, so without this table a real account
-- exists but can never be found by another artist.
CREATE TABLE IF NOT EXISTS lok_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle      TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_seed INTEGER DEFAULT 0,
  bio         TEXT DEFAULT '',
  flips       INTEGER DEFAULT 0,
  level       INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lok_profiles_created ON lok_profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lok_profiles_handle  ON lok_profiles (lower(handle));

ALTER TABLE lok_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone (even signed out) can discover artists; you may only write your own row.
CREATE POLICY "Profiles are publicly readable"
  ON lok_profiles FOR SELECT USING (true);
CREATE POLICY "Users insert their own profile"
  ON lok_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update their own profile"
  ON lok_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Artists who have aged out of the newest-200 board fall into a random pull,
-- so older accounts stay discoverable instead of vanishing.
CREATE OR REPLACE FUNCTION lok_random_older_artists(board_size INT DEFAULT 200, want INT DEFAULT 6)
RETURNS SETOF lok_profiles
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM lok_profiles
  WHERE user_id NOT IN (
    SELECT user_id FROM lok_profiles ORDER BY created_at DESC LIMIT board_size
  )
  ORDER BY random()
  LIMIT LEAST(GREATEST(want, 1), 24);
$$;
