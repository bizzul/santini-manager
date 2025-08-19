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
```

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
4. **Visit** `/api/debug/user-context` to verify authentication works
5. **Try navigating** to a site like "orgtest"

## Debug Endpoint

The `/api/debug/user-context` endpoint will now show you:
- ✅ User authentication status
- ✅ Cookie presence and values
- ✅ Tenant record status
- ✅ Site access information
- ✅ Environment variable status

## Common Issues and Solutions

### "Auth session missing!" Error
- **Cause**: Cookie name mismatch (now fixed)
- **Solution**: Ensure `COOKIE_NAME=reactive-app:session` is set

### Cookies Not Being Set
- **Cause**: Wrong domain in `NEXT_PUBLIC_ROOT_DOMAIN`
- **Solution**: Use your actual Vercel domain

### 500 Errors on Site Navigation
- **Cause**: Authentication failing due to cookie issues
- **Solution**: Follow this guide to set all environment variables

## Verification Checklist

After setting environment variables:
- [ ] All 6 required variables are set
- [ ] `NODE_ENV=production`
- [ ] `COOKIE_NAME=reactive-app:session`
- [ ] `NEXT_PUBLIC_ROOT_DOMAIN` is your actual Vercel domain
- [ ] Supabase keys are correct
- [ ] Project has been redeployed
- [ ] Browser cookies cleared
- [ ] Debug endpoint `/api/debug/user-context` works
- [ ] Site navigation works without 500 errors
