from pydantic import BaseModel


class MatchTypeBase(BaseModel):
    name: str


class MatchTypeCreate(MatchTypeBase):
    pass


class MatchType(MatchTypeBase):
    id: int

    class Config:
        from_attributes = True
