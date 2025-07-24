import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Higher-order function for site authorization
export function withSiteAuth(handler: any) {
  return async (formData: FormData, site: any, key?: string) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return { error: "Not authenticated" };
    }

    const { data: siteData } = await supabase
      .from('sites')
      .select()
      .eq('id', site.id)
      .eq('user_id', user.id)
      .single();

    if (!siteData) {
      return { error: "Not authorized" };
    }

    return handler(formData, site, key);
  };
}