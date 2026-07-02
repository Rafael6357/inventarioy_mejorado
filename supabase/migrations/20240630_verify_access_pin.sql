-- RPC: Verify access PIN server-side (security-critical)
-- This moves PIN hashing and comparison from the client to the server
-- preventing PIN hash extraction from client bundles.

CREATE OR REPLACE FUNCTION verify_access_pin(
  p_pin TEXT,
  p_module_path TEXT DEFAULT NULL
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
  v_failed_attempts INT;
  v_blocked_until TIMESTAMPTZ;
  v_module_roles TEXT[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
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
    -- Increment failed attempts on any active owner pin first
    UPDATE access_pins
    SET failed_attempts = failed_attempts + 1,
        blocked_until = CASE
          WHEN failed_attempts + 1 >= 3 THEN (NOW() + INTERVAL '5 minutes')
          ELSE NULL
        END
    WHERE user_id = v_user_id
      AND is_active = true
      AND role = 'owner';

    -- If no owner pin was updated, update the first active pin
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

    -- Check if any pin is now blocked
    SELECT blocked_until, failed_attempts INTO v_blocked_until, v_failed_attempts
    FROM access_pins
    WHERE user_id = v_user_id AND is_active = true AND blocked_until > NOW()
    ORDER BY blocked_until DESC LIMIT 1;

    RETURN jsonb_build_object(
      'success', false,
      'error', CASE WHEN v_blocked_until IS NOT NULL
        THEN 'PIN bloqueado por 3 intentos fallidos'
        ELSE 'PIN incorrecto'
      END,
      'blocked', v_blocked_until IS NOT NULL,
      'remaining_seconds', CASE WHEN v_blocked_until IS NOT NULL
        THEN EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::INT
        ELSE 0
      END
    );
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

  -- Check module access if path provided
  IF p_module_path IS NOT NULL AND p_module_path != '/' THEN
    -- Determine required roles for the module path
    -- These map to the MODULE_ROLES in client dbStore.ts
    CASE p_module_path
      WHEN '/sales' THEN v_module_roles := ARRAY['owner', 'economist', 'supervisor', 'clerk'];
      WHEN '/inventory' THEN v_module_roles := ARRAY['owner', 'economist', 'admin'];
      WHEN '/movements' THEN v_module_roles := ARRAY['owner', 'economist', 'admin'];
      WHEN '/transit' THEN v_module_roles := ARRAY['owner', 'economist', 'admin'];
      WHEN '/closings' THEN v_module_roles := ARRAY['owner', 'economist', 'supervisor'];
      WHEN '/hr' THEN v_module_roles := ARRAY['owner', 'economist'];
      WHEN '/recipes' THEN v_module_roles := ARRAY['owner', 'economist'];
      WHEN '/consumption' THEN v_module_roles := ARRAY['owner', 'economist'];
      WHEN '/analysis' THEN v_module_roles := ARRAY['owner', 'economist'];
      WHEN '/charts' THEN v_module_roles := ARRAY['owner', 'economist'];
      WHEN '/filtered' THEN v_module_roles := ARRAY['owner', 'economist'];
      WHEN '/settings' THEN v_module_roles := ARRAY['owner'];
      WHEN '/action-logs' THEN v_module_roles := ARRAY['owner', 'economist'];
      ELSE v_module_roles := ARRAY['owner', 'economist', 'admin', 'supervisor', 'clerk'];
    END CASE;

    IF NOT (v_pin.role = ANY(v_module_roles)) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Tu PIN no tiene acceso a este módulo'
      );
    END IF;
  END IF;

  -- Success
  RETURN jsonb_build_object(
    'success', true,
    'role', v_pin.role,
    'pin_name', v_pin.pin_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_access_pin(TEXT, TEXT) TO authenticated;
