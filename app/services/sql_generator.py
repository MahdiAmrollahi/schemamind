import json
import re
import time
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.metrics import (
    AGENT_REQUEST_DURATION,
    AGENT_REQUESTS_TOTAL,
    AGENT_SQL_VALID_TOTAL,
    AGENT_TOKENS_TOTAL,
)
from app.services.retriever import retrieve
from app.services.sql_validator import validate_sql

SYSTEM_PROMPT = """You are a SQL expert. Given a question and a database schema, output a single valid SQLite query.

Rules:
- Use only the tables and columns in the provided schema.
- Join tables using the foreign keys listed.
- Never invent tables or columns.
- Wrap the final answer in a ```sql code block."""


def _format_schema(retrieval: dict, schema_path: str) -> str:
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    tables = {t["name"]: t for t in schema["tables"]}

    parts = ["Tables:"]
    for name in retrieval["tables"]:
        t = tables.get(name)
        if not t:
            continue
        cols = []
        for k in t.get("keys", []):
            tag = []
            if k.get("primary_key"):
                tag.append("PK")
            if k.get("foreign_key"):
                tag.append(f"FK->{k['references_table']}.{k['references_column']}")
            cols.append(f"  {k['name']} ({k['type']}) {' '.join(tag)}".strip())
        parts.append(f"\n{name}:\n" + "\n".join(cols))

    parts.append("\nRelationships:")
    for r in retrieval["relationships"]:
        parts.append(f"  {r['from_table']}.{r['from_column']} -> {r['to_table']}.{r['to_column']}")
    return "\n".join(parts)


def _extract_sql(content) -> str:
    if isinstance(content, list):
        content = "\n".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    else:
        content = str(content)
    match = re.search(r"```(?:sql)?\s*\n?(.*?)```", content, re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else content.strip()


def _record_tokens(model: str, response) -> None:
    usage = (getattr(response, "usage_metadata", None)
             or (getattr(response, "response_metadata", None) or {}).get("usage_metadata")
             or {})
    prompt = usage.get("input_token_count") or usage.get("prompt_token_count") or 0
    completion = usage.get("output_token_count") or usage.get("candidates_token_count") or 0
    if prompt:
        AGENT_TOKENS_TOTAL.labels(model=model, kind="prompt").inc(prompt)
    if completion:
        AGENT_TOKENS_TOTAL.labels(model=model, kind="completion").inc(completion)


def generate_sql(question: str, schema_path: str, index_path: str, model: str, api_key: str) -> dict:
    retrieval = retrieve(question, schema_path, index_path, top_p=0.9, temperature=0.1)
    schema_context = _format_schema(retrieval, schema_path)

    llm = ChatGoogleGenerativeAI(model=model, temperature=0, google_api_key=api_key)
    start = time.perf_counter()
    status = "ok"
    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Schema:\n{schema_context}\n\nQuestion: {question}"),
        ])
        _record_tokens(model, response)
    except Exception:
        status = "error"
        raise
    finally:
        AGENT_REQUEST_DURATION.labels(model=model).observe(time.perf_counter() - start)
        AGENT_REQUESTS_TOTAL.labels(model=model, status=status).inc()

    sql = _extract_sql(response.content)
    ok, msg = validate_sql(sql)
    AGENT_SQL_VALID_TOTAL.labels(valid=str(ok).lower(), reason=msg).inc()

    return {
        "sql": sql,
        "valid": ok,
        "message": msg,
        "tables": retrieval["tables"],
        "relationships": retrieval["relationships"],
    }
