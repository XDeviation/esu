from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..models.user import UserRole, User
from .config import config
from .logger import logger
from passlib.context import CryptContext

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """获取密码哈希值"""
    return pwd_context.hash(password)

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
    encoded_jwt = jwt.encode(to_encode, config["jwt"]["secret_key"], algorithm=config["jwt"]["algorithm"])
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=30)  # 刷新token默认30天过期
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config["jwt"]["refresh_secret_key"], algorithm=config["jwt"]["algorithm"])
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
            
        email = payload.get("sub")
        if email is None:
            logger.error('Token中没有用户邮箱')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token无效",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        logger.info(f'Token验证成功，用户邮箱: {email}')
        return User(
            id=email,
            email=email,
            name=email.split('@')[0],  # 临时使用邮箱前缀作为用户名
            role=payload.get("role", UserRole.PLAYER),
            created_at=datetime.utcnow(),  # 这些字段在验证时并不重要
            updated_at=datetime.utcnow()
        )
        
    except jwt.PyJWTError as e:
        logger.error(f'Token验证失败: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token验证失败",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_admin_or_moderator(current_user: User = Depends(get_current_user)):
    logger.info(f'检查管理员/版主权限: {current_user}')
    if current_user.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
        logger.error(f'权限不足: {current_user.role}')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员或版主权限"
        )
    logger.info(f'权限验证通过: {current_user.role}')
    return current_user

async def get_current_admin(current_user: User = Depends(get_current_user)):
    logger.info(f'检查管理员权限: {current_user}')
    if current_user.role != UserRole.ADMIN:
        logger.error(f'权限不足: {current_user.role}')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    logger.info('管理员权限验证通过')
    return current_user

async def get_current_moderator(current_user: User = Depends(get_current_user)):
    logger.info(f'检查版主权限: {current_user}')
    if current_user.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
        logger.error(f'权限不足: {current_user.role}')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要版主权限"
        )
    logger.info('版主权限验证通过')
    return current_user

async def get_current_user_or_guest(current_user: Optional[User] = Depends(get_current_user)):
    logger.info(f'检查用户或游客权限: {current_user}')
    if current_user is None:
        logger.info('返回游客权限')
        return User(
            id="guest",
            email="guest@example.com",
            name="游客",
            role=UserRole.GUEST,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    return current_user

async def get_current_user_or_moderator(current_user: Optional[User] = Depends(get_current_user)):
    logger.info(f'检查用户或版主权限: {current_user}')
    if current_user is None:
        logger.info('返回游客权限')
        return User(
            id="guest",
            email="guest@example.com",
            name="游客",
            role=UserRole.GUEST,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    if current_user.role in [UserRole.ADMIN, UserRole.MODERATOR]:
        logger.info(f'返回版主权限: {current_user.role}')
        return current_user
    logger.info('返回普通用户权限')
    return User(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=UserRole.PLAYER,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    ) 