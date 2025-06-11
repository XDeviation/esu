from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..models.user import UserRole
from ...core.config import config
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
            os.path.join(log_dir, 'auth.log'),
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
    ]
)
logger = logging.getLogger(__name__)

# JWT 相关配置
SECRET_KEY = "tomato881"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 7200

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/token/")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    logger.info(f'开始验证token: {token[:10]}...')
    try:
        payload = jwt.decode(
            token,
            config["jwt"]["secret_key"],
            algorithms=[config["jwt"]["algorithm"]]
        )
        logger.info(f'Token解码成功: {payload}')
        
        # 检查token是否过期
        exp = payload.get("exp")
        if exp is None:
            logger.error('Token中没有过期时间')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token无效",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if datetime.utcnow() > datetime.fromtimestamp(exp):
            logger.error(f'Token已过期: {datetime.fromtimestamp(exp)}')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token已过期",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user_id = payload.get("sub")
        if user_id is None:
            logger.error('Token中没有用户ID')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token无效",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        logger.info(f'Token验证成功，用户ID: {user_id}')
        return {"id": user_id, "role": payload.get("role", UserRole.PLAYER)}
        
    except jwt.PyJWTError as e:
        logger.error(f'Token验证失败: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token验证失败",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_admin_or_moderator(current_user: dict = Depends(get_current_user)):
    logger.info(f'检查管理员/版主权限: {current_user}')
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MODERATOR]:
        logger.error(f'权限不足: {current_user["role"]}')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员或版主权限"
        )
    logger.info(f'权限验证通过: {current_user["role"]}')
    return current_user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    logger.info(f'检查管理员权限: {current_user}')
    if current_user["role"] != UserRole.ADMIN:
        logger.error(f'权限不足: {current_user["role"]}')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    logger.info('管理员权限验证通过')
    return current_user

async def get_current_moderator(current_user: dict = Depends(get_current_user)):
    logger.info(f'检查版主权限: {current_user}')
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MODERATOR]:
        logger.error(f'权限不足: {current_user["role"]}')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要版主权限"
        )
    logger.info('版主权限验证通过')
    return current_user

async def get_current_user_or_guest(current_user: Optional[dict] = Depends(get_current_user)):
    logger.info(f'检查用户或游客权限: {current_user}')
    if current_user is None:
        logger.info('返回游客权限')
        return {"role": UserRole.GUEST}
    return current_user

async def get_current_user_or_moderator(current_user: Optional[dict] = Depends(get_current_user)):
    logger.info(f'检查用户或版主权限: {current_user}')
    if current_user is None:
        logger.info('返回游客权限')
        return {"role": UserRole.GUEST}
    if current_user.get("role") in [UserRole.ADMIN, UserRole.MODERATOR]:
        logger.info(f'返回版主权限: {current_user["role"]}')
        return current_user
    logger.info('返回普通用户权限')
    return {"role": UserRole.PLAYER} 