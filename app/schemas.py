from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=6, max_length=100, description="User password (min 6 chars)")


class UserResponse(BaseModel):
    id: int
    username: str
    created_at: str


class Token(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class DatabaseItem(BaseModel):
    id: int
    name: str
    created_at: str


class DatabaseCreateResponse(BaseModel):
    id: int
    name: str
    status: str = Field(description="Indexing status")


class DeleteResponse(BaseModel):
    deleted: bool
    id: int


class ModelItem(BaseModel):
    id: str
    name: str


class QueryRequest(BaseModel):
    database_id: int = Field(..., description="ID of the database to query")
    question: str = Field(..., min_length=2, description="Natural language question (EN/FA)")
    model: str = Field(default="gemini-flash-lite-latest", description="Gemini model ID")


class Relationship(BaseModel):
    from_table: str
    from_column: str
    to_table: str
    to_column: str


class ErrorResponse(BaseModel):
    detail: str


class ApiKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=10, description="Your Google AI Studio API key")


class ApiKeyStatus(BaseModel):
    has_key: bool


class ApiKeyView(BaseModel):
    masked: str | None = Field(None, description="Masked API key (first/last 4 chars)")
    has_key: bool


class QueryResult(BaseModel):
    columns: list[str] = Field(default_factory=list, description="Column names")
    rows: list[list] = Field(default_factory=list, description="Result rows")
    row_count: int = Field(0, description="Number of rows returned")


class QueryResponse(BaseModel):
    sql: str = Field(..., description="Generated SQL query")
    valid: bool = Field(..., description="Whether SQL passed safety validation")
    message: str = Field(..., description="Validation or execution message")
    results: QueryResult | None = Field(None, description="Query results if executed")
