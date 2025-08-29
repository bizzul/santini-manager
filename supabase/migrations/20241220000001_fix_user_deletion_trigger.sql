-- Drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- Create a simpler, more robust function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
DECLARE
  table_name text;
  query text;
  result text;
BEGIN
  -- List of tables to clean up (only include tables that actually exist)
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'user_organizations',
      'user_sites',
      'user_tasks',
      'time_tracking',
      'error_tracking',
      'user_clients',
      'user_suppliers',
      'user_products',
      'user_inventory',
      'user_kanbans',
      'user_reports',
      'user_files'
    ])
  LOOP
    BEGIN
      -- Try to delete from each table
      query := format('DELETE FROM %I WHERE user_id = $1', table_name);
      EXECUTE query USING OLD.id;
      
      -- Log successful deletion
      RAISE NOTICE 'Deleted from %: % rows affected', table_name, FOUND;
    EXCEPTION 
      WHEN undefined_table THEN
        -- Table doesn't exist, skip silently
        NULL;
      WHEN OTHERS THEN
        -- Log other errors but don't fail the deletion
        RAISE WARNING 'Error deleting from %: %', table_name, SQLERRM;
    END;
  END LOOP;

  -- Handle User table specifically (try both quoted and unquoted names)
  BEGIN
    -- Try quoted name first
    DELETE FROM "User" WHERE "authId" = OLD.id;
    RAISE NOTICE 'Deleted from "User" table';
  EXCEPTION 
    WHEN undefined_table THEN
      BEGIN
        -- Try unquoted name
        DELETE FROM User WHERE "authId" = OLD.id;
        RAISE NOTICE 'Deleted from User table';
      EXCEPTION 
        WHEN undefined_table THEN
          -- Table doesn't exist, skip silently
          NULL;
        WHEN OTHERS THEN
          -- Log other errors but don't fail the deletion
          RAISE WARNING 'Error deleting from User table: %', SQLERRM;
      END;
    WHEN OTHERS THEN
      -- Log other errors but don't fail the deletion
      RAISE WARNING 'Error deleting from "User" table: %', SQLERRM;
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
      OLD.id,
      jsonb_build_object(
        'email', OLD.email,
        'deleted_at', NOW()
      ),
      NOW(),
      COALESCE(auth.uid(), 'system')
    );
  EXCEPTION 
    WHEN undefined_table THEN
      -- Audit table doesn't exist, skip silently
      NULL;
    WHEN OTHERS THEN
      -- Log other errors but don't fail the deletion
      RAISE WARNING 'Error creating audit log: %', SQLERRM;
  END;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
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

-- Log that the trigger was created
DO $$
BEGIN
  RAISE NOTICE 'User deletion trigger created successfully';
  RAISE NOTICE 'Trigger function: handle_user_deletion()';
  RAISE NOTICE 'Trigger: on_auth_user_deleted on auth.users';
END $$;
