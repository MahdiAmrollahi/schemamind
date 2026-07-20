"""Custom Prometheus metrics for SchemaMind.

Exposes:
- RAG metrics: retrieval latency and table-count distributions.
- Agent metrics: LLM call latency/status, SQL validation, SQL execution, token usage.
- App/serving metrics (process, HTTP) are added automatically by
  prometheus-fastapi-instrumentator at /metrics.
"""
from prometheus_client import Counter, Histogram

RAG_RETRIEVAL_DURATION = Histogram(
    "rag_retrieval_duration_seconds",
    "Duration of RAG retrieval (FAISS + graph expansion).",
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

RAG_RETRIEVALS_TOTAL = Counter(
    "rag_retrievals_total",
    "Total number of RAG retrievals performed.",
)

RAG_SEED_TABLES = Histogram(
    "rag_seed_tables",
    "Number of seed tables selected after top-p filtering.",
    buckets=(1, 2, 3, 5, 7, 10, 15, 20, 30, 50),
)

RAG_TOTAL_TABLES = Histogram(
    "rag_total_tables",
    "Number of tables returned after FK-graph expansion.",
    buckets=(1, 2, 3, 5, 7, 10, 15, 20, 30, 50),
)

AGENT_REQUESTS_TOTAL = Counter(
    "agent_requests_total",
    "Total LLM (Gemini) requests.",
    ["model", "status"],
)

AGENT_REQUEST_DURATION = Histogram(
    "agent_request_duration_seconds",
    "LLM (Gemini) call latency in seconds.",
    ["model"],
    buckets=(0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 20.0, 30.0, 60.0),
)

AGENT_TOKENS_TOTAL = Counter(
    "agent_tokens_total",
    "Token usage reported by Gemini.",
    ["model", "kind"],
)

AGENT_SQL_VALID_TOTAL = Counter(
    "agent_sql_valid_total",
    "SQL validation outcomes from the safety layer.",
    ["valid", "reason"],
)

AGENT_SQL_EXECUTION_TOTAL = Counter(
    "agent_sql_execution_total",
    "SQL execution outcomes against the user's SQLite database.",
    ["status"],
)

AGENT_SQL_EXECUTION_DURATION = Histogram(
    "agent_sql_execution_duration_seconds",
    "SQL execution duration against the user's SQLite database.",
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
)
