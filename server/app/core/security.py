from datetime import datetime, timedelta
from typing import Optional

import jwt
from passlib.context import CryptContext

from .config import config

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=config["jwt"]["access_token_expire_minutes"]
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, config["jwt"]["secret_key"], algorithm=config["jwt"]["algorithm"]
    )
    return encoded_jwt
