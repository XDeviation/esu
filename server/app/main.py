from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.endpoints import (
    auth,
    decks,
    environments,
    match_results,
    match_types,
    statistics,
)
from .core.config import config
from .db.mongodb import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect_to_database()
    yield
    await db.close_database_connection()


app = FastAPI(
    title=config["app"]["name"],
    version=config["app"]["version"],
    debug=config["app"]["debug"],
    lifespan=lifespan,
)

# CORS 设置
app.add_middleware(
    CORSMiddleware,
    allow_origins=config["cors"]["allow_origins"],
    allow_credentials=config["cors"]["allow_credentials"],
    allow_methods=config["cors"]["allow_methods"],
    allow_headers=config["cors"]["allow_headers"],
)

# 注册路由
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(
    environments.router, prefix="/api/v1/environments", tags=["environments"]
)
app.include_router(decks.router, prefix="/api/v1/decks", tags=["decks"])
app.include_router(
    match_types.router, prefix="/api/v1/match-types", tags=["match-types"]
)
app.include_router(
    match_results.router, prefix="/api/v1/match-results", tags=["match-results"]
)
app.include_router(statistics.router, prefix="/api/v1", tags=["statistics"])
