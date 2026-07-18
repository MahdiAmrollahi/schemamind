from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import get_api_key_for_user, get_current_user
from app.database import UserDatabase, get_db
from app.schemas import QueryRequest, QueryResponse, QueryResult, ErrorResponse
from app.services.sql_executor import execute_sql
from app.services.sql_generator import generate_sql

router = APIRouter(prefix="/api/query", tags=["query"])


@router.post(
    "/",
    response_model=QueryResponse,
    summary="Generate and execute SQL",
    description="Takes a natural language question, retrieves relevant tables via RAG, "
                "generates SQL with the selected Gemini model, validates it, "
                "and runs it on the selected database. Returns the actual results.",
    responses={
        400: {"model": ErrorResponse, "description": "API key not set"},
        404: {"model": ErrorResponse, "description": "Database not found"},
        500: {"model": ErrorResponse, "description": "SQL generation or execution failed"},
    },
)
def query(req: QueryRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    api_key = get_api_key_for_user(user["id"], db)
    if not api_key:
        raise HTTPException(400, "Gemini API key not set. Use POST /api/settings/api-key first.")

    record = db.query(UserDatabase).filter(
        UserDatabase.id == req.database_id, UserDatabase.user_id == user["id"]
    ).first()
    if not record:
        raise HTTPException(404, "Database not found")

    try:
        gen = generate_sql(
            question=req.question,
            schema_path=record.schema_path,
            index_path=record.index_path,
            model=req.model,
            api_key=api_key,
        )
    except Exception as e:
        raise HTTPException(500, f"SQL generation failed: {e}")

    results = None
    if gen["valid"]:
        try:
            results = execute_sql(record.db_path, gen["sql"])
        except SQLAlchemyError as e:
            return QueryResponse(
                sql=gen["sql"],
                valid=gen["valid"],
                message=f"SQL generated but execution failed: {e}",
                results=None,
            )

    return QueryResponse(
        sql=gen["sql"],
        valid=gen["valid"],
        message=gen["message"] if not results else "OK",
        results=QueryResult(**results) if results else None,
    )
