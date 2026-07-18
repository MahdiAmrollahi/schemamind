from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import init_db
from app.routers import auth, databases, models, query, settings

tags_metadata = [
    {"name": "auth", "description": "User registration and login"},
    {"name": "settings", "description": "User settings (Gemini API key)"},
    {"name": "databases", "description": "Upload and manage SQLite databases"},
    {"name": "models", "description": "List available Gemini models"},
    {"name": "query", "description": "Natural language to SQL (generate + execute)"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="NL-to-SQL API",
    description="Convert natural language questions to SQL queries using RAG + LLM, "
                "then execute them and return results.\n\n"
                "## Flow\n"
                "1. Register & login to get a JWT token\n"
                "2. Set your Gemini API key (`POST /api/settings/api-key`)\n"
                "3. Upload a `.db` file (schema + FAISS index built automatically)\n"
                "4. List available Gemini models (`GET /api/models/`)\n"
                "5. Ask a question → get SQL + actual results",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Unexpected error: {exc}"},
    )


app.include_router(auth.router)
app.include_router(settings.router)
app.include_router(databases.router)
app.include_router(models.router)
app.include_router(query.router)


@app.get("/", tags=["health"], summary="Health check")
def root():
    """Check if the API is running."""
    return {"status": "ok", "docs": "/docs"}
