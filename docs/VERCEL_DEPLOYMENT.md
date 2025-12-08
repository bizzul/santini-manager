# Vercel Deployment Guide

## Environment Variables Required

Make sure to set these environment variables in your Vercel project settings:

### Required Variables:
```bash
# Supabase Configuration
STORAGE_SUPABASE_URL=your_supabase_project_url
STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STORAGE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cookie Configuration
COOKIE_NAME=reactive-app:session
NODE_ENV=production

# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
```

### Important Notes:

1. **Cookie Domain**: The `NEXT_PUBLIC_ROOT_DOMAIN` should be your actual domain (e.g., `santini-manager.vercel.app` or your custom domain)

2. **Secure Cookies**: In production, cookies will automatically be set as secure (HTTPS only)

3. **SameSite**: Cookies are set to `lax` for better compatibility

## Vercel Project Settings

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add all the required variables above
4. Make sure to set them for all environments (Production, Preview, Development)

## Common Issues and Solutions

### Cookies Not Being Set
- Ensure `NEXT_PUBLIC_ROOT_DOMAIN` is set correctly
- Check that your domain matches the cookie domain
- Verify Supabase URLs are correct

### Authentication Loops
- Clear browser cookies and local storage
- Check that middleware is not blocking authentication routes
- Verify Supabase session is being created properly

### Subdomain Issues
- Ensure your domain configuration supports subdomains
- Check that the root domain is set correctly in environment variables

### Local vs Production Differences

**If it works locally but not on Vercel:**

1. **Environment Variables**: Check that all environment variables are set in Vercel
2. **Database Permissions**: Vercel uses different IP addresses - ensure your Supabase RLS policies allow Vercel's IPs
3. **Cookie Domain**: Local uses `.localhost`, production needs your actual domain
4. **Service Role Key**: Ensure `STORAGE_SUPABASE_SERVICE_ROLE_KEY` is set for admin operations

**Debug Steps:**
1. Visit `/api/debug/user-context` after deployment to see detailed error information
2. Check Vercel function logs for specific error messages
3. Compare environment variable values between local and production

## Testing

After deployment:
1. Clear all browser cookies for your domain
2. Try logging in again
3. Check browser dev tools > Application > Cookies to see if cookies are set
4. Verify that you can navigate between protected routes without re-authentication
5. Use the debug endpoint `/api/debug/user-context` to troubleshoot issues

## Debugging

If issues persist:
1. Check Vercel function logs for errors
2. Verify environment variables are loaded correctly
3. Test with a simple authentication flow first
4. Check Supabase dashboard for authentication logs
5. Use the debug endpoint to identify specific issues

## Local Development vs Production

**Local Environment:**
- ✅ Cookies work with `.localhost` domain
- ✅ Direct database connection
- ✅ No IP restrictions
- ✅ Development environment variables

**Vercel Production:**
- ⚠️ Cookies need actual domain
- ⚠️ Edge runtime limitations
- ⚠️ IP-based restrictions possible
- ⚠️ Production environment variables required

**Key Differences to Check:**
1. Environment variable values
2. Cookie domain settings
3. Database RLS policies
4. Supabase project settings
5. Network access permissions
