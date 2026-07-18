from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import User, get_db

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    cred_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
        if not user_id:
            raise cred_error
    except (JWTError, ValueError):
        raise cred_error

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise cred_error
    return {"id": user.id, "username": user.username}


def get_api_key_for_user(user_id: int, db: Session) -> str | None:
    """Fetch the raw Gemini API key for a user. Use only internally."""
    user = db.query(User).filter(User.id == user_id).first()
    return user.gemini_api_key if user else None


def mask_api_key(key: str) -> str:
    """Return a masked version: first 4 + **** + last 4."""
    if not key or len(key) < 10:
        return "****"
    return f"{key[:4]}{'*' * (len(key) - 8)}{key[-4:]}"
