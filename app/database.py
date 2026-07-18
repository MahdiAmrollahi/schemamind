import os
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

from app.config import APP_DB_PATH, DATABASES_DIR

engine = create_engine(
    f"sqlite:///{APP_DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    gemini_api_key = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    databases = relationship("UserDatabase", back_populates="user", cascade="all, delete-orphan")


class UserDatabase(Base):
    __tablename__ = "user_databases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    db_path = Column(String(500), nullable=False)
    schema_path = Column(String(500), nullable=False)
    index_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="databases")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    os.makedirs("data", exist_ok=True)
    os.makedirs(DATABASES_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
