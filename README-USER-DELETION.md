# User Deletion System

This system provides a comprehensive way to delete users from both Supabase Auth and the database, with automatic cleanup of all related records.

## Components

### 1. Delete User Button (`components/users/delete-user-button.tsx`)
- Shows a confirmation dialog before deletion
- Displays user information and warns about permanent deletion
- Handles the deletion process through the API

### 2. Delete User API (`app/api/users/[userId]/delete/route.ts`)
- Requires admin or superadmin privileges
- Prevents users from deleting themselves
- Prevents non-superadmins from deleting superadmin users
- Deletes user from Supabase Auth
- Manually deletes user profile (as backup to trigger)

### 3. Database Trigger (`supabase/migrations/20241220000000_create_user_deletion_trigger.sql`)
- Automatically cleans up all related records when a user is deleted
- Runs after deletion from `auth.users` table
- Creates audit logs for tracking deletions

## Setup Instructions

### 1. Run the Migration
```bash
# Apply the migration to create the trigger
supabase db push
```

Or manually run the SQL in your Supabase dashboard:
1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase/migrations/20241220000000_create_user_deletion_trigger.sql`
3. Execute the script

### 2. Verify the Trigger
Check if the trigger was created successfully:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_deleted';
```

### 3. Test the System
1. Create a test user
2. Delete the user using the delete button
3. Verify that all related records are cleaned up

## How It Works

### Deletion Flow
1. **User clicks delete button** → Confirmation dialog appears
2. **API endpoint called** → Validates permissions and user data
3. **User deleted from Auth** → Supabase removes from `auth.users`
4. **Trigger fires automatically** → Cleans up all related records
5. **Manual cleanup** → API also deletes user profile as backup

### Automatic Cleanup
The trigger automatically deletes records from:
- `User` table (user profile)
- `user_organizations` (organization memberships)
- `user_sites` (site access)
- `user_tasks` (assigned tasks)
- `time_tracking` (time records)
- `error_tracking` (error reports)
- `user_clients` (client relationships)
- `user_suppliers` (supplier relationships)
- `user_products` (product access)
- `user_inventory` (inventory access)
- `user_kanbans` (kanban access)
- `user_reports` (report access)
- `user_files` (file access)

### Audit Logging
All deletions are logged in the `audit_logs` table with:
- Action type (`DELETE`)
- Table name (`auth.users`)
- Record ID (deleted user ID)
- Old data (user email and deletion timestamp)
- Timestamp of deletion
- User who performed the deletion

## Security Features

### Permission Checks
- Only admin and superadmin users can delete users
- Users cannot delete themselves
- Non-superadmins cannot delete superadmin users

### Data Integrity
- All related records are automatically cleaned up
- No orphaned data left in the system
- Audit trail for compliance

## Troubleshooting

### Trigger Not Working
1. Check if the trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_deleted';
   ```

2. Verify function exists:
   ```sql
   SELECT * FROM information_schema.routines WHERE routine_name = 'handle_user_deletion';
   ```

3. Check for errors in Supabase logs

### Manual Cleanup Needed
If the trigger fails, you can manually clean up:
```sql
-- Replace 'USER_ID_HERE' with the actual user ID
DELETE FROM "User" WHERE "authId" = 'USER_ID_HERE';
DELETE FROM user_organizations WHERE user_id = 'USER_ID_HERE';
-- ... repeat for other tables
```

## Best Practices

1. **Always test** deletion on non-production data first
2. **Monitor audit logs** for unusual deletion patterns
3. **Regular backups** before major user cleanup operations
4. **Document** any custom cleanup logic for your specific use case

## Customization

To add more tables to the cleanup trigger, modify the `handle_user_deletion()` function:

```sql
-- Add this line inside the function
DELETE FROM your_custom_table WHERE user_id = OLD.id;
```

Then update the migration file and reapply it.
