@echo off
echo Starting Quiz Game Project...

start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 5
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo Backend and Frontend started in separate windows
echo Close windows to stop services
pause
