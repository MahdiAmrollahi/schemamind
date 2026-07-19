# syntax=docker/dockerfile:1.7
# ---------- Stage 1: build dependencies ----------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_SYSTEM_PYTHON=1 \
    PIP_NO_BUILD_ISOLATION=0

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv export --frozen --no-dev --no-hashes --format requirements-txt -o /tmp/req.txt && \
    grep -Ev '^nvidia-' /tmp/req.txt > /tmp/req-cpu.txt && \
    pip install --no-cache-dir --no-deps -r /tmp/req-cpu.txt && \
    pip install --no-cache-dir torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu

COPY app ./app
COPY main.py ./


# ---------- Stage 2: runtime image ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface \
    PORT=8000 \
    USE_TORCH=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 --shell /bin/bash appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/app /app/app
COPY --from=builder /app/main.py /app/main.py

RUN mkdir -p /app/data/databases /app/.cache/huggingface \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:${PORT}/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
