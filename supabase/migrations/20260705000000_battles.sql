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
