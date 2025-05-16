from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    ADMIN = "admin"  # 超级管理员
    MODERATOR = "moderator"  # 版主/管理员
    PLAYER = "player"  # 普通玩家


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.PLAYER  # 默认为普通玩家


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB(User):
    hashed_password: str
