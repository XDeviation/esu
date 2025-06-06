from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..models.user import UserRole

# JWT 相关配置
SECRET_KEY = "tomato881"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 7200

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 如果是游客，返回游客信息
    if token == "guest":
        return {
            "email": "guest@example.com",
            "name": "游客",
            "role": UserRole.GUEST
        }
    
    # 这里应该从数据库获取用户信息
    # 暂时返回一个模拟的用户信息
    return {
        "email": email,
        "name": "测试用户",
        "role": UserRole.ADMIN
    }

async def get_current_admin_or_moderator(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MODERATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员或版主权限"
        )
    return current_user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user

async def get_current_moderator(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MODERATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要版主权限"
        )
    return current_user

async def get_current_user_or_guest(current_user: Optional[dict] = Depends(get_current_user)):
    if current_user is None:
        return {"role": UserRole.GUEST}
    return current_user

async def get_current_user_or_moderator(current_user: Optional[dict] = Depends(get_current_user)):
    if current_user is None:
        return {"role": UserRole.GUEST}
    if current_user.get("role") in [UserRole.ADMIN, UserRole.MODERATOR]:
        return current_user
    return {"role": UserRole.PLAYER} 