import re

FORBIDDEN_KEYWORDS = {
    "insert", "update", "delete", "drop", "alter", "truncate",
    "create", "replace", "rename", "attach", "detach",
    "grant", "revoke", "pragma", "vacuum", "reindex",
    "copy", "load", "savepoint", "begin", "commit", "rollback",
}

SENSITIVE_PATTERNS = [
    r"\bpassword\b", r"\bpasswd\b", r"\bpwd\b",
    r"\bcredit_?card\b", r"\bcard_?number\b", r"\bcvv\b",
    r"\bssn\b", r"\bsocial_?security\b", r"\btax_?id\b",
    r"\bsecret\b", r"\bapi_?key\b", r"\btoken\b",
    r"\bsalt\b", r"\bhash\b", r"\bprivate_?key\b", r"\bsalary\b",
]


def _strip(sql: str) -> str:
    sql = re.sub(r"'(?:''|[^'])*'", "''", sql)
    sql = re.sub(r'"(?:""|[^"])*"', '""', sql)
    sql = re.sub(r"--[^\n]*", "", sql)
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return sql


def validate_sql(sql: str) -> tuple[bool, str]:
    if not sql or not sql.strip():
        return False, "Empty SQL"

    raw_upper = sql.upper()
    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{kw.upper()}\b", raw_upper):
            return False, f"Forbidden keyword: {kw.upper()}"

    raw_lower = sql.lower()
    for pat in SENSITIVE_PATTERNS:
        if re.search(pat, raw_lower):
            keyword = pat.replace(r"\b", "").replace("_?", " ")
            return False, f"Sensitive keyword: {keyword}"

    sql_clean = _strip(sql).strip()
    if not sql_clean:
        return False, "SQL is only comments/whitespace"

    first = sql_clean.split(None, 1)[0].lower()
    if first not in ("select", "with"):
        return False, f"Only SELECT/CTE allowed, got: {first.upper()}"

    if sql_clean.count(";") > 1 or re.search(r";\s*\S", sql_clean):
        return False, "Multiple statements detected"

    return True, "OK"
