from fastapi import APIRouter
from .endpoints import prior_knowledge

api_router = APIRouter()
# ... existing routes ...
api_router.include_router(prior_knowledge.router, prefix="/prior-knowledge", tags=["prior-knowledge"]) 