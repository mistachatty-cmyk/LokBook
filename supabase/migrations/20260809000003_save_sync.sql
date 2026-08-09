-- Cross-device save sync.
--
-- The save blob has always been device-local (localStorage / Tauri storage), so
-- a user's progress does not follow them between a phone, an iPad, and a
-- desktop browser. This table is the sync target: one row per authenticated
-- user, holding the same blob getSaveBlob() already produces.
--
-- The blob stays opaque JSONB on purpose. The client's save shape changes most
-- releases, and mirroring it into columns here would mean a migration every
-- time a field is added — the July regression is a reminder of what churn in
-- shared state costs.

CREATE TABLE IF NOT EXISTS lok_saves (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blob JSONB NOT NULL,
  -- When the *device* wrote it, not when the row landed. Clock skew between
  -- devices is possible, which is exactly why a newer remote save prompts the
  -- user instead of silently overwriting.
  device_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lok_saves ENABLE ROW LEVEL SECURITY;

-- A save is private to its owner. All three policies check auth.uid() so no
-- user can ever read or clobber another's progress.
DROP POLICY IF EXISTS saves_select_own ON lok_saves;
CREATE POLICY saves_select_own ON lok_saves
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS saves_insert_own ON lok_saves;
CREATE POLICY saves_insert_own ON lok_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS saves_update_own ON lok_saves;
CREATE POLICY saves_update_own ON lok_saves
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION touch_lok_saves()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_lok_saves ON lok_saves;
CREATE TRIGGER trg_touch_lok_saves
  BEFORE UPDATE ON lok_saves
  FOR EACH ROW EXECUTE FUNCTION touch_lok_saves();
