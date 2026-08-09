-- Server-authoritative Loks balance and transfer ledger.
-- Loks are normally local (App.jsx useState); this server-side ledger tracks
-- inter-player transfers only (tipping). Single-player spending remains local
-- and is reconciled on sign-in.

CREATE TABLE IF NOT EXISTS lok_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  loks INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lok_transfers (
  id TEXT PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  context TEXT,                              -- e.g. "room:<id>", "gallery:<id>"
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON lok_transfers (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON lok_transfers (to_user_id, created_at DESC);

-- RPC: send_loks — debit from sender, credit to recipient, in one transaction.
-- Returns {success: bool, message: string, new_balance: int}.
-- Only signs-in users with an auth.uid() can send. Both parties must be in the ledger.
-- Enforces: no self-tips, minimum amount, daily cap per sender.
CREATE OR REPLACE FUNCTION send_loks(
  recipient_user_id UUID,
  amount INT,
  context TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  sender_id UUID;
  sender_bal INT;
  recipient_bal INT;
  today_sent INT;
  DAILY_CAP CONSTANT INT := 500;
  MIN_AMOUNT CONSTANT INT := 1;
  transfer_id TEXT;
BEGIN
  sender_id := auth.uid();

  -- Require authentication
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sign in to send Loks',
      'new_balance', 0
    );
  END IF;

  -- No self-tips
  IF sender_id = recipient_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Can''t tip yourself',
      'new_balance', 0
    );
  END IF;

  -- Minimum amount
  IF amount < MIN_AMOUNT OR amount > DAILY_CAP THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tip 1–500 Loks',
      'new_balance', 0
    );
  END IF;

  -- Sender must exist in ledger
  IF NOT EXISTS (SELECT 1 FROM lok_balances WHERE user_id = sender_id) THEN
    INSERT INTO lok_balances (user_id, loks) VALUES (sender_id, 0);
  END IF;

  -- Recipient must exist in ledger
  IF NOT EXISTS (SELECT 1 FROM lok_balances WHERE user_id = recipient_user_id) THEN
    INSERT INTO lok_balances (user_id, loks) VALUES (recipient_user_id, 0);
  END IF;

  -- Check sender balance
  SELECT loks INTO sender_bal FROM lok_balances WHERE user_id = sender_id FOR UPDATE;
  IF sender_bal < amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not enough Loks',
      'new_balance', sender_bal
    );
  END IF;

  -- Check daily cap (sum of transfers sent today)
  SELECT COALESCE(SUM(amount), 0) INTO today_sent
  FROM lok_transfers
  WHERE from_user_id = sender_id AND DATE(created_at) = CURRENT_DATE;

  IF today_sent + amount > DAILY_CAP THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Daily limit reached',
      'new_balance', sender_bal
    );
  END IF;

  -- Execute transfer: debit sender, credit recipient, record ledger
  UPDATE lok_balances SET loks = loks - amount WHERE user_id = sender_id;
  UPDATE lok_balances SET loks = loks + amount WHERE user_id = recipient_user_id;

  transfer_id := 'tr_' || gen_random_uuid()::TEXT;
  INSERT INTO lok_transfers (id, from_user_id, to_user_id, amount, context)
  VALUES (transfer_id, sender_id, recipient_user_id, amount, context);

  -- Return new sender balance
  SELECT loks INTO sender_bal FROM lok_balances WHERE user_id = sender_id;
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Loks sent ✓',
    'new_balance', sender_bal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row-level security: users can only read/update their own balances
ALTER TABLE lok_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE lok_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own balance" ON lok_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users update own balance" ON lok_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users see transfers involving them" ON lok_transfers
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
