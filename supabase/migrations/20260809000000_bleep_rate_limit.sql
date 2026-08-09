-- Enforce bleep rate limits server-side to prevent gaming via localStorage clear or
-- browser switching. One bleep per (room, author_id, day).
-- Installed trigger on lok_room_strokes INSERT to count and reject duplicates.

CREATE TABLE IF NOT EXISTS lok_bleep_rate_limit (
  room_id UUID NOT NULL,
  author_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (room_id, author_id, date),
  FOREIGN KEY (room_id) REFERENCES lok_rooms(id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION check_bleep_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce rate limiting on bleeps
  IF NEW.kind != 'bleep' THEN
    RETURN NEW;
  END IF;

  -- Check if author already has a bleep in this room today
  IF EXISTS (
    SELECT 1 FROM lok_bleep_rate_limit
    WHERE room_id = NEW.room_id
    AND author_id = NEW.author_id
    AND date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Rate limited: one bleep per room per day';
  END IF;

  -- Record this bleep
  INSERT INTO lok_bleep_rate_limit (room_id, author_id, date, count)
  VALUES (NEW.room_id, NEW.author_id, CURRENT_DATE, 1)
  ON CONFLICT (room_id, author_id, date)
  DO UPDATE SET count = count + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_bleep_rate_limit
BEFORE INSERT ON lok_room_strokes
FOR EACH ROW
EXECUTE FUNCTION check_bleep_rate_limit();
