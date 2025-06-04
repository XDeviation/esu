from typing import Optional
from datetime import datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from pydantic import BaseModel

from ..core.config import config
from ..db.mongodb import db
from ..models.user import User, UserInDB, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


class TokenData(BaseModel):
    email: Optional[str] = None


async def get_user(email: str):
    user = await db.get_collection("users").find_one({"email": email})
    if user:
        user["id"] = str(user.pop("_id"))
        return UserInDB(**user)
    return None


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, config["jwt"]["secret_key"], algorithms=[config["jwt"]["algorithm"]]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.InvalidTokenError:
        raise credentials_exception
    user = await get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


async def get_current_admin(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="需要超级管理员权限"
        )
    return current_user


async def get_current_moderator(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员或版主权限"
        )
    return current_user


async def get_current_user_or_guest(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        # 如果没有 token，返回游客用户
        return UserInDB(
            id=str("guest"),  # 确保 ID 是字符串类型
            email="guest@example.com",
            name="游客",
            role=UserRole.GUEST,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    try:
        return await get_current_user(token)
    except HTTPException:
        # 如果 token 无效，返回游客用户
        return UserInDB(
            id=str("guest"),  # 确保 ID 是字符串类型
            email="guest@example.com",
            name="游客",
            role=UserRole.GUEST,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
