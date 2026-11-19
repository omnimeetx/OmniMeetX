#!/bin/bash
echo "========================================="
echo "OmniMeetX - FastAPI Backend Startup"
echo "========================================="

cd "$(dirname "$0")"

if [ ! -f "venv/bin/python" ]; then
    echo "[INFO] Virtual environment not found. Creating one..."
    python3 -m venv venv
    venv/bin/python -m pip install --upgrade pip
    echo "[INFO] Installing requirements..."
    venv/bin/python -m pip install -r requirements-dev.txt
fi

if [ ! -f ".env" ]; then
    echo "[WARN] No .env file found - copy .env.example to .env and add your API keys."
fi

echo "[INFO] Starting FastAPI server on http://localhost:5000  (API docs: /docs)"
venv/bin/python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 5000 --reload
