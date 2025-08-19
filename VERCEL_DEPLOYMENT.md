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

## Testing

After deployment:
1. Clear all browser cookies for your domain
2. Try logging in again
3. Check browser dev tools > Application > Cookies to see if cookies are set
4. Verify that you can navigate between protected routes without re-authentication

## Debugging

If issues persist:
1. Check Vercel function logs for errors
2. Verify environment variables are loaded correctly
3. Test with a simple authentication flow first
4. Check Supabase dashboard for authentication logs
