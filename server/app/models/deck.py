from typing import Any, Dict, Optional

from pydantic import BaseModel


class DeckBase(BaseModel):
    name: str
    composition: Optional[Dict[str, Any]] = None
    deck_code: Optional[str] = None
    environment_id: int
    author_id: str
    description: Optional[str] = None


class DeckCreate(DeckBase):
    pass


class Deck(DeckBase):
    id: int

    class Config:
        from_attributes = True
