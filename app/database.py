import os
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

from app.config import APP_DB_PATH, DATABASES_DIR

engine = create_engine(
    f"sqlite:///{APP_DB_PATH}",
    connect_args={"check_same_thread": False, "timeout": 30},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, _connection_record):
    """Enable WAL mode and a sane busy timeout so concurrent writes wait instead of failing."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


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
    db_dir = os.path.dirname(APP_DB_PATH) or "data"
    os.makedirs(db_dir, exist_ok=True)
    os.makedirs(DATABASES_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
