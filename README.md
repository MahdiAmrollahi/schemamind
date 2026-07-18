# SchemaMind — Talk to Your SQLite Databases in Plain Language

Most people have data sitting in a database they never touch. Not because they don't care about it, but because SQL is a skill, and learning it just to answer a quick question feels like overkill. SchemaMind exists to remove that friction.

You drop a SQLite file into the app, type a question like *"how many customers signed up last month?"* and you get back real, executable SQL — plus the actual answer pulled straight from your data. No query writing. No Excel gymnastics. Just an answer.

Under the hood it's a small but careful pipeline: the database schema gets extracted and embedded into a vector index, the most relevant tables are retrieved for your question, and a Gemini model writes the SQL. A safety layer validates the query before it ever touches your data, so nothing destructive or sneaky slips through.

## What it actually does

- Accepts any SQLite `.db` file upload
- Extracts the schema (tables, columns, primary keys, foreign keys) and indexes it with FAISS
- Retrieves the most relevant tables for a natural-language question using semantic search
- Uses a Gemini LLM to generate a SQLite query
- Validates the query against a strict allowlist (SELECT/CTE only, no sensitive columns, no multiple statements)
- Executes it and returns the rows

There's also a small visualization helper (`main.py`) that draws the schema graph with NetworkX — handy for understanding unfamiliar databases before you start asking questions.

## Architecture

```
            ┌──────────────┐
            │  User (JWT)  │
            └──────┬───────┘
                   │
        ┌──────────▼──────────┐
        │   FastAPI Backend   │
        └──────────┬──────────┘
                   │
   ┌───────────────┼────────────────┐
   │               │                │
   ▼               ▼                ▼
┌───────┐    ┌──────────┐    ┌───────────┐
│ Auth  │    │ Database │    │  Query    │
│  /    │    │ Upload   │    │  Engine   │
└───────┘    └────┬─────┘    └─────┬─────┘
                  │               │
                  ▼               ▼
        ┌─────────────────┐  ┌────────────┐
        │ Schema Extract  │  │  Retriever │
        │ + FAISS Index   │  │ (top-p)    │
        └─────────────────┘  └─────┬──────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │ Gemini LLM  │
                            │ (SQL gen)   │
                            └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │  Validator  │
                            └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │ SQLAlchemy  │
                            │  Executor   │
                            └─────────────┘
```

## Project layout

```
mlops_project/
├── app/
│   ├── main.py              # FastAPI app + lifespan
│   ├── config.py            # Env vars and model list
│   ├── database.py          # SQLAlchemy models (User, UserDatabase)
│   ├── auth.py              # JWT + password hashing
│   ├── schemas.py           # Pydantic request/response models
│   ├── routers/
│   │   ├── auth.py          # /api/auth/register, /login
│   │   ├── settings.py      # /api/settings/api-key
│   │   ├── databases.py     # /api/databases upload/list/delete
│   │   ├── models.py        # /api/models list Gemini models
│   │   └── query.py         # /api/query NL → SQL → results
│   └── services/
│       ├── schema_extractor.py  # Pulls tables/keys/FKs from SQLite
│       ├── vectorizer.py        # sentence-transformers + FAISS
│       ├── retriever.py         # top-p retrieval + graph expansion
│       ├── sql_generator.py     # Gemini call + prompt
│       ├── sql_validator.py     # Safety checks
│       ├── sql_executor.py      # Runs validated SELECT
│       └── model_lister.py      # Fetches live Gemini model list
├── main.py                  # Standalone schema graph visualizer
├── pyproject.toml
└── .env                     # SECRET_KEY, GOOGLE_API_KEY
```

## Getting started

### 1. Clone and set up

```bash
git clone <repo-url>
cd mlops_project

python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate

pip install -e .
```

### 2. Configure environment

Create a `.env` file:

```env
SECRET_KEY=your-long-random-string
GOOGLE_API_KEY=your-google-ai-studio-key
```

### 3. Run the API

```bash
uvicorn app.main:app --reload
```

The interactive docs live at `http://localhost:8000/docs`.

### 4. Try it end-to-end

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}'

# Login (grab the token)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}'

# Save your Gemini key
curl -X POST http://localhost:8000/api/settings/api-key \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"api_key":"<YOUR_GOOGLE_AI_KEY>"}'

# Upload a database
curl -X POST http://localhost:8000/api/databases/ \
  -H "Authorization: Bearer <TOKEN>" \
  -F "name=Chinook" \
  -F "file=@chinook.db"

# Ask a question
curl -X POST http://localhost:8000/api/query/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"database_id":1,"question":"top 5 customers by total purchase","model":"gemini-2.5-flash"}'
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET`  | `/`                              | Health check |
| `POST` | `/api/auth/register`             | Create account |
| `POST` | `/api/auth/login`                | Get JWT token |
| `GET`  | `/api/settings/api-key`          | Check if key is set |
| `GET`  | `/api/settings/api-key/masked`   | View masked key |
| `POST` | `/api/settings/api-key`          | Store Gemini key |
| `DELETE` | `/api/settings/api-key`        | Remove stored key |
| `GET`  | `/api/databases/`                | List uploaded databases |
| `POST` | `/api/databases/`                | Upload a `.db` file |
| `DELETE` | `/api/databases/{id}`          | Remove a database |
| `GET`  | `/api/models/`                   | List available Gemini models |
| `POST` | `/api/query/`                    | Ask a question, get SQL + results |

## How the RAG piece works

This is the part that took the most thought. Early on I just stuffed every table's description into the prompt and let the LLM figure it out. That works fine for tiny databases and falls apart quickly once you have more than a few dozen tables — the prompt balloons, the model loses track, and the SQL gets weird.

The current approach is a two-stage filter:

1. **Vector retrieval.** Each table gets embedded as a short natural-language description (column names, types, primary/foreign keys). The user's question is embedded the same way and we do a FAISS similarity search. Cosine scores are run through softmax with a low temperature, and we keep the top set whose cumulative probability crosses `top_p` (default 0.9). That gives a small, focused set of candidate tables instead of the whole schema.

2. **Graph expansion.** The candidates often miss join partners — the table you want is one hop away through a foreign key. So we treat the schema as an undirected graph (edges = foreign keys) and run a shortest-path search between every pair of seed tables. Every table that lies on a connecting path gets pulled in too. The result is the minimal subgraph that still contains all the joins you'd plausibly need.

Only that subgraph goes into the LLM prompt. The validator then enforces that any generated query is SELECT-only, references no sensitive columns (`password`, `api_key`, `salary`, etc.), and contains exactly one statement.

## The safety layer

This was non-negotiable. The LLM gets a strict system prompt, but a second regex-based validator runs on the raw SQL before execution. It blocks:

- Any DDL/DML keyword (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `PRAGMA`, …)
- Any reference to sensitive column names
- Multiple statements stacked with `;`
- Queries that are only comments or whitespace

If validation fails, the generated SQL is still returned to the caller — useful for debugging prompts — but it is **not** executed.

## Visualizing a schema

If you just want to see what a database looks like:

```bash
python main.py
```

This reads `schema_graph.graphml` and draws it with NetworkX. You'll need to export a schema graph first; a quick way is to run the API, upload a database, then convert the generated `schema.json` into GraphML.

## Tech stack

- **FastAPI** — HTTP layer, OpenAPI docs, dependency injection
- **SQLAlchemy** — ORM for the user/database metadata, plus query execution
- **FAISS** — vector index for schema retrieval
- **sentence-transformers** (`intfloat/multilingual-e5-base`) — embeddings, including Persian and English
- **NetworkX** — schema graph expansion and visualization
- **LangChain + langchain-google-genai** — Gemini integration
- **passlib + python-jose** — password hashing and JWT
- **uv** — dependency management (see `uv.lock`)

## Known limitations

- SQLite only, by design. Postgres/MySQL would need a different schema extractor and executor.
- The LLM occasionally hallucinates column names on unfamiliar schemas. The validator catches the obvious cases but not subtle typos that happen to reference real columns.
- FAISS is loaded per request, which works fine for single-user demos but won't scale horizontally without an external vector store.

## Docker

The project ships with a multi-stage Dockerfile and a docker-compose setup. The image is based on `python:3.12-slim`, installs dependencies with `uv` (matching `uv.lock`), and pre-downloads the `intfloat/multilingual-e5-base` embedding model during build so the first request isn't slow.

### Quick start

```bash
# 1. Copy and fill in environment variables
cp .env.example .env
# then edit .env and set SECRET_KEY to something long and random

# 2. Build and run
docker compose up -d --build

# 3. Check logs
docker compose logs -f app

# 4. Open the docs
# http://localhost:8000/docs
```

The API will be available at `http://localhost:8000`. SQLite data and uploaded user databases are stored in the named volume `schemamind-data`; the HuggingFace model cache lives in `schemamind-cache`. Both survive container restarts.

### Development mode

A separate compose file mounts the source as a volume and runs `uvicorn --reload`:

```bash
docker compose -f docker-compose.dev.yml --profile dev up --build
```

### Useful commands

```bash
# Stop
docker compose down

# Stop and remove volumes (wipes all data!)
docker compose down -v

# Rebuild after changing pyproject.toml or uv.lock
docker compose build --no-cache

# Open a shell inside the container
docker compose exec app bash

# Tail logs
docker compose logs -f --tail=100 app
```

### Build arguments

The default Dockerfile doesn't expose any build args — the embedding model is downloaded at build time via `sentence-transformers` and cached in the image. If you want to bake a Google API key into the image (not recommended for production), pass it as an env var in `docker-compose.yml`.

## License

MIT.
