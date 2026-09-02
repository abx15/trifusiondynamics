# AgencyOS Complete Deployment Guide
# Trifusion Dynamics - Production Deployment Setup

## 🏗️ Architecture Overview

AgencyOS is a full-stack agency management system with the following components:

### Frontend Applications (Vercel)
- **admin-dashboard** - Main admin panel for staff/employees
- **auth-gateway** - Standalone authentication service
- **agency-web** - Public marketing website
- **client-portal** - Client-facing portal (minimal structure currently)

### Backend Services (Render)
- **auth** - NestJS API Gateway (main business logic)
- **ai-service** - FastAPI Python service for AI features

### Databases (External)
- **PostgreSQL** - Primary database via Neon
- **MongoDB** - Analytics/NoSQL via MongoDB Atlas
- **Redis** - Caching layer (Upstash recommended)

---

## 🚀 Step-by-Step Deployment

### Phase 1: Database Setup

#### 1.1 PostgreSQL (Neon)
1. Go to [neon.tech](https://neon.tech) and create account
2. Create a new project:
   - Name: `agency-os-production`
   - Region: Choose closest to your users
3. Get connection string:
   ```
   postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
   ```
4. Save as `DATABASE_URL` and `DIRECT_URL`

#### 1.2 MongoDB Atlas
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) and create account
2. Create a new cluster:
   - Name: `agency-os-analytics`
   - Tier: M0 (Free) or M2+ for production
3. Create database user:
   - Username: `agency_admin`
   - Password: Generate strong password
4. Whitelist IP: `0.0.0.0/0` (for Render access)
5. Get connection string:
   ```
   mongodb+srv://agency_admin:password@cluster0.xyz.mongodb.net/agency_analytics?retryWrites=true&w=majority
   ```
6. Save as `MONGODB_URL`

#### 1.3 Redis (Upstash)
1. Go to [upstash.com](https://upstash.com) and create account
2. Create a new Redis database:
   - Name: `agency-os-cache`
   - Region: Choose closest to Render
3. Get connection string:
   ```
   redis://default:password@xyz.upstash.io:6379
   ```
4. Save as `REDIS_URL`

---

### Phase 2: Backend Deployment (Render)

#### 2.1 Deploy NestJS Auth Service

1. **Prepare Render Account**
   - Go to [render.com](https://render.com) and create account
   - Connect your GitHub repository

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect to your `AgencyOS` repository
   - Configure:
     - **Name**: `agency-os-backend`
     - **Region**: Same as databases
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

3. **Environment Variables**
   Add these in Render dashboard:
   
   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
   DIRECT_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
   MONGODB_URL=mongodb+srv://agency_admin:password@cluster0.xyz.mongodb.net/agency_analytics?retryWrites=true&w=majority
   REDIS_URL=redis://default:password@xyz.upstash.io:6379
   
   # JWT Secrets (Generate secure random strings)
   JWT_ACCESS_SECRET=your-64-char-random-secret-here
   JWT_REFRESH_SECRET=your-64-char-random-secret-here
   
   # Admin
   ADMIN_EMAIL=admin@trifusiondynamics.com
    ADMIN_PASSWORD=your-secure-admin-password
    DEFAULT_TEMP_PASSWORD=trifusiondynamicsA3web
   
   # CORS (Update with actual Vercel URLs after deployment)
   CORS_ALLOWED_ORIGINS=https://your-admin.vercel.app,https://your-auth.vercel.app,https://your-client.vercel.app,https://your-web.vercel.app
   COOKIE_DOMAIN=
   
   # AI API Keys (Optional - for AI features)
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENAI_API_KEY=your-openai-key
   GEMINI_API_KEY=your-gemini-key
   
   # Node
   NODE_ENV=production
   PORT=8000
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-5 minutes)
   - Copy the service URL: `https://agency-os-backend.onrender.com`

#### 2.2 Deploy AI Service (Optional)

1. **Create Docker-based Web Service**
   - Click "New +" → "Web Service"
   - Configure:
     - **Name**: `agency-os-ai-service`
     - **Runtime**: `Docker`
     - **Docker Context**: `services/ai-service`
     - **Dockerfile Path**: `services/ai-service/Dockerfile`

2. **Environment Variables**
   ```bash
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENAI_API_KEY=your-openai-key
   GEMINI_API_KEY=your-gemini-key
   DATABASE_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
   SENTRY_DSN=your-sentry-dsn-optional
   ```

3. **Deploy**
   - Click "Create Web Service"
   - Copy the service URL: `https://agency-os-ai-service.onrender.com`

---

### Phase 3: Frontend Deployment (Vercel)

#### 3.1 Prepare Vercel Account
1. Go to [vercel.com](https://vercel.com) and create account
2. Connect your GitHub repository
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_API_URL` - Your Render backend URL
   - `NEXT_PUBLIC_AUTH_GATEWAY_URL` - Your auth-gateway Vercel URL
   - `NEXT_PUBLIC_ADMIN_DASHBOARD_URL` - Your admin-dashboard Vercel URL
   - `NEXT_PUBLIC_CLIENT_PORTAL_URL` - Your client-portal Vercel URL
   - `NEXT_PUBLIC_AGENCY_WEB_URL` - Your agency-web Vercel URL

#### 3.2 Deploy Admin Dashboard
1. Click "Add New Project"
2. Select `AgencyOS` repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/admin-dashboard`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
4. Add environment variables
5. Click "Deploy"
6. Copy URL: `https://your-admin.vercel.app`

#### 3.3 Deploy Auth Gateway
1. Click "Add New Project"
2. Select `AgencyOS` repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/auth-gateway`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
4. Add environment variables
5. Click "Deploy"
6. Copy URL: `https://your-auth.vercel.app`

#### 3.4 Deploy Agency Web
1. Click "Add New Project"
2. Select `AgencyOS` repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/agency-web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
4. Add environment variables
5. Click "Deploy"
6. Copy URL: `https://your-web.vercel.app`

#### 3.5 Deploy Client Portal
1. Click "Add New Project"
2. Select `AgencyOS` repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/client-portal`
   - **Build Command**: `pnpm build` (if package.json exists)
   - **Output Directory**: `.next`
4. Add environment variables
5. Click "Deploy"
6. Copy URL: `https://your-client.vercel.app`

---

### Phase 4: Update CORS Configuration

After deploying all frontends, update the backend CORS:

1. Go to Render → `agency-os-backend` → Environment Variables
2. Update `CORS_ALLOWED_ORIGINS` with actual Vercel URLs:
   ```bash
   CORS_ALLOWED_ORIGINS=https://your-admin.vercel.app,https://your-auth.vercel.app,https://your-client.vercel.app,https://your-web.vercel.app
   ```
3. Trigger a redeploy

---

### Phase 5: Database Migration

1. SSH into Render backend or use Render shell
2. Run database migrations:
   ```bash
   cd services/auth
   pnpm db:push
   pnpm db:generate
   ```
3. Seed initial data if needed:
   ```bash
   pnpm db:seed
   ```

---

## 🔧 AI Service Configuration

### AI Service Status
The AI service is **fully functional** and supports:
- **Proposal Generator** - Generate business proposals
- **SEO Audit** - Website SEO analysis
- **Email Writer** - Professional email generation
- **Meeting Summary** - Meeting transcript summarization
- **AI Chat Assistant** - Conversational AI

### AI Providers (Priority Order)
1. **Gemini** (Google) - Primary if key available
2. **Anthropic** (Claude) - Secondary
3. **OpenAI** (GPT) - Tertiary
4. **Mock Mode** - Fallback for testing without keys

### Testing AI Service
```bash
# Health check
curl https://agency-os-ai-service.onrender.com/health

# Test chat endpoint
curl -X POST https://agency-os-ai-service.onrender.com/internal/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

---

## 🔐 Security Checklist

- [ ] All JWT secrets are 64+ characters
- [ ] Database passwords are strong
- [ ] API keys are not committed to git
- [ ] CORS is properly configured
- [ ] Redis is using TLS
- [ ] MongoDB IP whitelist is configured
- [ ] SSL is enabled on all connections
- [ ] Environment variables are set in production

---

## 📊 Monitoring & Logging

### Recommended Services
- **Sentry** - Error tracking (already integrated)
- **LogRocket** - Frontend session replay
- **Render Logs** - Backend logs
- **Vercel Analytics** - Frontend analytics

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Already Configured)
- `.github/workflows/backend-ci.yml` - Backend testing
- `.github/workflows/api-integration-tests.yml` - API tests

### Manual Deployment Trigger
```bash
# Push to main branch triggers automatic deployment
git push origin main
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Check DATABASE_URL format
- Verify IP whitelist in MongoDB Atlas
- Ensure SSL mode is enabled

**2. CORS Errors**
- Update CORS_ALLOWED_ORIGINS with actual Vercel URLs
- Check frontend API_URL configuration

**3. AI Service Not Responding**
- Verify API keys are set
- Check Render service logs
- Test health endpoint

**4. Build Failures**
- Ensure pnpm is installed
- Check Node.js version (20+)
- Verify all dependencies are installed

---

## 📞 Support

For deployment issues:
1. Check Render logs
2. Check Vercel deployment logs
3. Review this guide
4. Check GitHub issues

---

## ✅ Deployment Verification

After deployment, verify:

1. **Backend Health**
   ```bash
   curl https://agency-os-backend.onrender.com/api/health
   ```

2. **AI Service Health**
   ```bash
   curl https://agency-os-ai-service.onrender.com/health
   ```

3. **Frontend Loading**
   - Visit each Vercel URL
   - Check browser console for errors
   - Test login functionality

4. **Database Connection**
   - Check Render logs for DB errors
   - Verify Prisma migrations ran successfully

---

## 🎉 Success Criteria

- ✅ All services deployed and accessible
- ✅ Database migrations completed
- ✅ Frontend can communicate with backend
- ✅ AI service responds to requests
- ✅ Login/Authentication works
- ✅ No CORS errors
- ✅ Environment variables properly set

---

**Deployment Complete! 🚀**
