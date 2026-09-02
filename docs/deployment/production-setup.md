# Production Deployment Guide - Render + Vercel

## Overview
This guide covers deploying AgencyOS to production using:
- **Render**: Backend services (NestJS API)
- **Vercel**: Frontend applications (Next.js apps)
- **External Services**: PostgreSQL (Neon), MongoDB (Atlas), Redis (Upstash)

---

## PART 1: BACKEND DEPLOYMENT (RENDER)

### 1.1 Prerequisites
- Render account (https://render.com)
- PostgreSQL database (Neon recommended)
- MongoDB database (MongoDB Atlas recommended)
- Redis instance (Upstash recommended for free tier)

### 1.2 Create Render Web Service

**Manual Setup Steps:**
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure service settings:
   - **Name**: `agency-os-backend`
   - **Region**: Choose nearest region
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     cd services/auth && pnpm install && pnpm build
     ```
   - **Start Command**:
     ```bash
     cd services/auth && pnpm start:prod
     ```

### 1.3 Environment Variables for Render

Set these environment variables in Render Dashboard:

#### Database Configuration
```bash
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/agencyos?retryWrites=true&w=majority
REDIS_URL=redis://default:password@xxx.upstash.io:6379
```

#### JWT Secrets (Generate strong secrets)
```bash
JWT_ACCESS_SECRET=your-generated-64-char-secret
JWT_REFRESH_SECRET=your-generated-64-char-secret
```

#### Admin Configuration
```bash
ADMIN_EMAIL=admin@trifusiondynamics.com
ADMIN_PASSWORD=your-secure-admin-password
DEFAULT_TEMP_PASSWORD=trifusiondynamicsA3web
```

#### CORS Configuration (Vercel URLs)
```bash
CORS_ALLOWED_ORIGINS=https://trifusiondynamicsauth.vercel.app,https://trifusiondynamicsadmin.vercel.app,https://trifusiondynamicsclient.vercel.app,https://trifusiondynamicsweb.vercel.app
COOKIE_DOMAIN=
```

#### AI Service Configuration
```bash
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

#### Node Configuration
```bash
NODE_ENV=production
PORT=8000
```

### 1.4 Redis Provider Decision
**Option A: Upstash (Recommended for Render)**
- Free tier available
- Easy integration with Render
- Sign up: https://upstash.com
- Create Redis database and copy connection string

**Option B: Render Redis (Add-on)**
- Available as paid add-on
- More expensive but integrated
- Add in Render dashboard

**Option C: Self-hosted Redis**
- Requires additional infrastructure
- Not recommended for production

### 1.5 Database Setup

**PostgreSQL (Neon)**
1. Sign up at https://neon.tech
2. Create new project
3. Copy connection string (use both pooled and direct URLs)
4. Run database migrations:
   ```bash
   # Locally, after setting DATABASE_URL
   pnpm --filter database db:push
   pnpm --filter database db:generate
   pnpm --filter database db:seed
   ```

**MongoDB (Atlas)**
1. Sign up at https://mongodb.com/cloud/atlas
2. Create new cluster (free tier available)
3. Create database user with read/write permissions
4. Whitelist Render's IP addresses
5. Copy connection string

### 1.6 Deploy Backend
1. Push changes to GitHub
2. Render will auto-deploy from your branch
3. Monitor deployment logs
4. Test health endpoint: `https://your-backend.onrender.com/health`

---

## PART 2: FRONTEND DEPLOYMENT (VERCEL)

### 2.1 Prerequisites
- Vercel account (https://vercel.com)
- Backend deployed on Render
- DNS configured (optional custom domains)

### 2.2 Deploy Auth Gateway

**Environment Variables for Auth Gateway:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_AUTH_GATEWAY_URL=https://trifusiondynamicsauth.vercel.app
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://trifusiondynamicsclient.vercel.app
NEXT_PUBLIC_AGENCY_WEB_URL=https://trifusiondynamicsweb.vercel.app
```

**Deployment Steps:**
1. Go to Vercel → Add New Project
2. Import GitHub repository
3. Select `apps/auth-gateway` directory
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/auth-gateway`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
5. Add environment variables above
6. Deploy

### 2.3 Deploy Admin Dashboard

**Environment Variables for Admin Dashboard:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_AUTH_GATEWAY_URL=https://trifusiondynamicsauth.vercel.app
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://trifusiondynamicsclient.vercel.app
NEXT_PUBLIC_AGENCY_WEB_URL=https://trifusiondynamicsweb.vercel.app
```

**Deployment Steps:**
1. Add new project in Vercel
2. Import same repository
3. Select `apps/admin-dashboard` directory
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/admin-dashboard`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
5. Add environment variables above
6. Deploy

### 2.4 Deploy Agency Web (Public Site)

**Environment Variables for Agency Web:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_AUTH_GATEWAY_URL=https://trifusiondynamicsauth.vercel.app
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://trifusiondynamicsclient.vercel.app
NEXT_PUBLIC_AGENCY_WEB_URL=https://trifusiondynamicsweb.vercel.app
```

**Deployment Steps:**
1. Add new project in Vercel
2. Import same repository
3. Select `apps/agency-web` directory
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/agency-web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
5. Add environment variables above
6. Deploy

### 2.5 Deploy Client Portal (Future)

**Environment Variables for Client Portal:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_AUTH_GATEWAY_URL=https://trifusiondynamicsauth.vercel.app
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://trifusiondynamicsclient.vercel.app
NEXT_PUBLIC_AGENCY_WEB_URL=https://trifusiondynamicsweb.vercel.app
```

**Deployment Steps:**
1. Add new project in Vercel
2. Import same repository
3. Select `apps/client-portal` directory
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/client-portal`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
5. Add environment variables above
6. Deploy

---

## PART 3: AI SERVICE DEPLOYMENT (RENDER)

### 3.1 Create AI Service on Render

**Manual Setup Steps:**
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure service settings:
   - **Name**: `agency-os-ai-service`
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Runtime**: `Python`
   - **Build Command**:
     ```bash
     cd services/ai-service
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd services/ai-service
     uvicorn main:app --host 0.0.0.0 --port 8001
     ```

### 3.2 Environment Variables for AI Service

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

## PART 4: POST-DEPLOYMENT VERIFICATION

### 4.1 Health Checks

**Backend Health Check:**
```bash
curl https://your-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "mongodb": "connected"
}
```

**AI Service Health Check:**
```bash
curl https://your-ai-service.onrender.com/health
```

### 4.2 Test Authentication Flow

1. Navigate to: `https://trifusiondynamicsauth.vercel.app`
2. Login with superadmin credentials
3. Verify redirect to admin dashboard works
4. Test exchange code flow
5. Verify session establishment

### 4.3 Test Database Connections

**PostgreSQL Connection:**
- Check backend logs for database connection status
- Verify CRUD operations work

**MongoDB Connection:**
- Check auth activity logs are being written
- Verify attendance punches work

**Redis Connection:**
- Test exchange code generation and redemption
- Verify caching works

---

## PART 5: DOMAIN CONFIGURATION (OPTIONAL)

### 5.1 Custom Domains

**For Production:**
1. Purchase domain (e.g., `trifusiondynamics.com`)
2. Add custom domains in Vercel:
   - `auth.trifusiondynamics.com` → Auth Gateway
   - `admin.trifusiondynamics.com` → Admin Dashboard
   - `portal.trifusiondynamics.com` → Client Portal
   - `www.trifusiondynamics.com` → Agency Web

3. Update environment variables to use custom domains
4. Update `COOKIE_DOMAIN=.trifusiondynamics.com`
5. Remove exchange-code pattern (use shared cookies)

### 5.2 SSL Certificates
- Vercel provides automatic SSL for custom domains
- Render provides automatic SSL for web services

---

## PART 6: MONITORING & LOGGING

### 6.1 Render Monitoring
- Enable metrics in Render dashboard
- Set up alerting for CPU/memory usage
- Monitor deployment logs

### 6.2 Vercel Analytics
- Enable Vercel Analytics
- Monitor performance metrics
- Track user behavior

### 6.3 Error Tracking
- Sentry is already integrated in backend
- Configure Sentry DSN in environment variables
- Monitor error rates and performance

---

## PART 7: BACKUP & DISASTER RECOVERY

### 7.1 Database Backups
- **Neon**: Automatic backups included
- **MongoDB Atlas**: Automatic backups included
- Verify backup retention policies

### 7.2 Application Backups
- GitHub serves as code backup
- Render deployments are versioned
- Vercel deployments are versioned

---

## TROUBLESHOOTING

### Common Issues

**1. Build Failures**
- Check build logs in Render/Vercel
- Verify all dependencies are in package.json
- Ensure environment variables are set

**2. Database Connection Issues**
- Verify connection strings are correct
- Check IP whitelisting (MongoDB Atlas)
- Verify SSL certificates

**3. CORS Issues**
- Verify CORS_ALLOWED_ORIGINS includes all frontend URLs
- Check cookie domain settings
- Verify same-site cookie policies

**4. Redis Connection Issues**
- Verify Redis URL is correct
- Check Redis service status
- Test Redis connection manually

---

## SECURITY CHECKLIST

- [ ] All secrets are set as environment variables
- [ ] Strong JWT secrets are configured
- [ ] Database passwords are strong
- [ ] SSL/TLS is enabled everywhere
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is active
- [ ] Authentication is working correctly
- [ ] Authorization is properly scoped
- [ ] Logging is enabled for audit trails
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up to date
- [ ] API keys are rotated regularly
