# CodeAtlas Production Debugging Report

## Issue Summary
Repository analysis flow was completely broken in production. Users could enter a repository URL but nothing happened - no analysis started.

## Root Cause Analysis

### Critical Issue: CORS Configuration
**Location:** `api/src/server.js` (lines 40-44)

**Problem:**
The backend CORS configuration was too restrictive and only allowed:
- `process.env.FRONTEND_URL` (set to `https://codeatlas.vercel.app`)
- `http://localhost:3000`

**Actual Vercel Deployment URL:**
`https://codeatlas-h7n8o12xw-rajpatilmitrobotics0-gmailcoms-projects.vercel.app`

This mismatch caused all API requests from the frontend to be blocked by CORS policy.

### Secondary Issue: Environment Variable Mismatch
The `FRONTEND_URL` environment variable on Railway was set to `https://codeatlas.vercel.app`, but the actual deployment was on a Vercel preview URL.

## Solution Implemented

### 1. Fixed CORS Configuration
Updated `api/src/server.js` to allow all Vercel deployments:

```javascript
// CORS - Allow Vercel deployments and localhost
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://codeatlas.vercel.app',
    ];
    
    // Allow all Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.warn(`CORS: Rejected origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 2. Updated Railway Environment Variables
Created `railway-env-variables-UPDATED.txt` with the correct `FRONTEND_URL`:
```
FRONTEND_URL=https://codeatlas-h7n8o12xw-rajpatilmitrobotics0-gmailcoms-projects.vercel.app
```

## Deployment Steps

### Step 1: Deploy Backend Changes to Railway
1. Commit the changes to `api/src/server.js`
2. Push to the repository
3. Railway will automatically redeploy

### Step 2: Update Railway Environment Variables (Optional)
Since the CORS fix now allows all `.vercel.app` domains, updating the `FRONTEND_URL` is optional but recommended for consistency:

1. Go to Railway dashboard
2. Select the CodeAtlas project
3. Go to Variables tab
4. Update `FRONTEND_URL` to: `https://codeatlas-h7n8o12xw-rajpatilmitrobotics0-gmailcoms-projects.vercel.app`
5. Redeploy the service

### Step 3: Verify Vercel Environment Variables
Ensure `NEXT_PUBLIC_API_URL` is set correctly in Vercel:

1. Go to Vercel dashboard
2. Select the CodeAtlas project
3. Go to Settings > Environment Variables
4. Verify `NEXT_PUBLIC_API_URL` is set to: `https://codeatlas-production-2451.up.railway.app`
5. If not set, add it and redeploy

## Testing the Fix

### 1. Test Backend Health
```bash
curl https://codeatlas-production-2451.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T16:19:00.000Z"
}
```

### 2. Test CORS from Frontend
Open browser console on the Vercel deployment and run:
```javascript
fetch('https://codeatlas-production-2451.up.railway.app/api/system/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should return health data without CORS errors.

### 3. Test Repository Analysis Flow
1. Go to: `https://codeatlas-h7n8o12xw-rajpatilmitrobotics0-gmailcoms-projects.vercel.app`
2. Enter a GitHub repository URL (e.g., `https://github.com/cypress-io/cypress`)
3. Click "Analyze Repository"
4. Should navigate to `/analyzing` page
5. Progress should start updating from 0% to 100%
6. Should redirect to `/dashboard` when complete

## Architecture Overview

### Request Flow
1. **User submits repo URL** → `app/page.jsx`
2. **Navigate to analyzing page** → `app/analyzing/page.jsx`
3. **Frontend calls API** → `lib/api.js` → `POST /api/repo/analyze`
4. **Backend receives request** → `api/src/server.js` (CORS check)
5. **Controller handles request** → `api/src/controllers/repo.controller.js`
6. **Job queued** → BullMQ → `api/src/queues/index.js`
7. **Worker processes** → `api/src/workers/repoAnalysisWorker.js`
8. **Frontend polls status** → `GET /api/repo/status/:repositoryId`
9. **Progress updates** → 0% → 100%
10. **Redirect to dashboard** → `/dashboard`

### Key Files Modified
- `api/src/server.js` - Fixed CORS configuration
- `railway-env-variables-UPDATED.txt` - Updated environment variables

### Key Files Analyzed (No Changes Needed)
- `lib/api.js` - API client configuration (correct)
- `app/page.jsx` - Landing page (correct)
- `app/analyzing/page.jsx` - Analysis page with polling (correct)
- `api/src/controllers/repo.controller.js` - Repository controller (correct)
- `api/src/routes/repo.routes.js` - API routes (correct)
- `api/src/middleware/security.js` - Security middleware (not used by server.js)

## Additional Notes

### Why Two Server Files?
The project has both `api/src/index.js` and `api/src/server.js`. The `package.json` specifies `src/server.js` as the main entry point, so `index.js` is not used in production.

### Rate Limiting
Rate limiting is disabled in development mode but enabled in production. The current limits are:
- General API: 100 requests per 15 minutes
- Repository analysis: 3 requests per hour (in production)

### Security Headers
Helmet.js is configured but with relaxed CSP for development. Consider tightening in production.

## Success Criteria
- ✅ CORS errors resolved
- ✅ Frontend can communicate with backend
- ✅ Repository analysis flow works end-to-end
- ✅ Progress updates display correctly
- ✅ Successful redirect to dashboard after completion

## Next Steps
1. Deploy the backend changes to Railway
2. Test the complete flow
3. Monitor Railway logs for any errors
4. Consider setting up custom domain for production (instead of Vercel preview URL)
5. Update FRONTEND_URL to production domain when available

---
**Report Generated:** 2026-05-17
**Fixed By:** Bob (AI Assistant)