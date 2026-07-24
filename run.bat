@echo off
REM Smart Tred Application Launcher
REM فعال‌کننده اپلیکیشن Smart Tred

echo.
echo ╔════════════════════════════════════════╗
echo ║    Smart Tred - Application Launcher   ║
echo ║  راه‌انداز اپلیکیشن Smart Tred        ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if backend directory exists
if not exist "app" (
    echo Error: app directory not found!
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "ui" (
    echo Error: ui directory not found!
    pause
    exit /b 1
)

REM Start Backend
echo Starting Backend Server...
start cmd /k "cd /d "%~dp0" && if not exist ".venv" python -m venv .venv >nul 2>&1 & call .venv\Scripts\activate & python -m pip install -e app >nul 2>&1 & python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2

REM Start Frontend
echo Starting Frontend Server...
start cmd /k "cd /d "%~dp0\ui" && npm run dev"

echo.
echo ✅ Both servers are starting...
echo.
echo Frontend: http://localhost:3000 or http://localhost:5173
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
pause
