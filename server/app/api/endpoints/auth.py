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
from ...models.user import User, UserRole
from ...db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import os
from logging.handlers import RotatingFileHandler

# 创建logs目录（如果不存在）
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        # 控制台处理器
        logging.StreamHandler(),
        # 文件处理器（按大小轮转）
        RotatingFileHandler(
            os.path.join(log_dir, 'auth_endpoints.log'),
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
    ]
)
logger = logging.getLogger(__name__)

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
