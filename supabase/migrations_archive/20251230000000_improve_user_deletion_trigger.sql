-- Improved user deletion trigger
-- This migration updates the trigger to ensure proper cleanup when a user is deleted from auth.users

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- Create an improved function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
DECLARE
  table_name text;
  user_db_id integer;
BEGIN
  -- First, get the User.id from authId for cascade deletions on User-related tables
  BEGIN
    SELECT id INTO user_db_id FROM "User" WHERE "authId" = OLD.id;
  EXCEPTION WHEN OTHERS THEN
    user_db_id := NULL;
  END;

  -- Delete from junction tables that reference auth.users.id directly
  -- These tables have user_id column pointing to auth.users.id (UUID)
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'user_organizations',
      'user_sites',
      'time_tracking',
      'error_tracking'
    ])
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE user_id = $1', table_name) USING OLD.id;
      RAISE NOTICE 'Deleted from % where user_id = %', table_name, OLD.id;
    EXCEPTION 
      WHEN undefined_table THEN
        NULL; -- Table doesn't exist, skip
      WHEN undefined_column THEN
        NULL; -- Column doesn't exist, skip
      WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from %: %', table_name, SQLERRM;
    END;
  END LOOP;

  -- Delete from _RolesToUser if we have the User.id
  -- This table uses User.id (integer) not auth.users.id (UUID)
  IF user_db_id IS NOT NULL THEN
    BEGIN
      DELETE FROM "_RolesToUser" WHERE "B" = user_db_id;
      RAISE NOTICE 'Deleted from _RolesToUser where B = %', user_db_id;
    EXCEPTION 
      WHEN undefined_table THEN
        NULL;
      WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from _RolesToUser: %', SQLERRM;
    END;
  END IF;

  -- Delete from User table (this should cascade to _RolesToUser via FK)
  BEGIN
    DELETE FROM "User" WHERE "authId" = OLD.id OR "auth_id" = OLD.id;
    RAISE NOTICE 'Deleted from User table where authId/auth_id = %', OLD.id;
  EXCEPTION 
    WHEN undefined_table THEN
      NULL; -- Table doesn't exist
    WHEN undefined_column THEN
      -- Try with just authId if auth_id doesn't exist
      BEGIN
        DELETE FROM "User" WHERE "authId" = OLD.id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    WHEN OTHERS THEN
      RAISE WARNING 'Error deleting from User table: %', SQLERRM;
  END;

  -- Log the deletion for audit purposes
  BEGIN
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
      OLD.id::text,
      jsonb_build_object(
        'email', OLD.email,
        'deleted_at', NOW(),
        'user_db_id', user_db_id
      ),
      NOW(),
      COALESCE(auth.uid()::text, 'system')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create audit log: %', SQLERRM;
  END;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- Ensure audit_logs table exists
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON audit_logs TO authenticated;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE 'User deletion trigger updated successfully';
  RAISE NOTICE 'The trigger now handles: User, user_organizations, user_sites, time_tracking, error_tracking, _RolesToUser';
END $$;

