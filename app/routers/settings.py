from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_api_key_for_user, get_current_user, mask_api_key
from app.database import User, get_db
from app.schemas import ApiKeyRequest, ApiKeyStatus, ApiKeyView, ErrorResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get(
    "/api-key",
    response_model=ApiKeyStatus,
    summary="Check if API key is set",
    description="Returns whether the current user has a Gemini API key configured.",
)
def get_api_key_status(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return ApiKeyStatus(has_key=bool(get_api_key_for_user(user["id"], db)))


@router.get(
    "/api-key/masked",
    response_model=ApiKeyView,
    summary="View masked API key",
    description="Returns a masked version of your API key (first/last 4 chars visible).",
)
def get_api_key_masked(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    key = get_api_key_for_user(user["id"], db)
    return ApiKeyView(masked=mask_api_key(key) if key else None, has_key=bool(key))


@router.post(
    "/api-key",
    summary="Set or update API key",
    description="Store your Google AI Studio API key. It will be used for all Gemini calls.",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid API key"},
    },
)
def set_api_key(req: ApiKeyRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(User).filter(User.id == user["id"]).update({"gemini_api_key": req.api_key})
    db.commit()
    return {"message": "API key updated successfully"}


@router.delete(
    "/api-key",
    summary="Delete API key",
    description="Remove your stored Gemini API key.",
)
def delete_api_key(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(User).filter(User.id == user["id"]).update({"gemini_api_key": None})
    db.commit()
    return {"message": "API key deleted"}
