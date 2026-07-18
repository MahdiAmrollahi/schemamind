import json
from pathlib import Path

from sqlalchemy import create_engine, inspect


def extract_schema(db_path: str, output_path: str) -> dict:
    engine = create_engine(f"sqlite:///{db_path}")
    ins = inspect(engine)
    tables = sorted(ins.get_table_names())

    schema = {"database": Path(db_path).name, "tables": [], "relationships": []}

    for table_name in tables:
        pk_cols = sorted(ins.get_pk_constraint(table_name)["constrained_columns"])
        fk_list = ins.get_foreign_keys(table_name)
        fk_map = {fk["constrained_columns"][0]: fk for fk in fk_list}
        cols = ins.get_columns(table_name)

        keys = []
        for c in cols:
            name = c["name"]
            typ = str(c["type"]).split("(")[0].upper()
            is_pk = name in pk_cols
            fk = fk_map.get(name)
            keys.append({
                "name": name,
                "type": typ,
                "nullable": c.get("nullable", True),
                "primary_key": is_pk,
                "foreign_key": bool(fk),
                "references_table": fk["referred_table"] if fk else None,
                "references_column": fk["referred_columns"][0] if fk else None,
                "comment": c.get("comment"),
            })

        col_names = ", ".join(c["name"] for c in cols)
        desc = f"Table '{table_name}' contains columns: {col_names}."
        if pk_cols:
            desc += f" Primary key: {', '.join(pk_cols)}."
        if fk_list:
            fk_desc = "; ".join(
                f"'{fk['constrained_columns'][0]}' -> '{fk['referred_table']}.{fk['referred_columns'][0]}'"
                for fk in fk_list
            )
            desc += f" Foreign keys: {fk_desc}."

        schema["tables"].append({
            "name": table_name,
            "description": desc,
            "primary_keys": pk_cols,
            "column_count": len(cols),
            "keys": keys,
        })

        for fk in fk_list:
            schema["relationships"].append({
                "from_table": table_name,
                "from_column": fk["constrained_columns"][0],
                "to_table": fk["referred_table"],
                "to_column": fk["referred_columns"][0],
            })

    Path(output_path).write_text(json.dumps(schema, indent=2, ensure_ascii=False), encoding="utf-8")
    engine.dispose()
    return schema
