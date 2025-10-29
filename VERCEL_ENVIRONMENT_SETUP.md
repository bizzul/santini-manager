# Vercel Environment Variables Setup Guide

## Critical Issue Found: Cookie Name Mismatch

Your codebase had **inconsistent cookie names** which was causing authentication to fail in production:

- ❌ **Middleware**: Used `"reactive-auth:session"`
- ❌ **Cookie config**: Used `"reactive-app:session"`
- ❌ **Login actions**: Used `"appname:session"`

**This has been fixed** - all now use `"reactive-app:session"` consistently.

## Required Environment Variables for Vercel

### 1. Supabase Configuration
```bash
STORAGE_SUPABASE_URL=https://your-project.supabase.co
STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
STORAGE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Cookie Configuration
```bash
COOKIE_NAME=reactive-app:session
NODE_ENV=production
```

### 3. Domain Configuration
```bash
NEXT_PUBLIC_ROOT_DOMAIN=your-actual-domain.vercel.app
NEXT_PUBLIC_URL=https://your-actual-domain.vercel.app
```

**Important**: `NEXT_PUBLIC_URL` is used for email confirmation links and password reset links. Set this to your production domain so that email links point to the correct environment instead of localhost:3000.

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar
4. Add each variable:

### Production Environment
- **Name**: `STORAGE_SUPABASE_URL`
- **Value**: `https://your-project.supabase.co`
- **Environment**: Production, Preview, Development

- **Name**: `STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `your_anon_key_here`
- **Environment**: Production, Preview, Development

- **Name**: `STORAGE_SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `your_service_role_key_here`
- **Environment**: Production, Preview, Development

- **Name**: `COOKIE_NAME`
- **Value**: `reactive-app:session`
- **Environment**: Production, Preview, Development

- **Name**: `NODE_ENV`
- **Value**: `production`
- **Environment**: Production, Preview, Development

- **Name**: `NEXT_PUBLIC_ROOT_DOMAIN`
- **Value**: `your-actual-domain.vercel.app`
- **Environment**: Production, Preview, Development

- **Name**: `NEXT_PUBLIC_URL`
- **Value**: `https://your-actual-domain.vercel.app` (use your actual production domain)
- **Environment**: Production, Preview, Development

## Important Notes

### Cookie Domain
- **Local**: Uses `.localhost` (works in development)
- **Vercel**: Must use your actual domain (e.g., `your-app.vercel.app`)

### Environment
- **Local**: `NODE_ENV` is typically `development`
- **Vercel**: Must be set to `production`

### Cookie Names
- **All parts** of your app now use `reactive-app:session` consistently
- **Don't change** `COOKIE_NAME` unless you update it everywhere

## Testing After Setup

1. **Redeploy** your Vercel project
2. **Clear browser cookies** for your domain
3. **Login again** to your app
4. **Test debug endpoints** to verify setup

## Debug Endpoints

### 1. Basic Debug (No Auth Required)
**URL**: `/api/debug/basic`

This endpoint will show you:
- ✅ Environment variable status
- ✅ Basic Supabase connection
- ✅ Cookie information
- ✅ Request details

**Use this first** to verify your basic setup!

### 2. User Context Debug (Requires Auth)
**URL**: `/api/debug/user-context`

This endpoint will show you:
- ✅ User authentication status
- ✅ Cookie presence and values
- ✅ Tenant record status
- ✅ Site access information
- ✅ Detailed error information

## Troubleshooting Steps

### Step 1: Test Basic Setup
1. Visit `/api/debug/basic` after deployment
2. Check if environment variables are loaded
3. Verify Supabase connection works

### Step 2: Test Authentication
1. Login to your app
2. Visit `/api/debug/user-context`
3. Check what specific error you get

### Step 3: Common Issues

#### "Auth session missing!" Error
- **Cause**: Cookie name mismatch (now fixed)
- **Solution**: Ensure `COOKIE_NAME=reactive-app:session` is set

#### Cookies Not Being Set
- **Cause**: Wrong domain in `NEXT_PUBLIC_ROOT_DOMAIN`
- **Solution**: Use your actual Vercel domain

#### 500 Errors on Site Navigation
- **Cause**: Authentication failing due to cookie issues
- **Solution**: Follow this guide to set all environment variables

#### Environment Variables Not Loading
- **Cause**: Variables not set in Vercel or wrong environment
- **Solution**: Ensure variables are set for Production, Preview, AND Development

## Email Confirmation Links

The app now automatically detects the environment and uses the correct URL for email confirmation links:

- **Local**: Uses `http://localhost:3000` (default)
- **Production**: Uses `NEXT_PUBLIC_URL` or `VERCEL_URL` if not set
- **Priority**: `NEXT_PUBLIC_URL` > `VERCEL_URL` > `localhost:3000`

**Make sure** to set `NEXT_PUBLIC_URL` in Vercel to your production domain to avoid email links pointing to localhost.

**Also check**: In your Supabase dashboard, go to Authentication > URL Configuration and ensure your production domain is in the "Redirect URLs" list.

## Verification Checklist

After setting environment variables:
- [ ] All 7 required variables are set (includes NEXT_PUBLIC_URL)
- [ ] `NODE_ENV=production`
- [ ] `COOKIE_NAME=reactive-app:session`
- [ ] `NEXT_PUBLIC_ROOT_DOMAIN` is your actual Vercel domain
- [ ] Supabase keys are correct
- [ ] Project has been redeployed
- [ ] Basic debug endpoint `/api/debug/basic` works
- [ ] Browser cookies cleared
- [ ] User context debug endpoint `/api/debug/user-context` works
- [ ] Site navigation works without 500 errors

## If Still Getting 401 Errors

1. **Check Vercel Logs**: Look for specific error messages
2. **Compare Debug Outputs**: Compare local vs production debug endpoint results
3. **Verify Cookie Domain**: Ensure cookies are being set for the right domain
4. **Check Supabase RLS**: Ensure your Row Level Security policies allow Vercel IPs
5. **Test with Fresh Browser**: Clear all cookies and try again

## Final Notes

- **Local vs Production**: Local development is more forgiving with cookies
- **Edge Runtime**: Vercel's edge runtime has different cookie handling than local
- **Environment Variables**: Must be explicitly set in Vercel (not inherited from local)
- **Cookie Domains**: Production requires actual domain, not localhost
