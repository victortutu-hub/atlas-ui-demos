@echo off
echo ========================================
echo  ATLAS UI v4.0 - LIVE DEMOS
echo  Starting Local Server...
echo ========================================
echo.

REM Check for Python 3
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python found! Starting server on http://localhost:8000
    echo.
    echo Opening browser...
    start http://localhost:8000
    echo.
    echo Server is running! Press CTRL+C to stop.
    echo ========================================
    python -m http.server 8000
) else (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3 from: https://www.python.org/downloads/
    echo Or run manually with: python -m http.server 8000
    echo.
    pause
)
