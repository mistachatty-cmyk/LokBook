-- Real-account 1v1 matchmaking for Battle: async duels (draw independently, compare results).
CREATE TABLE IF NOT EXISTS lok_duels (
  id           BIGSERIAL PRIMARY KEY,
  prompt       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'waiting', -- waiting | active | done | expired
  player1_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_name TEXT NOT NULL,
  player2_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_name TEXT,
  submission1  TEXT,
  submission2  TEXT,
  score1       INTEGER,
  score2       INTEGER,
  winner       TEXT, -- 'player1' | 'player2' | 'tie'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at    TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_lok_duels_status_created ON lok_duels (status, created_at);
CREATE INDEX IF NOT EXISTS idx_lok_duels_player1 ON lok_duels (player1_id);
CREATE INDEX IF NOT EXISTS idx_lok_duels_player2 ON lok_duels (player2_id);

ALTER TABLE lok_duels ENABLE ROW LEVEL SECURITY;

-- Players can see open duels (to join) plus any duel they're part of
CREATE POLICY "Players can read open or own duels"
  ON lok_duels FOR SELECT TO authenticated
  USING (status = 'waiting' OR player1_id = auth.uid() OR player2_id = auth.uid());

-- Only the creator can insert, and only as themselves
CREATE POLICY "Authenticated users can create a duel as player1"
  ON lok_duels FOR INSERT TO authenticated
  WITH CHECK (player1_id = auth.uid());

-- Either seat can update the row (to join as player2, submit art, or finalize score) but only their own identity
CREATE POLICY "Players can update duels they are part of"
  ON lok_duels FOR UPDATE TO authenticated
  USING (player1_id = auth.uid() OR player2_id = auth.uid() OR (status = 'waiting' AND player2_id IS NULL))
  WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());
