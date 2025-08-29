-- Check what tables exist in the public schema
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%user%'
ORDER BY table_name;

-- Check if the User table exists and what its exact name is
SELECT 
  table_name,
  table_schema,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name = 'User' OR table_name = '"User"')
ORDER BY table_name;

-- Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_deleted';

-- Check if the function exists
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines 
WHERE routine_name = 'handle_user_deletion';

-- Check the structure of the User table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'User'
ORDER BY ordinal_position;

-- Check user_organizations table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_organizations'
ORDER BY ordinal_position;
