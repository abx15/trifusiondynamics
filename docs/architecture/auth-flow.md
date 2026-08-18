# Authentication Flow Documentation

## Cross-Domain Authentication Strategy

### Deployment Context
The AgencyOS platform uses separate Vercel project domains for different applications:
- `https://trifusiondynamicsauth.vercel.app` - Auth Gateway
- `https://trifusiondynamicsadmin.vercel.app` - Admin Dashboard
- `https://trifusiondynamicsclient.vercel.app` - Client Portal (future)
- `https://trifusiondynamicsweb.vercel.app` - Public Website (future)

Since these are separate `.vercel.app` domains (not subdomains of a shared custom domain), httpOnly cookies cannot be shared between them. We use an **Exchange Code Pattern** for secure cross-domain authentication.

### Exchange Code Flow

#### 1. User Login
```
User → Auth Gateway (trifusiondynamicsauth.vercel.app)
      ↓
      POST /auth/login
      ↓
      Returns: accessToken, user, refreshToken
```

#### 2. Exchange Code Generation
```
Auth Gateway → Backend (Render)
            ↓
            POST /auth/generate-exchange-code
            ↓
            Returns: { code, redirectUrl }
```

The backend:
- Generates a short-lived (60 second) JWT exchange code
- Stores it in Redis with key `exchange_code:{code}` containing `{ userId, organizationId }`
- Returns the code and redirect URL

#### 3. Cross-Domain Redirect
```
Auth Gateway → Redirect to destination
            ↓
            https://trifusiondynamicsadmin.vercel.app/auth/callback?code={exchangeCode}
```

#### 4. Code Exchange
```
Destination App → Backend (Render)
                ↓
                POST /auth/exchange
                ↓
                Body: { code }
```

The backend:
- Validates the code exists in Redis and hasn't been used
- Deletes the code (single-use)
- Issues real access token + refresh token
- Returns tokens and user data

#### 5. Session Establishment
```
Destination App → Stores tokens
                ↓
                - accessToken in sessionStorage
                - refreshToken as httpOnly cookie (host-only)
                ↓
                Redirects to dashboard
```

### Security Benefits

1. **No Sensitive Data in URLs**: The exchange code is a short-lived, single-use token, not the actual access/refresh tokens
2. **60-Second Expiry**: Even if intercepted, the code becomes useless quickly
3. **Single-Use**: Code is deleted immediately after use
4. **Redis Storage**: Prevents replay attacks and allows revocation
5. **Host-Only Cookies**: Each app manages its own session independently

### Cookie Configuration

For production with separate `.vercel.app` domains:
- **No explicit Domain attribute** (host-only cookies)
- **Secure**: true (HTTPS only)
- **SameSite**: lax
- **HttpOnly**: true for refresh tokens

### Future Custom Domain Support

If custom subdomains are later configured (e.g., `admin.trifusiondynamics.com`, `auth.trifusiondynamics.com`):
1. Set `COOKIE_DOMAIN=.trifusiondynamics.com`
2. Remove exchange-code pattern
3. Use shared httpOnly cookies across subdomains
4. Simpler flow with direct redirects

### Environment Variables

Required for each frontend app:
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_AUTH_GATEWAY_URL=https://trifusiondynamicsauth.vercel.app
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://trifusiondynamicsadmin.vercel.app
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://trifusiondynamicsclient.vercel.app
```

Required for backend:
```bash
CORS_ALLOWED_ORIGINS=https://trifusiondynamicsauth.vercel.app,https://trifusiondynamicsadmin.vercel.app,https://trifusiondynamicsclient.vercel.app
COOKIE_DOMAIN=  # Empty for host-only cookies
REDIS_URL=your-redis-connection-string
```

### Implementation Files

**Backend:**
- `services/auth/src/modules/auth/auth.service.ts` - `generateExchangeCode()`, `exchangeCode()`
- `services/auth/src/modules/auth/auth.controller.ts` - `/auth/generate-exchange-code`, `/auth/exchange`
- `services/auth/src/modules/auth/dto/exchange-code.dto.ts` - DTOs

**Frontend:**
- `apps/auth-gateway/components/LoginForm.tsx` - Modified to use exchange code
- `apps/admin-dashboard/app/auth/callback/page.tsx` - Exchange code handler
- `apps/client-portal/app/auth/callback/page.tsx` - (future)

### Testing Locally

To test cross-domain behavior locally:
1. Run auth-gateway on port 3003
2. Run admin-dashboard on port 3001
3. Set environment variables to use localhost URLs
4. Test login flow - should redirect with exchange code
5. Verify code exchange works and session is established

### Error Handling

Common error scenarios:
1. **Code expired**: Show "Login link expired, please try again"
2. **Code already used**: Show "Session already used, please login again"
3. **Invalid code**: Show "Invalid authentication, please login again"
4. **Backend unavailable**: Fallback to traditional redirect (if implemented)

### Migration Notes

- Legacy cookie-based flow still works for same-domain deployments
- Exchange code pattern only activates when cross-domain redirect is needed
- No breaking changes to existing auth endpoints
- Gradual migration path available
