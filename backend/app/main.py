from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import create_tables
from app.routers import complaints, tickets


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title="Sentinel — Civic Complaint Intelligence",
    description="AI-powered civic issue tracking and resolution platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(tickets.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "Sentinel API", "version": "1.0.0"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy"}
