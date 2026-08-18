from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from .config import settings
from .routers import proposal_generator, seo_audit, email_writer, meeting_summary, chat
import sentry_sdk
import os

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proposal_generator.router)
app.include_router(seo_audit.router)
app.include_router(email_writer.router)
app.include_router(meeting_summary.router)
app.include_router(chat.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
