-- Server-side grants for rewarded-ad claims.
--
-- Most rewarded rewards are cosmetic or session-scoped and stay client-side.
-- The ones that touch durable economy state (Loks grants, the 2x window, the
-- streak shield, battle re-entry) cannot be: a client-only grant is farmable by
-- replaying the completion callback, which is the same forgeability problem the
-- tipping migration exists to avoid.
--
-- The cooldown is enforced here, not in the client. The client's cooldown UI is
-- a courtesy; this table is the authority.

CREATE TABLE IF NOT EXISTS lok_reward_claims (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- For timed rewards (2x window, day-passes); NULL for instant grants.
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user
  ON lok_reward_claims (user_id, reward_id, granted_at DESC);

ALTER TABLE lok_reward_claims ENABLE ROW LEVEL SECURITY;

-- A user may read their own claim history and nothing else. Writes go through
-- the SECURITY DEFINER RPC below, never directly — so there is deliberately no
-- INSERT policy here.
DROP POLICY IF EXISTS reward_claims_select_own ON lok_reward_claims;
CREATE POLICY reward_claims_select_own ON lok_reward_claims
  FOR SELECT USING (auth.uid() = user_id);

-- Cooldowns, in seconds, keyed by reward id. Mirrors src/engine/rewards.js —
-- but this copy is the one that is enforced.
CREATE OR REPLACE FUNCTION reward_cooldown_seconds(rid TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE rid
    WHEN 'streak_shield'   THEN 86400
    WHEN 'battle_reentry'  THEN 86400
    WHEN 'double_loks'     THEN 14400
    WHEN 'loks_small'      THEN 1200
    ELSE 0                    -- unknown/client-side reward: not grantable here
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RPC: claim_reward — records a grant if the cooldown has elapsed.
-- Returns {success, message, expires_at, loks_granted}.
CREATE OR REPLACE FUNCTION claim_reward(reward_id TEXT)
RETURNS JSONB AS $$
DECLARE
  uid UUID;
  cd INT;
  last_at TIMESTAMPTZ;
  exp TIMESTAMPTZ;
  granted INT := 0;
  claim_id TEXT;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sign in to claim rewards');
  END IF;

  cd := reward_cooldown_seconds(reward_id);
  IF cd = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unknown reward');
  END IF;

  SELECT granted_at INTO last_at
    FROM lok_reward_claims
   WHERE user_id = uid AND lok_reward_claims.reward_id = claim_reward.reward_id
   ORDER BY granted_at DESC LIMIT 1;

  IF last_at IS NOT NULL AND now() - last_at < make_interval(secs => cd) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Still cooling down',
      'ready_at', last_at + make_interval(secs => cd)
    );
  END IF;

  -- Timed rewards carry an expiry the client reads back.
  IF reward_id = 'double_loks' THEN exp := now() + interval '30 minutes'; END IF;

  -- Currency grants land in the same ledger tipping uses, so there is one
  -- server-side balance rather than two competing ones.
  IF reward_id = 'loks_small' THEN
    granted := 40;
    INSERT INTO lok_balances (user_id, loks) VALUES (uid, granted)
      ON CONFLICT (user_id) DO UPDATE
        SET loks = lok_balances.loks + granted, updated_at = now();
  END IF;

  claim_id := uid::text || ':' || reward_id || ':' || extract(epoch from now())::bigint::text;
  INSERT INTO lok_reward_claims (id, user_id, reward_id, expires_at)
    VALUES (claim_id, uid, reward_id, exp);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward granted',
    'expires_at', exp,
    'loks_granted', granted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION claim_reward(TEXT) TO authenticated;
