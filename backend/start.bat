@echo off
echo =========================================
echo OmniMeetX - FastAPI Backend Startup
echo =========================================

cd /d "%~dp0"

IF NOT EXIST "venv\Scripts\python.exe" (
    echo [INFO] Virtual environment not found. Creating one...
    python -m venv venv
    venv\Scripts\python.exe -m pip install --upgrade pip
    echo [INFO] Installing requirements...
    venv\Scripts\python.exe -m pip install -r requirements-dev.txt
)

IF NOT EXIST ".env" (
    echo [WARN] No .env file found - copy .env.example to .env and add your API keys.
)

echo [INFO] Starting FastAPI server on http://localhost:5000  (API docs: /docs)
venv\Scripts\python.exe -m uvicorn app.main:socket_app --host 0.0.0.0 --port 5000 --reload

pause
