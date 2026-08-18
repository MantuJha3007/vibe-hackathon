from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinel.db"
    GROQ_MODEL: str = "groq/compound-mini"

    class Config:
        env_file = ".env"


settings = Settings()
