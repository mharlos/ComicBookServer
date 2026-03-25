# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ .
RUN npm run build

# ── Stage 2: Python runtime ───────────────────────────────────────────────────
FROM python:3.11-slim

# System deps for comic extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
      unzip \
      unrar-free \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies (including gunicorn for production)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Copy application files
COPY app.py process.sh ./
COPY static/ ./static/

RUN chmod +x process.sh \
    && mkdir -p static/sessions data

EXPOSE 8080

ENV PYTHONUNBUFFERED=1 \
    PORT=8080 \
    DATA_DIR=/app/data

# Gunicorn: 4 workers, WAL-safe for SQLite
CMD ["gunicorn", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8080", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--timeout", "120", \
     "app:app"]
