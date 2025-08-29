-- Create a function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete user profile from User table (try both quoted and unquoted names)
  BEGIN
    DELETE FROM "User" WHERE "authId" = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    BEGIN
      DELETE FROM User WHERE "authId" = OLD.id;
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist, skip this deletion
      NULL;
    END;
  END;
  
  -- Delete user-organization relationships
  BEGIN
    DELETE FROM user_organizations WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-site relationships
  BEGIN
    DELETE FROM user_sites WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-task relationships
  BEGIN
    DELETE FROM user_tasks WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-time-tracking records
  BEGIN
    DELETE FROM time_tracking WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-error-tracking records
  BEGIN
    DELETE FROM error_tracking WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-client relationships
  BEGIN
    DELETE FROM user_clients WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-supplier relationships
  BEGIN
    DELETE FROM user_suppliers WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-product relationships
  BEGIN
    DELETE FROM user_products WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-inventory relationships
  BEGIN
    DELETE FROM user_inventory WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-kanban relationships
  BEGIN
    DELETE FROM user_kanbans WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-report relationships
  BEGIN
    DELETE FROM user_reports WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Delete user-file relationships
  BEGIN
    DELETE FROM user_files WHERE user_id = OLD.id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip this deletion
    NULL;
  END;
  
  -- Log the deletion for audit purposes
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_data,
    timestamp,
    user_id
  ) VALUES (
    'DELETE',
    'auth.users',
    OLD.id,
    jsonb_build_object(
      'email', OLD.email,
      'deleted_at', NOW()
    ),
    NOW(),
    COALESCE(auth.uid(), 'system')
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
