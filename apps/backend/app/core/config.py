from typing import Any
from pydantic_settings import BaseSettings
from pydantic import AnyUrl, Field, AliasChoices


class Settings(BaseSettings):
    app_name: str = "Baant Lo"
    app_tagline: str = "Ab Sab Kuch Batega?"
    environment: str = "development"
    secret_key: str = Field(..., validation_alias=AliasChoices("SECRET_KEY"))
    database_url: AnyUrl = "postgresql+psycopg://postgres:postgres@db:5432/baantlo"
    redis_url: AnyUrl = "redis://redis:6379/0"
    redis_socket_timeout: float = Field(default=5.0, validation_alias=AliasChoices("REDIS_SOCKET_TIMEOUT"))
    redis_socket_connect_timeout: float = Field(default=5.0, validation_alias=AliasChoices("REDIS_SOCKET_CONNECT_TIMEOUT"))
    redis_health_check_interval: int = Field(default=30, validation_alias=AliasChoices("REDIS_HEALTH_CHECK_INTERVAL"))
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "media"
    minio_secure: bool = False
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    jwt_algorithm: str = "HS256"
    access_token_expires_minutes: int = Field(default=15, validation_alias=AliasChoices("ACCESS_TOKEN_TTL_MINUTES", "ACCESS_TOKEN_EXPIRES_MINUTES"))
    refresh_token_expires_minutes: int = Field(default=60 * 24 * 14, validation_alias=AliasChoices("REFRESH_TOKEN_TTL_MINUTES", "REFRESH_TOKEN_EXPIRES_MINUTES"))
    otp_ttl_seconds: int = Field(default=300, validation_alias=AliasChoices("OTP_TTL_SECONDS"))
    otp_rate_limit_window_seconds: int = Field(default=900, validation_alias=AliasChoices("OTP_RATE_LIMIT_WINDOW_SECONDS"))
    otp_max_requests_per_window: int = Field(default=5, validation_alias=AliasChoices("OTP_MAX_REQUESTS_PER_WINDOW"))
    cors_allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    cors_allowed_origins_raw: str | None = Field(
        default=None,
        validation_alias=AliasChoices("CORS_ALLOWED_ORIGINS"),
    )
    google_client_id: str | None = None
    smtp_host: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_HOST"))
    smtp_port: int | None = Field(default=587, validation_alias=AliasChoices("SMTP_PORT"))
    smtp_user: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_USER"))
    smtp_pass: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_PASS"))
    smtp_from: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_FROM"))
    smtp_secure: bool = Field(default=True, validation_alias=AliasChoices("SMTP_SECURE"))
    twilio_account_sid: str | None = Field(default=None, validation_alias=AliasChoices("TWILIO_ACCOUNT_SID"))
    twilio_auth_token: str | None = Field(default=None, validation_alias=AliasChoices("TWILIO_AUTH_TOKEN"))
    twilio_from_number: str | None = Field(default=None, validation_alias=AliasChoices("TWILIO_FROM_NUMBER"))
    frontend_base_url: str = "http://localhost:3000"
    social_auth_enabled: bool = False
    deep_link_scheme: str = "baantlo"
    universal_domain: str = "baantlo.app"
    admin_email: str | None = Field(default=None, validation_alias=AliasChoices("ADMIN_EMAIL"))
    admin_password: str | None = Field(default=None, validation_alias=AliasChoices("ADMIN_PASSWORD"))
    admin_display_name: str | None = Field(default=None, validation_alias=AliasChoices("ADMIN_DISPLAY_NAME"))
    admin_phone: str | None = Field(default=None, validation_alias=AliasChoices("ADMIN_PHONE"))

    class Config:
        env_file = ".env"
        case_sensitive = True

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        secret_placeholders = {
            "change-this-secret",
            "default-secret",
            "2JrmTbC1Gj4i1iuk8MWdq2ZxM1cMtMHTDbtIrfVjd34=",
        }
        if not self.secret_key or self.secret_key in secret_placeholders:
            raise ValueError(
                "SECRET_KEY environment variable must be set to a secure, unique value."
            )

        if self.cors_allowed_origins_raw:
            origins = [
                origin.strip()
                for origin in self.cors_allowed_origins_raw.split(",")
                if origin.strip()
            ]
            if origins:
                object.__setattr__(self, "cors_allowed_origins", origins)

        if not self.cors_allowed_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must specify at least one origin.")

        if "*" in self.cors_allowed_origins and self.environment.lower() in {"production", "prod"}:
            raise ValueError("Wildcard CORS origins are not allowed in production.")

        if self.environment.lower() in {"production", "prod"}:
            if not self.admin_email or not self.admin_password:
                raise ValueError(
                    "ADMIN_EMAIL and ADMIN_PASSWORD must be provided in production."
                )


settings = Settings()
