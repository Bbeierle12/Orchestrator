@echo off
echo Starting Orchestrator servers...
echo.
echo Starting Express backend server on port 3001...
start "Express Server" cmd /k "npm run server"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Vite frontend server on port 3000...
start "Vite Dev Server" cmd /k "npm run dev"

echo.
echo Both servers are starting up!
echo.
echo Frontend will be available at: http://localhost:3000
echo Backend API is running at: http://localhost:3001
echo.
echo Close both command windows to stop the servers.
pause