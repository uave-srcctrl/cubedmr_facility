@echo off
REM WoundCare Development Server Startup Script (Windows)

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo WoundCare Development Environment
echo ==========================================
echo.
echo Configuration:
echo - Environment: LOCAL
echo - Backend: http://localhost:5000
echo - Database: Docker MSSQL (localhost:4433)
echo - React App: http://localhost:5173
echo.

REM Verify .env.local
echo Checking .env.local configuration...
if exist ".env.local" (
    for /f "tokens=2 delims==" %%a in ('findstr "VITE_ENVIRONMENT=" .env.local') do set ENV_SETTING=%%a
    echo - .env.local found
    echo   Environment: !ENV_SETTING!
    if not "!ENV_SETTING!"=="local" (
        echo.
        echo WARNING: VITE_ENVIRONMENT is not set to 'local'
        echo Update .env.local to use VITE_ENVIRONMENT=local
        echo.
    )
) else (
    echo ERROR: .env.local not found!
    exit /b 1
)

echo.
echo Verifying prerequisites...

REM Check Node modules
echo Checking Node modules...
if exist "node_modules" (
    echo - Node modules: installed (root)
) else (
    echo ERROR: Node modules not installed in root
    echo Run: npm install
    exit /b 1
)

echo.
echo Starting development servers...
echo.
echo Starting 2 terminals:
echo 1. Express Server on http://localhost:5000
echo 2. Vite Client on http://localhost:5173
echo.
echo Press Ctrl+C in either terminal to stop all servers
echo.

REM Start Express server in new window
echo Launching Express server (npm run dev)...
start "WoundCare Server" cmd /k "npm run dev"

REM Give server time to start
timeout /t 2 /nobreak

REM Start Vite client in another new window
echo Launching Vite client (npm run dev:client)...
start "WoundCare Client" cmd /k "npm run dev:client"

echo.
echo Servers starting... Opening browser in 3 seconds
timeout /t 3 /nobreak

REM Open browser to React app
echo Opening http://localhost:5173
start http://localhost:5173

echo.
echo ==========================================
echo Development servers are running:
echo - Express API:    http://localhost:5000
echo - React App:      http://localhost:5173
echo - Docker MSSQL:   localhost:4433
echo.
echo Check both console windows for errors
echo ==========================================
echo.
echo Access points:
echo   - React App: http://localhost:5173
echo   - API Test: https://api-dev.local/test
echo   - API Test: https://api-prod.local/test
echo.
echo Press Ctrl+C to stop
echo.

cd client
npm run dev

endlocal
