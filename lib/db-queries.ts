'use server'

import { createClient } from "@/utils/supabase/server";


export async function  fetchUserData (userId: string) {
    const supabase = await createClient()

    // Fetch the user's organization_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('organization_id')
      .eq('user_id', userId)
      .single();
  
    if (tenantError || !tenant) {
      console.error('Error fetching tenant data:', tenantError?.message);
      return null;
    }
  
    const { organization_id } = tenant;
  
    // Construct schema name dynamically
    const schemaName = `org_${organization_id}`;
  
    // Query the users table in the organization's schema with function in supabase
    const { data: users, error: usersError } = await supabase.rpc('fetch_users_from_schema', { schema_name: schemaName });
  
    if (usersError) {
      console.error('Error fetching user data:', usersError.message);
      return null;
    }
  
    return users;
  };


  
