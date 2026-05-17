# CodeAtlas Deployment Guide

Complete guide for deploying CodeAtlas to production using Vercel (frontend) and Railway (backend + workers).

---

## Prerequisites

### Required Accounts
- ✅ GitHub account (for code repository)
- ✅ Vercel account (for frontend hosting)
- ✅ Railway account (for backend + workers)
- ✅ Neon account (PostgreSQL database)
- ✅ Upstash account (Redis)
- ✅ Qdrant Cloud account (Vector database)
- ✅ Hugging Face account (Embeddings API)
- ✅ DeepSeek account (LLM API)
- ✅ Sentry account (Error tracking - optional)

---

## Part 1: Database Setup

### 1.1 Neon PostgreSQL

1. Go to [Neon Console](https://console.neon.tech)
2. Create new project: "codeatlas-production"
3. Copy connection string
4. Save as `DATABASE_URL`

### 1.2 Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com)
2. Create new database: "codeatlas-redis"
3. Copy connection details:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`

### 1.3 Qdrant Cloud

1. Go to [Qdrant Cloud](https://cloud.qdrant.io)
2. Create new cluster: "codeatlas-vectors"
3. Copy:
   - `QDRANT_URL`
   - `QDRANT_API_KEY`

---

## Part 2: API Keys Setup

### 2.1 Hugging Face

1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create new token with read access
3. Save as `HUGGINGFACE_API_KEY`

### 2.2 DeepSeek

1. Go to [DeepSeek Platform](https://platform.deepseek.com)
2. Generate API key
3. Save as `DEEPSEEK_API_KEY`

### 2.3 Sentry (Optional)

1. Go to [Sentry](https://sentry.io)
2. Create new project: "codeatlas"
3. Copy DSN
4. Save as `SENTRY_DSN`

---

## Part 3: Backend Deployment (Railway)

### 3.1 Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
cd api
railway init
```

### 3.2 Configure Environment Variables

In Railway dashboard, add these variables:

```env
# Database
DATABASE_URL=<neon-connection-string>

# Redis
REDIS_HOST=<upstash-host>
REDIS_PORT=<upstash-port>
REDIS_PASSWORD=<upstash-password>

# Qdrant
QDRANT_URL=<qdrant-url>
QDRANT_API_KEY=<qdrant-key>

# AI Services
HUGGINGFACE_API_KEY=<hf-key>
DEEPSEEK_API_KEY=<deepseek-key>

# App Config
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://codeatlas.vercel.app

# Monitoring (Optional)
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info
```

### 3.3 Deploy Backend

```bash
# Deploy to Railway
railway up

# Run database migrations
railway run npx prisma migrate deploy

# Check logs
railway logs
```

### 3.4 Create Worker Service

1. In Railway dashboard, create new service
2. Link same GitHub repo
3. Set root directory to `/api`
4. Add same environment variables
5. Set start command: `npm run worker`

---

## Part 4: Frontend Deployment (Vercel)

### 4.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import GitHub repository
4. Select root directory: `/` (project root)

### 4.2 Configure Build Settings

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### 4.3 Environment Variables

Add in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=<railway-backend-url>
NODE_ENV=production
```

### 4.4 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit deployment URL

---

## Part 5: Post-Deployment Configuration

### 5.1 Update CORS Origins

In Railway backend, update `FRONTEND_URL`:
```env
FRONTEND_URL=https://your-app.vercel.app
```

### 5.2 Configure Custom Domain (Optional)

**Vercel:**
1. Go to Project Settings → Domains
2. Add custom domain
3. Configure DNS records

**Railway:**
1. Go to Service Settings → Networking
2. Add custom domain
3. Configure DNS records

### 5.3 Enable HTTPS

Both Vercel and Railway provide automatic HTTPS certificates.

---

## Part 6: Database Migrations

### Run Migrations

```bash
# From local machine
cd api
DATABASE_URL=<production-db-url> npx prisma migrate deploy

# Or via Railway CLI
railway run npx prisma migrate deploy
```

### Seed Database (Optional)

```bash
railway run npx prisma db seed
```

---

## Part 7: Monitoring Setup

### 7.1 Sentry Error Tracking

Already configured if `SENTRY_DSN` is set.

### 7.2 Railway Metrics

1. Go to Railway dashboard
2. Click on service
3. View metrics: CPU, Memory, Network

### 7.3 Vercel Analytics

1. Go to Vercel project
2. Enable Analytics in settings
3. View real-time metrics

### 7.4 Bull Board (Queue Monitoring)

Access at: `https://your-backend-url/admin/queues`

---

## Part 8: Health Checks

### Backend Health Check

```bash
curl https://your-backend-url/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "database": "connected",
  "redis": "connected",
  "qdrant": "connected"
}
```

### Frontend Health Check

Visit: `https://your-frontend-url`

Should load the landing page.

---

## Part 9: Scaling Configuration

### Backend Scaling (Railway)

1. Go to Service Settings
2. Adjust resources:
   - CPU: 2 vCPU
   - Memory: 2 GB
   - Replicas: 2-3 for high availability

### Worker Scaling

1. Create multiple worker services
2. Each handles different queue types
3. Scale based on queue depth

### Database Scaling (Neon)

1. Upgrade to Pro plan for autoscaling
2. Configure compute units
3. Enable connection pooling

---

## Part 10: Backup Strategy

### Database Backups

Neon provides automatic daily backups.

Manual backup:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Redis Backups

Upstash provides automatic backups.

### Code Backups

GitHub repository serves as code backup.

---

## Part 11: CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

---

## Part 12: Environment Variables Checklist

### Backend (.env)
```
✅ DATABASE_URL
✅ REDIS_HOST
✅ REDIS_PORT
✅ REDIS_PASSWORD
✅ QDRANT_URL
✅ QDRANT_API_KEY
✅ HUGGINGFACE_API_KEY
✅ DEEPSEEK_API_KEY
✅ NODE_ENV
✅ PORT
✅ FRONTEND_URL
✅ SENTRY_DSN (optional)
✅ LOG_LEVEL
```

### Frontend (.env)
```
✅ NEXT_PUBLIC_API_URL
✅ NODE_ENV
```

---

## Part 13: Troubleshooting

### Backend Not Starting

1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Check database connection
4. Verify Prisma migrations

### Frontend Build Failing

1. Check Vercel build logs
2. Verify Next.js configuration
3. Check for missing dependencies
4. Verify API URL is set

### Database Connection Issues

1. Verify DATABASE_URL format
2. Check Neon dashboard for status
3. Verify IP whitelist (if enabled)
4. Test connection locally

### Redis Connection Issues

1. Verify Upstash credentials
2. Check Redis dashboard
3. Test connection with redis-cli

---

## Part 14: Performance Optimization

### Frontend
- Enable Vercel Edge Network
- Configure caching headers
- Optimize images
- Enable compression

### Backend
- Enable Redis caching
- Optimize database queries
- Use connection pooling
- Enable gzip compression

---

## Part 15: Security Checklist

- ✅ HTTPS enabled (automatic)
- ✅ Environment variables secured
- ✅ CORS configured
- ✅ Rate limiting enabled
- ✅ Helmet.js security headers
- ✅ Input validation (Zod)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ CSRF protection

---

## Part 16: Cost Estimation

### Monthly Costs (Estimated)

- **Vercel**: $0 (Hobby) or $20 (Pro)
- **Railway**: $5-20 (based on usage)
- **Neon**: $0 (Free tier) or $19+ (Pro)
- **Upstash**: $0 (Free tier) or $10+ (Pro)
- **Qdrant**: $0 (Free tier) or $25+ (Cloud)
- **Hugging Face**: Pay per use (~$0.001/request)
- **DeepSeek**: Pay per use (~$0.002/request)
- **Sentry**: $0 (Free tier) or $26+ (Team)

**Total**: $5-100/month depending on usage

---

## Part 17: Launch Checklist

### Pre-Launch
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Error tracking configured
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] CORS configured
- [ ] Custom domain configured (optional)

### Launch
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Verify all services running
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics

### Post-Launch
- [ ] Monitor logs for 24 hours
- [ ] Check error tracking dashboard
- [ ] Verify queue processing
- [ ] Test from different locations
- [ ] Gather user feedback
- [ ] Plan scaling strategy

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Upstash Docs**: https://docs.upstash.com
- **Qdrant Docs**: https://qdrant.tech/documentation

---

*Last Updated: 2024-01-01*
*CodeAtlas v2.0*