import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.metrics import AGENT_SQL_EXECUTION_DURATION, AGENT_SQL_EXECUTION_TOTAL


def execute_sql(db_path: str, sql: str, max_rows: int = 100) -> dict:
    """Execute a validated SELECT query on the given database using SQLAlchemy.

    Returns columns and rows (limited to max_rows).
    Raises SQLAlchemyError on runtime failure.
    """
    start = time.perf_counter()
    status = "ok"
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            if not result.returns_rows:
                return {"columns": [], "rows": [], "row_count": 0}
            columns = list(result.keys())
            rows = result.fetchmany(max_rows)
        return {
            "columns": columns,
            "rows": [list(r) for r in rows],
            "row_count": len(rows),
        }
    except Exception:
        status = "error"
        raise
    finally:
        AGENT_SQL_EXECUTION_DURATION.observe(time.perf_counter() - start)
        AGENT_SQL_EXECUTION_TOTAL.labels(status=status).inc()
