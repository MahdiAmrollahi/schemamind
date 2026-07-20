import json
import time
from collections import deque
from pathlib import Path

import faiss
import networkx as nx
import numpy as np

from app.metrics import (
    RAG_RETRIEVALS_TOTAL,
    RAG_RETRIEVAL_DURATION,
    RAG_SEED_TABLES,
    RAG_TOTAL_TABLES,
)
from app.services.vectorizer import _get_model, _table_doc

MODEL_NAME = "intfloat/multilingual-e5-base"


def _softmax(x, temperature: float) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64) / max(temperature, 1e-8)
    x = x - x.max()
    e = np.exp(x)
    return e / e.sum()


def _topp(scores, top_p: float, temperature: float) -> int:
    probs = _softmax(scores, temperature=temperature)
    cum = 0.0
    for i, p in enumerate(probs):
        cum += p
        if cum >= top_p:
            return i + 1
    return len(probs)


def _connecting_tables(seeds: set, relationships: list) -> set:
    if len(seeds) <= 1:
        return set(seeds)
    graph = nx.Graph()
    for rel in relationships:
        graph.add_edge(rel["from_table"], rel["to_table"])

    result = set(seeds)
    for src in seeds:
        for tgt in seeds:
            if src >= tgt:
                continue
            if not graph.has_node(src) or not graph.has_node(tgt):
                continue
            try:
                path = nx.shortest_path(graph, src, tgt)
            except nx.NetworkXNoPath:
                continue
            result.update(path)
    return result


def retrieve(query: str, schema_path: str, index_path: str,
             top_p: float = 0.9, temperature: float = 0.1) -> dict:
    RAG_RETRIEVALS_TOTAL.inc()
    start = time.perf_counter()
    try:
        model = _get_model()
        schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
        table_names = [t["name"] for t in schema["tables"]]

        q_vec = model.encode(
            ["query: " + query], normalize_embeddings=True, convert_to_numpy=True
        ).astype("float32")

        index = faiss.read_index(index_path)
        scores, ids = index.search(q_vec, index.ntotal)

        pairs = [(float(s), table_names[i]) for s, i in zip(scores[0], ids[0]) if i >= 0]
        if not pairs:
            return {"query": query, "tables": [], "seed_tables": [], "relationships": []}

        sims = np.array([s for s, _ in pairs], dtype=np.float32)
        k = _topp(sims, top_p=top_p, temperature=temperature)
        chosen = [t for _, t in pairs[:k]]

        final = _connecting_tables(set(chosen), schema["relationships"])
        rels = [r for r in schema["relationships"]
                if r["from_table"] in final and r["to_table"] in final]
        tables = [t["name"] for t in schema["tables"] if t["name"] in final]

        result = {
            "query": query,
            "k": k,
            "seed_tables": chosen,
            "tables": tables,
            "relationships": rels,
        }
        RAG_SEED_TABLES.observe(len(chosen))
        RAG_TOTAL_TABLES.observe(len(tables))
        return result
    finally:
        RAG_RETRIEVAL_DURATION.observe(time.perf_counter() - start)
