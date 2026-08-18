import os
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_backend_dir, ".env")


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinel.db"
    GROQ_MODEL: str = "groq/compound-mini"

    model_config = SettingsConfigDict(
        env_file=_env_file if os.path.exists(_env_file) else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
