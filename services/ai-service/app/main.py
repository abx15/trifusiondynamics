from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from .config import settings
from .routers import proposal_generator, seo_audit, email_writer, meeting_summary, chat
import sentry_sdk
import os
import time
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse

sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
if sentry_dsn and not sentry_dsn.startswith("https://placeholder"):
    try:
        sentry_sdk.init(
            dsn=sentry_dsn,
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
    except Exception as e:
        print(f"Warning: Sentry initialization failed: {e}")

app = FastAPI(
    title="Trifusion-Dynamics AI Service",
    description="Internal FastAPI service for AI functionality",
    version="1.0.0"
)

# CORS Configuration - Read from environment variable or use development defaults
cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
if cors_origins:
    allowed_origins = [origin.strip() for origin in cors_origins.split(",")]
else:
    # Development defaults
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8001"
    ]

# Restrict allowed methods and headers instead of using wildcards.
ALLOWED_METHODS = ["GET", "POST", "OPTIONS"]
ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Internal-Secret", "X-Request-ID"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
)

# Lightweight in-memory rate limiter (defense in depth; the service is also
# protected by the X-Internal-Secret dependency). Per-client-IP, not distributed.
_RATE_LIMIT = 120
_RATE_WINDOW = 60  # seconds
_rate_store: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client = request.client.host if request.client else "unknown"
    now = time.time()
    hits = _rate_store[client]
    # Drop timestamps outside the window
    _rate_store[client] = [t for t in hits if now - t < _RATE_WINDOW]
    if len(_rate_store[client]) >= _RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests, please try again later."},
        )
    _rate_store[client].append(now)
    return await call_next(request)


app.include_router(proposal_generator.router)
app.include_router(seo_audit.router)
app.include_router(email_writer.router)
app.include_router(meeting_summary.router)
app.include_router(chat.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
