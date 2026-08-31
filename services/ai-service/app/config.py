from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pydantic import model_validator


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str = ""
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    ai_service_secret: Optional[str] = None

    # We allow importing from a local .env file if present
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def _require_internal_secret_in_production(self) -> "Settings":
        # The service-to-service internal secret is mandatory in production.
        # In development it may be empty, which disables the internal gate.
        if self.environment == "production" and not self.ai_service_secret:
            raise ValueError(
                "AI_SERVICE_SECRET must be set when ENVIRONMENT=production"
            )
        return self


settings = Settings()

