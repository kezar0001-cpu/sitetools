-- Migration: Add company ownership transfer functionality
-- Created: 2026-04-20

-- Function to transfer company ownership to another user
-- Only the current owner can execute this
CREATE OR REPLACE FUNCTION transfer_company_ownership(
  p_company_id UUID,
  p_new_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_owner_id UUID;
  v_new_owner_role TEXT;
  v_new_owner_membership_id UUID;
  v_old_owner_membership_id UUID;
  v_new_owner_email TEXT;
  v_new_owner_name TEXT;
  v_company_name TEXT;
  v_result JSONB;
BEGIN
  -- Get current company owner
  SELECT owner_user_id, name
  INTO v_current_owner_id, v_company_name
  FROM companies
  WHERE id = p_company_id;

  -- Verify the caller is the current owner
  IF v_current_owner_id IS NULL OR v_current_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the current company owner can transfer ownership';
  END IF;

  -- Prevent transferring to self
  IF p_new_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;

  -- Get new owner's membership details and verify they are an admin
  SELECT cm.id, cm.role, p.email, p.full_name
  INTO v_new_owner_membership_id, v_new_owner_role, v_new_owner_email, v_new_owner_name
  FROM company_memberships cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.company_id = p_company_id
    AND cm.user_id = p_new_owner_id;

  -- Verify new owner is a member of the company
  IF v_new_owner_membership_id IS NULL THEN
    RAISE EXCEPTION 'New owner must be an existing member of the company';
  END IF;

  -- Verify new owner has admin role
  IF v_new_owner_role != 'admin' THEN
    RAISE EXCEPTION 'New owner must have admin role (current role: %)', v_new_owner_role;
  END IF;

  -- Get current owner's membership ID for role change
  SELECT id INTO v_old_owner_membership_id
  FROM company_memberships
  WHERE company_id = p_company_id
    AND user_id = auth.uid();

  -- Update company ownership
  UPDATE companies
  SET owner_user_id = p_new_owner_id,
      updated_at = NOW()
  WHERE id = p_company_id;

  -- Update old owner to admin role
  IF v_old_owner_membership_id IS NOT NULL THEN
    UPDATE company_memberships
    SET role = 'admin',
        updated_at = NOW()
    WHERE id = v_old_owner_membership_id;
  END IF;

  -- Log the ownership transfer in audit log
  INSERT INTO company_audit_log (
    company_id,
    entity_type,
    entity_id,
    action,
    changes,
    performed_by_user_id,
    performed_by_email,
    performed_by_name,
    metadata
  ) VALUES (
    p_company_id,
    'company',
    p_company_id,
    'ownership_transferred',
    jsonb_build_object(
      'previous_owner_id', v_current_owner_id,
      'new_owner_id', p_new_owner_id,
      'new_owner_email', v_new_owner_email,
      'new_owner_name', v_new_owner_name
    ),
    auth.uid(),
    (SELECT email FROM profiles WHERE id = auth.uid()),
    (SELECT full_name FROM profiles WHERE id = auth.uid()),
    jsonb_build_object(
      'previous_owner_promoted_to_admin', true,
      'new_owner_previous_role', v_new_owner_role
    )
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'previous_owner_id', v_current_owner_id,
    'new_owner_id', p_new_owner_id,
    'new_owner_email', v_new_owner_email,
    'new_owner_name', v_new_owner_name,
    'company_name', v_company_name,
    'transferred_at', NOW()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION transfer_company_ownership(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION transfer_company_ownership(UUID, UUID) IS 
'Transfers company ownership from the current owner to a new admin member.
Returns JSON with transfer details including both parties information.
Raises exception if caller is not owner or new owner is not an admin.';
