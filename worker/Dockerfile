# ---- Build Stage ----
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Production Stage ----
FROM python:3.11-slim AS production

# Create non-root user
RUN groupadd -g 1001 worker && useradd -u 1001 -g worker -s /bin/sh -m worker

WORKDIR /app

COPY --from=builder /install /usr/local
COPY --chown=worker:worker worker.py .

USER worker

CMD ["python", "-u", "worker.py"]
