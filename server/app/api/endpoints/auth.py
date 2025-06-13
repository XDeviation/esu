from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
import jwt
from ...core.auth import (
    get_current_user,
    get_current_user_or_guest,
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
)
from ...core.config import config
from ...core.logger import logger
from ...models.user import User, UserRole, UserCreate
from ...db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

@router.post("/token/", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f'开始登录验证: {form_data.username}')
    user = await db.users.find_one({"email": form_data.username})
    
    if not user:
        logger.error(f'用户不存在: {form_data.username}')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user["hashed_password"]):
        logger.error(f'密码错误: {form_data.username}')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    refresh_token = create_refresh_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    
    logger.info(f'登录成功: {form_data.username}')
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/token/refresh/", response_model=Token)
async def refresh_access_token(
    refresh_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info('开始刷新token')
    try:
        payload = jwt.decode(
            refresh_token,
            config["jwt"]["refresh_secret_key"],
            algorithms=[config["jwt"]["algorithm"]]
        )
        logger.info(f'刷新token解码成功: {payload}')
        
        email = payload.get("sub")
        if email is None:
            logger.error('刷新token中没有用户邮箱')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = await db.users.find_one({"email": email})
        if not user:
            logger.error(f'刷新token中的用户不存在: {email}')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(
            data={"sub": user["email"], "role": user["role"]}
        )
        new_refresh_token = create_refresh_token(
            data={"sub": user["email"], "role": user["role"]}
        )
        
        logger.info(f'刷新token成功: {email}')
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    except jwt.PyJWTError as e:
        logger.error(f'刷新token失败: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新token",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/check-admin")
async def check_admin(current_user: User = Depends(get_current_user_or_guest)):
    logger.info(f'检查管理员权限: {current_user}')
    return {
        "is_admin": current_user.role == UserRole.ADMIN,
        "is_moderator": current_user.role in [UserRole.ADMIN, UserRole.MODERATOR],
        "user_id": current_user.id,
        "is_guest": current_user.role == UserRole.GUEST
    }

@router.post("/register/", response_model=User)
async def register_user(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f'开始注册用户: {user_data.email}')
    
    # 检查邮箱是否已存在
    if await db.users.find_one({"email": user_data.email}):
        logger.error(f'邮箱已存在: {user_data.email}')
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 创建新用户
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()
    user_dict["role"] = UserRole.PLAYER  # 默认为普通玩家
    user_dict["id"] = user_data.email  # 使用邮箱作为ID
    
    # 插入用户数据
    await db.users.insert_one(user_dict)
    
    logger.info(f'用户注册成功: {user_data.email}')
    return User(**user_dict)
