from pydantic import BaseModel


class MatchResultBase(BaseModel):
    environment_id: int
    first_deck_id: int
    second_deck_id: int
    winning_deck_id: int
    losing_deck_id: int
    match_type_id: int = 1  # 默认使用第一个比赛类型


class MatchResultCreate(MatchResultBase):
    pass


class MatchResult(MatchResultBase):
    id: int

    class Config:
        from_attributes = True
