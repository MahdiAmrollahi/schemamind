import json
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "intfloat/multilingual-e5-base"
_model = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def _table_doc(table: dict) -> str:
    parts = [f"Table {table['name']}.", table["description"]]
    col_texts = []
    for k in table.get("keys", []):
        bits = [f"column {k['name']} ({k['type']})"]
        if k["primary_key"]:
            bits.append("primary key")
        if k["foreign_key"]:
            bits.append(f"foreign key to {k['references_table']}.{k['references_column']}")
        col_texts.append(" ".join(bits))
    if col_texts:
        parts.append("Columns: " + ". ".join(col_texts) + ".")
    return " ".join(parts)


def build_index(schema_path: str, index_path: str) -> int:
    model = _get_model()
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))

    documents = [_table_doc(t) for t in schema["tables"]]
    embeddings = model.encode(
        ["passage: " + d for d in documents],
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32")

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)
    faiss.write_index(index, index_path)
    return len(documents)
