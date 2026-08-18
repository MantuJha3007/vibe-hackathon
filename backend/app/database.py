from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    async with engine.begin() as conn:
        from app.models import ticket  # noqa: F401 — ensure model is registered
        await conn.run_sync(Base.metadata.create_all)

        # Check and migrate columns in SQLite if needed
        try:
            res = await conn.execute(text("PRAGMA table_info(tickets)"))
            columns = [row[1] for row in res.fetchall()]
            if "location_accuracy" not in columns:
                await conn.execute(text("ALTER TABLE tickets ADD COLUMN location_accuracy FLOAT"))
            if "location_source" not in columns:
                await conn.execute(text("ALTER TABLE tickets ADD COLUMN location_source VARCHAR(32) DEFAULT 'gps'"))
            if "location_timestamp" not in columns:
                await conn.execute(text("ALTER TABLE tickets ADD COLUMN location_timestamp DATETIME"))
        except Exception:
            pass

