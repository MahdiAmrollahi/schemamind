from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_api_key_for_user, get_current_user
from app.database import get_db
from app.schemas import ModelItem, ErrorResponse
from app.services.model_lister import list_gemini_models

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get(
    "/",
    response_model=list[ModelItem],
    summary="List Gemini models",
    description="Fetch available Gemini models from Google AI Studio using your stored API key.",
    responses={
        400: {"model": ErrorResponse, "description": "API key not set or invalid"},
    },
)
def list_models(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    api_key = get_api_key_for_user(user["id"], db)
    if not api_key:
        raise HTTPException(400, "Gemini API key not set. Use POST /api/settings/api-key first.")
    try:
        return list_gemini_models(api_key)
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch models: {e}")
