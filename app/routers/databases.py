import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import DATABASES_DIR
from app.database import User, UserDatabase, get_db
from app.schemas import DatabaseItem, DatabaseCreateResponse, DeleteResponse, ErrorResponse
from app.services.schema_extractor import extract_schema
from app.services.vectorizer import build_index

router = APIRouter(prefix="/api/databases", tags=["databases"])


@router.get(
    "/",
    response_model=list[DatabaseItem],
    summary="List databases",
    description="List all databases belonging to the authenticated user.",
)
def list_databases(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(UserDatabase).filter(UserDatabase.user_id == user["id"]).all()
    return [
        DatabaseItem(id=r.id, name=r.name, created_at=str(r.created_at))
        for r in rows
    ]


@router.post(
    "/",
    response_model=DatabaseCreateResponse,
    status_code=201,
    summary="Upload a database",
    description="Upload a `.db` file. Schema is extracted and FAISS index is built automatically.",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file type"},
        500: {"model": ErrorResponse, "description": "Indexing failed"},
    },
)
def add_database(
    name: str = Form(..., description="Display name for this database"),
    file: UploadFile = File(..., description="SQLite .db file"),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".db"):
        raise HTTPException(400, "Only .db files are allowed")

    record = UserDatabase(
        user_id=user["id"],
        name=name,
        db_path="", schema_path="", index_path="",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    db_id = record.id

    db_dir = os.path.join(DATABASES_DIR, str(db_id))
    os.makedirs(db_dir, exist_ok=True)

    db_path = os.path.join(db_dir, file.filename)
    schema_path = os.path.join(db_dir, "schema.json")
    index_path = os.path.join(db_dir, "faiss.index")

    try:
        with open(db_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        extract_schema(db_path, schema_path)
        build_index(schema_path, index_path)
    except Exception as e:
        shutil.rmtree(db_dir, ignore_errors=True)
        db.delete(record)
        db.commit()
        raise HTTPException(500, f"Indexing failed: {e}")

    record.db_path = db_path
    record.schema_path = schema_path
    record.index_path = index_path
    db.commit()
    db.refresh(record)

    return DatabaseCreateResponse(id=record.id, name=name, status="indexed")


@router.delete(
    "/{db_id}",
    response_model=DeleteResponse,
    summary="Delete a database",
    description="Remove a database and all its associated files (schema, index).",
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
    },
)
def delete_database(db_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UserDatabase).filter(
        UserDatabase.id == db_id, UserDatabase.user_id == user["id"]
    ).first()
    if not record:
        raise HTTPException(404, "Database not found")

    db_dir = os.path.join(DATABASES_DIR, str(db_id))
    if os.path.exists(db_dir):
        shutil.rmtree(db_dir, ignore_errors=True)

    db.delete(record)
    db.commit()
    return DeleteResponse(deleted=True, id=db_id)
