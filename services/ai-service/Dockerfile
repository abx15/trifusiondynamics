# Stage 1: Build
FROM python:3.11-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY requirements.txt ./
# Install dependencies using uv to a specific directory for easy copy
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install requirements
RUN uv pip install -r requirements.txt

# Copy source
COPY . .

# Stage 2: Production
FROM python:3.11-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# Copy python virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY --from=builder /app .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
