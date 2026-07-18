import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

APP_DB_PATH = "data/app.db"
DATABASES_DIR = "data/databases"

GEMINI_MODELS = [
    {"id": "gemini-flash-lite-latest", "name": "Gemini Flash Lite (Latest)"},
    {"id": "gemini-flash-latest", "name": "Gemini Flash (Latest)"},
    {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
    {"id": "gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite"},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
    {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro"},
    {"id": "gemini-3-flash-preview", "name": "Gemini 3 Flash (Preview)"},
    {"id": "gemini-3-pro-preview", "name": "Gemini 3 Pro (Preview)"},
]
