from pydantic import BaseModel


class MatchTypeBase(BaseModel):
    name: str
    require_permission: bool = False


class MatchTypeCreate(MatchTypeBase):
    pass


class MatchType(MatchTypeBase):
    id: int

    class Config:
        from_attributes = True
