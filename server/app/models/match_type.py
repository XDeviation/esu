from typing import List, Optional

from pydantic import BaseModel


class MatchTypeBase(BaseModel):
    name: str
    is_private: bool = False
    invite_code: Optional[str] = None


class MatchTypeCreate(MatchTypeBase):
    pass


class MatchType(MatchTypeBase):
    id: int
    users: List[str] = []  # 存储用户ID列表
    creator_id: Optional[str] = None  # 创建者ID，可选字段

    class Config:
        from_attributes = True
