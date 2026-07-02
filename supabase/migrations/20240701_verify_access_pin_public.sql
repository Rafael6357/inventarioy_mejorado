-- RPC: Public PIN verification for employee access via business code
-- This function does NOT require authentication (auth.uid() = NULL is OK).
-- It looks up the business owner by business_code, then verifies the PIN server-side.
-- The client never receives pin_hash.

CREATE OR REPLACE FUNCTION verify_access_pin_public(
  p_business_code TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
  v_pin_hash TEXT;
  v_pin RECORD;
BEGIN
  -- Look up the business owner by business code
  SELECT id INTO v_user_id
  FROM profiles
  WHERE business_code = p_business_code
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Negocio no encontrado');
  END IF;

  -- Server-side hashing with application salt
  v_pin_hash := encode(digest(p_pin || 'inventarioy_pin_salt', 'sha256'), 'hex');

  -- Find matching active pin
  SELECT * INTO v_pin
  FROM access_pins
  WHERE user_id = v_user_id
    AND is_active = true
    AND pin_hash = v_pin_hash
  LIMIT 1;

  -- No match found
  IF v_pin.id IS NULL THEN
    -- Increment failed attempts on any active owner pin
    UPDATE access_pins
    SET failed_attempts = failed_attempts + 1,
        blocked_until = CASE
          WHEN failed_attempts + 1 >= 3 THEN (NOW() + INTERVAL '5 minutes')
          ELSE NULL
        END
    WHERE user_id = v_user_id
      AND is_active = true
      AND role = 'owner';

    IF NOT FOUND THEN
      UPDATE access_pins
      SET failed_attempts = failed_attempts + 1,
          blocked_until = CASE
            WHEN failed_attempts + 1 >= 3 THEN (NOW() + INTERVAL '5 minutes')
            ELSE NULL
          END
      WHERE user_id = v_user_id
        AND is_active = true
        AND id = (
          SELECT id FROM access_pins
          WHERE user_id = v_user_id AND is_active = true
          ORDER BY created_at ASC LIMIT 1
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'PIN incorrecto');
  END IF;

  -- Found matching pin - check if blocked
  IF v_pin.blocked_until IS NOT NULL AND v_pin.blocked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PIN bloqueado',
      'blocked', true,
      'remaining_seconds', EXTRACT(EPOCH FROM (v_pin.blocked_until - NOW()))::INT
    );
  END IF;

  -- Reset failed attempts on successful login
  UPDATE access_pins
  SET failed_attempts = 0, blocked_until = NULL
  WHERE id = v_pin.id;

  -- Success: return role and pin_name (NOT pin_hash)
  RETURN jsonb_build_object(
    'success', true,
    'role', v_pin.role,
    'pin_name', v_pin.pin_name
  );
END;
$$;

-- GRANT execute to anon (public access via business code)
GRANT EXECUTE ON FUNCTION verify_access_pin_public(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_access_pin_public(TEXT, TEXT) TO authenticated;
