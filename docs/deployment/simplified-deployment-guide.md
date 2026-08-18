# AgencyOS Simplified Deployment Guide
# 2 Frontend Architecture - Production Ready

## 🎯 New Architecture Overview

**Simplified to 2 Frontends Only:**

### Frontend (Vercel)
- **agency-web** - Public website: `https://trifusiondynamics.vercel.app`
- **admin-dashboard** - Unified internal system: `https://trifusiondynamicsadmin.vercel.app/login`

### Backend (Render)
- **services/auth** - NestJS API Gateway
- **services/ai-service** - FastAPI Python AI Service

### Databases (External)
- **PostgreSQL** - Neon
- **MongoDB** - Atlas
- **Redis** - Upstash

---

## 🔑 Key Changes

### Role-Based Routing
All users now login through **single portal**: `https://trifusiondynamicsadmin.vercel.app/login`

**Automatic Role-Based Redirect:**
- **Superadmin** → `/super-admin`
- **Admin** → `/dashboard`
- **Client** → `/client/dashboard`
- **Agent** → `/agent/dashboard`
- **Employee** → `/employee/tickets`
- **HR** → `/hr/employees`
- **Sales** → `/crm/leads`
- **Support** → `/tickets`

### WebSocket Integration
Real-time features enabled for:
- Ticket assignments
- New messages
- Task updates
- Project changes
- Invoice creation
- Lead notifications
- User online status

---

## 🚀 Deployment Steps

### Step 1: Database Setup (30 minutes)

#### PostgreSQL (Neon)
1. Go to [neon.tech](https://neon.tech) → Create account
2. Create project: `agency-os-production`
3. Get connection string:
   ```
   postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
   ```

#### MongoDB Atlas
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create account
2. Create cluster: `agency-os-analytics`
3. IP whitelist: `0.0.0.0/0`
4. Get connection string:
   ```
   mongodb+srv://user:password@cluster0.xyz.mongodb.net/agency_analytics
   ```

#### Redis (Upstash)
1. Go to [upstash.com](https://upstash.com) → Create account
2. Create Redis database: `agency-os-cache`
3. Get connection string:
   ```
   redis://default:password@xyz.upstash.io:6379
   ```

### Step 2: Backend Deployment (Render) - 20 minutes

1. Go to [render.com](https://render.com) → Create account
2. Connect GitHub repository
3. Deploy **NestJS Auth Service**:
   - New Web Service → Select `AgencyOS` repo
   - Build: `cd services/auth && pnpm install && pnpm build`
   - Start: `cd services/auth && pnpm start:prod`
   - Add environment variables (see below)

4. Deploy **AI Service**:
   - New Web Service → Docker runtime
   - Docker context: `services/ai-service`
   - Add AI API keys

### Step 3: Frontend Deployment (Vercel) - 20 minutes

1. Go to [vercel.com](https://vercel.com) → Create account
2. Connect GitHub repository

#### Deploy Agency Web (Public Website)
- New Project → Select `AgencyOS` repo
- Root Directory: `apps/agency-web`
- Framework: Next.js
- Build Command: `pnpm build`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL`: Your Render backend URL
  - `NEXT_PUBLIC_ADMIN_DASHBOARD_URL`: Your admin dashboard Vercel URL
- Deploy → URL: `https://trifusiondynamics.vercel.app`

#### Deploy Admin Dashboard (Internal System)
- New Project → Select `AgencyOS` repo
- Root Directory: `apps/admin-dashboard`
- Framework: Next.js
- Build Command: `pnpm build`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL`: Your Render backend URL
  - `NEXT_PUBLIC_ADMIN_DASHBOARD_URL`: Your admin dashboard Vercel URL
  - `NEXT_PUBLIC_WS_URL`: Your WebSocket URL (e.g., `wss://your-backend.onrender.com/ws`)
- Deploy → URL: `https://trifusiondynamicsadmin.vercel.app`

### Step 4: Update CORS - 5 minutes

After deploying frontends, update backend CORS:
```bash
CORS_ALLOWED_ORIGINS=https://trifusiondynamicsadmin.vercel.app,https://trifusiondynamics.vercel.app
```

---

## 🔐 Environment Variables

### Backend (Render)
```bash
# Database
DATABASE_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require
MONGODB_URL=mongodb+srv://user:password@cluster0.xyz.mongodb.net/agency_analytics
REDIS_URL=redis://default:password@xyz.upstash.io:6379

# JWT Secrets (Generate 64+ char random strings)
JWT_ACCESS_SECRET=your-64-character-random-secret-key-here
JWT_REFRESH_SECRET=your-64-character-random-secret-key-here

# Admin
ADMIN_EMAIL=admin@trifusiondynamics.com
ADMIN_PASSWORD=your-secure-admin-password-here
DEFAULT_TEMP_PASSWORD=Welcome@123

# CORS (Update with actual Vercel URLs)
CORS_ALLOWED_ORIGINS=https://trifusiondynamicsadmin.vercel.app,https://trifusiondynamics.vercel.app
COOKIE_DOMAIN=

# AI Services (Optional)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# Node
NODE_ENV=production
PORT=8000
```

### Frontend - Agency Web (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
```

### Frontend - Admin Dashboard (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com/ws
```

---

## 🎯 Login Flow

### Unified Login Portal
**URL:** `https://trifusiondynamicsadmin.vercel.app/login`

1. User enters email/phone and password
2. System authenticates with backend API
3. Backend generates exchange code
4. User redirected to `/auth/callback` with exchange code
5. Exchange code validated and tokens stored
6. **Automatic redirect based on user role:**
   - Superadmin → `/super-admin`
   - Admin → `/dashboard`
   - Client → `/client/dashboard`
   - Agent → `/agent/dashboard`
   - Employee → `/employee/tickets`
   - HR → `/hr/employees`
   - Sales → `/crm/leads`
   - Support → `/tickets`

---

## 🔌 WebSocket Integration

### Real-time Features Enabled
- **Ticket System** - Real-time assignment and updates
- **Messaging** - Instant chat notifications
- **Tasks** - Real-time task assignments
- **Projects** - Live project updates
- **Invoices** - Instant invoice notifications
- **Leads** - Real-time lead creation alerts
- **User Status** - Online/offline status tracking

### WebSocket Usage
```typescript
import { useWebSocket, WebSocketEvents } from '@/lib/websocket';

function MyComponent() {
  const { isConnected, messages, sendMessage, lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === WebSocketEvents.TICKET_ASSIGNED) {
      // Handle ticket assignment
    }
  }, [lastMessage]);

  return (
    <div>
      <div>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</div>
    </div>
  );
}
```

---

## 📊 Deployment URLs

### Production URLs
- **Public Website:** `https://trifusiondynamics.vercel.app`
- **Internal System:** `https://trifusiondynamicsadmin.vercel.app/login`
- **Backend API:** `https://agency-os-backend.onrender.com/api`
- **AI Service:** `https://agency-os-ai-service.onrender.com`
- **WebSocket:** `wss://agency-os-backend.onrender.com/ws`

---

## ✅ Verification Checklist

### Before Deployment
- [ ] Neon PostgreSQL database created
- [ ] MongoDB Atlas cluster created
- [ ] Upstash Redis database created
- [ ] JWT secrets generated (64+ characters)
- [ ] Render account created
- [ ] Vercel account created
- [ ] AI API keys obtained (optional)

### After Deployment
- [ ] Backend health check: `curl https://agency-os-backend.onrender.com/api/health`
- [ ] AI service health: `curl https://agency-os-ai-service.onrender.com/health`
- [ ] Agency web loading: `https://trifusiondynamics.vercel.app`
- [ ] Admin dashboard login: `https://trifusiondynamicsadmin.vercel.app/login`
- [ ] CORS updated with actual Vercel URLs
- [ ] Role-based routing tested
- [ ] WebSocket connection tested
- [ ] Database migrations run

---

## 🔧 Troubleshooting

### Login Not Redirecting
- Check user roles in database
- Verify role-based routing logic in `/auth/callback`
- Check browser console for errors

### WebSocket Not Connecting
- Verify `NEXT_PUBLIC_WS_URL` environment variable
- Check backend WebSocket endpoint
- Ensure CORS allows WebSocket connections

### CORS Errors
- Update `CORS_ALLOWED_ORIGINS` with actual Vercel URLs
- Check backend environment variables
- Verify frontend API_URL configuration

### Build Failures
- Ensure pnpm is installed
- Check Node.js version (20+)
- Clear cache: `rm -rf .next node_modules`

---

## 📖 Architecture Summary

### Simplified Structure
```
AgencyOS/
├── apps/
│   ├── agency-web/          # Public website (Vercel)
│   └── admin-dashboard/     # Unified internal system (Vercel)
├── services/
│   ├── auth/               # NestJS API (Render)
│   └── ai-service/         # FastAPI AI (Render)
└── packages/
    ├── database/           # Prisma schema
    ├── ui/                 # Shared components
    └── types/              # TypeScript types
```

### Role-Based Access
All internal users access through single portal with automatic routing based on role. No need for separate client portal or auth gateway.

---

## 🎉 Benefits of Simplified Architecture

1. **Easier Deployment** - Only 2 frontends to manage
2. **Unified Login** - Single login URL for all internal users
3. **Automatic Routing** - Role-based redirects handled automatically
4. **Real-time Features** - WebSocket integration for live updates
5. **Simplified CORS** - Only 2 origins to manage
6. **Reduced Complexity** - Less infrastructure to maintain
7. **Better UX** - Seamless role-based experience

---

## 🚀 Ready for Production!

**Total Deployment Time:** ~1 hour
**Complexity:** Low
**Risk Level:** Minimal

**Deployment Status:** ✅ PRODUCTION READY
**Last Updated:** August 15, 2026
