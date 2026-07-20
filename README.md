# SchemaMind

> Talk to your SQLite databases in plain language — Persian or English.

Most people have data sitting in a database they never touch. Not because they don't care about it, but because SQL is a skill, and learning it just to answer a quick question feels like overkill. SchemaMind exists to remove that friction.

Drop a SQLite file into the app, type a question like *"how many customers signed up last month?"* or *"۵ مشتری برتر چه کسانی هستند؟"*, and you get back real, executable SQL — plus the actual answer pulled straight from your data.

[Features](#features) · [Architecture](#architecture) · [Quick start](#quick-start) · [API](#api) · [How it works](#how-it-works) · [Monitoring](#monitoring) · [Docker](#docker) · [Limitations](#limitations)

---

## Features

- **Natural-language to SQL.** Persian and English questions, both supported out of the box.
- **Schema-aware RAG.** For each question we extract a small, relevant sub-graph of the schema, not the whole thing. The prompt stays small and the SQL stays accurate.
- **Strict safety layer.** Every generated query is validated before it ever touches your data — SELECT only, no sensitive columns, no stacked statements.
- **Per-user isolation.** JWT auth, separate uploaded databases, per-user Gemini API keys.
- **Live observability.** Prometheus metrics for retrieval, LLM calls, SQL generation/validation/execution — pre-wired Grafana dashboard.
- **One-command deploy.** Full stack ships in two Docker images, ~3.4 GB total.

## Architecture

![SchemaMind architecture](docs/architecture.png)

The request flow has three stages:

1. **Sub-Graph Extraction.** The user's prompt enters the API gateway, which forwards it to the Sub-Graph Extractor agent. The agent reads from a vectorized representation of the full database schema (`fullgraph`), and with help from an LLM narrows it down to a small sub-graph containing only the tables and foreign-key relationships the question is likely to need. That sub-graph is passed to the next stage along with the original prompt.

2. **Query Generation.** The Query Generator agent receives the sub-graph and the prompt. It calls an LLM that invokes a `Query Generator` tool to produce a full SQL query. The query is returned to the API gateway.

3. **Validation & Execution.** The full query is passed to the Validation & Execute block. It looks up the target database in `userDB`, executes the query, and runs an AST validation pass. If the query is valid, the result rows are returned; if not, a `Not-Valid` signal is sent back and the user is told why.

## Quick start

### Option A — Docker (recommended)

```bash
cp .env.example .env
# edit .env and set SECRET_KEY to a long random string

docker compose up -d --build
```

Once the stack is up:

- **Frontend UI:** http://localhost:8080
- **API docs:** http://localhost:8080/docs (proxied through nginx) or http://localhost:8000/docs
- **Prometheus:** http://localhost:9090 (if you start the monitoring profile)
- **Grafana:** http://localhost:3000 (if you start the monitoring profile)

Sign up, drop in a Gemini API key, upload a `.db` file, and start asking.

### Option B — Backend only

```bash
git clone <repo-url>
cd mlops_project

python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -e .

cp .env.example .env          # then edit SECRET_KEY
uvicorn app.main:app --reload
```

Interactive API docs at http://localhost:8000/docs.

### Option C — Frontend dev server (Vite + HMR)

With the backend running, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the UI on http://localhost:5173 and proxies `/api/*` to the backend on `http://localhost:8000`.

## API

| Method | Path | Description |
|---|---|---|
| `GET`    | `/`                              | Health check |
| `POST`   | `/api/auth/register`             | Create account |
| `POST`   | `/api/auth/login`                | Get JWT token |
| `GET`    | `/api/auth/me`                   | Current user profile |
| `GET`    | `/api/settings/api-key`          | Check if Gemini key is set |
| `GET`    | `/api/settings/api-key/masked`   | View masked API key |
| `POST`   | `/api/settings/api-key`          | Store Gemini key |
| `DELETE` | `/api/settings/api-key`          | Remove stored key |
| `GET`    | `/api/databases/`                | List uploaded databases |
| `POST`   | `/api/databases/`                | Upload a `.db` file |
| `DELETE` | `/api/databases/{id}`            | Remove a database |
| `GET`    | `/api/models/`                   | List available Gemini models |
| `POST`   | `/api/query/`                    | Ask a question, get SQL + results |
| `GET`    | `/metrics`                       | Prometheus metrics |

All endpoints except `/`, `/docs`, `/openapi.json` and `/metrics` require a Bearer token in the `Authorization` header.

## How it works

### 1. Schema extraction and indexing

When a `.db` file is uploaded, we use SQLAlchemy to introspect every table, column, primary key, and foreign key. That schema is written to a `schema.json` and embedded into a FAISS index. Each table becomes one document: a short natural-language description plus its columns, types, and key relationships. The embedding model is `intfloat/multilingual-e5-base` — same quality for English and Persian.

### 2. Sub-graph retrieval (the RAG piece)

Stuffing the entire schema into the prompt works for tiny databases and falls apart past a few dozen tables. The current approach is a two-stage filter.

- **Vector retrieval.** The user's question is embedded the same way as the schema descriptions. We do a FAISS similarity search, run the cosine scores through softmax with a low temperature, and keep the top set whose cumulative probability crosses `top_p` (default 0.9). That gives a small, focused set of candidate tables instead of the whole schema.
- **Graph expansion.** The candidates often miss join partners — the table you need is one hop away through a foreign key. We treat the schema as an undirected graph (edges = foreign keys) and run a shortest-path search between every pair of seed tables. Every table that lies on a connecting path gets pulled in. The result is the minimal subgraph that still contains all the joins you'd plausibly need.

Only that subgraph goes into the LLM prompt.

### 3. SQL generation

The LLM gets a strict system prompt (use only schema tables, no invented columns, wrap the answer in a ```sql block) plus the formatted sub-graph plus the user's question. The output is parsed, the SQL is extracted, and the validator runs.

### 4. Validation and execution

A regex-based validator blocks any DDL/DML keyword (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `PRAGMA`, …), any reference to sensitive column names (`password`, `api_key`, `salary`, …), multiple statements, and queries that are only comments. If validation passes, SQLAlchemy executes the query against the user's uploaded SQLite file and the result rows (limited to 100) are returned along with the generated SQL.

## Monitoring

The API exposes Prometheus metrics on `/metrics`, including:

- HTTP request count and latency (added by `prometheus-fastapi-instrumentator`)
- RAG retrieval latency and table-count distribution
- LLM call latency, status, and token usage
- SQL generation/validation/execution counts and durations

A pre-built Grafana dashboard lives at `monitoring/grafana/dashboards/schemamind.json` and is auto-provisioned when you run the monitoring profile.

```bash
# Start the monitoring stack alongside the main app
docker compose --profile monitoring up -d

# Prometheus:  http://localhost:9090
# Grafana:     http://localhost:3000   (admin / admin)
```

The Prometheus config (`monitoring/prometheus.yml`) scrapes the API at `app:8000/metrics`, plus a `node-exporter` for host metrics.

## Project layout

```
mlops_project/
├── app/                          # FastAPI backend
│   ├── main.py                   # App + lifespan + /metrics
│   ├── config.py                 # Env vars and Gemini model list
│   ├── database.py               # SQLAlchemy models (User, UserDatabase)
│   ├── auth.py                   # JWT + password hashing
│   ├── schemas.py                # Pydantic request/response models
│   ├── metrics.py                # Custom Prometheus metrics
│   ├── routers/
│   │   ├── auth.py               # /api/auth/register, /login, /me
│   │   ├── settings.py           # /api/settings/api-key
│   │   ├── databases.py          # /api/databases upload/list/delete
│   │   ├── models.py             # /api/models list Gemini models
│   │   └── query.py              # /api/query NL → SQL → results
│   └── services/
│       ├── schema_extractor.py
│       ├── vectorizer.py
│       ├── retriever.py
│       ├── sql_generator.py
│       ├── sql_validator.py
│       ├── sql_executor.py
│       └── model_lister.py
├── frontend/                     # React + Vite + Tailwind (RTL, Persian)
│   ├── src/
│   │   ├── pages/                # Login, Register, Dashboard, Databases, Query, Settings
│   │   ├── components/           # AppLayout, Card, DataTable, Button, Input, …
│   │   ├── context/              # AuthContext
│   │   └── lib/                  # api wrapper
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── monitoring/                   # Observability stack
│   ├── prometheus/prometheus.yml
│   └── grafana/
│       ├── dashboards/schemamind.json
│       └── provisioning/
├── docs/                         # Documentation assets
│   └── architecture.png
├── main.py                       # Standalone schema graph visualizer
├── pyproject.toml
├── docker-compose.yml            # api + frontend
├── docker-compose.dev.yml        # dev with hot-reload
├── Dockerfile                    # API image
├── requirements.txt
└── .env                          # SECRET_KEY, GOOGLE_API_KEY
```

## Docker

The main compose file builds two images:

- **`schemamind-api`** — multi-stage build on `python:3.12-slim`, deps installed via `uv` from `uv.lock`, runtime uses system Python with WAL-mode SQLite. Final size ≈ 3.4 GB (CPU-only PyTorch).
- **`schemamind-frontend`** — Vite build on `node:20-alpine`, served by `nginx:1.27-alpine` which also proxies `/api/*` to the backend. Final size ≈ 75 MB.

### Useful commands

```bash
docker compose up -d --build              # start
docker compose down                       # stop
docker compose down -v                    # stop and wipe all data
docker compose logs -f app                # tail API logs
docker compose exec app bash              # shell into the API container
docker compose build --no-cache app       # rebuild from scratch

# With monitoring (Prometheus + Grafana + node-exporter)
docker compose --profile monitoring up -d
```

### Volumes

- `schemamind-data` — `app.db` (users, settings, database metadata) and uploaded SQLite files
- `schemamind-cache` — HuggingFace model cache (downloaded embedding model)

Both survive container restarts. Wipe with `docker compose down -v`.

## Tech stack

**Backend** — FastAPI · SQLAlchemy 2 · FAISS · sentence-transformers (`intfloat/multilingual-e5-base`) · NetworkX · LangChain + langchain-google-genai · passlib + python-jose · prometheus-fastapi-instrumentator · uv

**Frontend** — Vite 5 · React 18 · TypeScript · Tailwind CSS 3 · React Router 6 · Vazir font

**Infrastructure** — Docker · Docker Compose · Nginx · Prometheus · Grafana

## Limitations

- **SQLite only**, by design. Postgres/MySQL would need a different schema extractor and executor.
- **The LLM occasionally hallucinates** column names on unfamiliar schemas. The validator catches the obvious cases but not subtle typos that happen to reference real columns.
- **FAISS is loaded per request**, which is fine for single-user demos but won't scale horizontally without an external vector store.
- **The embedding model is downloaded at build time** (~470 MB), making the first build slow on poor connections. After that it's cached in the `schemamind-cache` volume.

## License

MIT.
