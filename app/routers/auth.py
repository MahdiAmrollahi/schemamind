from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, verify_password, create_token
from app.database import User, get_db
from app.schemas import UserCreate, UserResponse, Token, ErrorResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register a new user",
    description="Create a new account with username and password.",
    responses={
        400: {"model": ErrorResponse, "description": "Username already exists"},
    },
)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(400, "Username already exists")
    new_user = User(username=user.username, password_hash=hash_password(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse(id=new_user.id, username=new_user.username, created_at=str(new_user.created_at))


@router.post(
    "/login",
    response_model=Token,
    summary="Login",
    description="Authenticate and receive a JWT access token.",
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
    },
)
def login(user: UserCreate, db: Session = Depends(get_db)):
    row = db.query(User).filter(User.username == user.username).first()
    if not row or not verify_password(user.password, row.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = create_token(row.id, row.username)
    return Token(access_token=token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current user",
    description="Return the currently authenticated user's profile.",
    responses={
        401: {"model": ErrorResponse, "description": "Invalid or missing token"},
    },
)
def me(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(User).filter(User.id == user["id"]).first()
    if not row:
        raise HTTPException(401, "User not found")
    return UserResponse(id=row.id, username=row.username, created_at=str(row.created_at))
