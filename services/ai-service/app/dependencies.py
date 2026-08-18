from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..config import settings

security = HTTPBearer(auto_error=False)

async def verify_internal_secret(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Allow health check without secret
    if request.url.path == "/health":
        return True

    # Check X-Internal-Secret header
    internal_secret = request.headers.get("X-Internal-Secret")
    if not internal_secret:
        raise HTTPException(status_code=403, detail="Missing internal secret")

    if settings.ai_service_secret and internal_secret != settings.ai_service_secret:
        raise HTTPException(status_code=403, detail="Invalid internal secret")

    return True
