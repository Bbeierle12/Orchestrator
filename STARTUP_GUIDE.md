# Orchestrator - Quick Start Guide

## The Issue You're Experiencing
The "Unexpected token '<'" error occurs because the frontend is trying to fetch data from the backend API server, but the backend isn't running. The application requires TWO servers:
- **Frontend (Vite)**: Port 3000 - The React UI
- **Backend (Express)**: Port 3001 - The API that scans directories

## How to Start the Application

### Option 1: Use the Batch File (Easiest)
```bash
# Just double-click or run:
start-servers.bat
```
This will open two terminal windows - one for each server.

### Option 2: Run Both Servers Manually
Open two separate terminals:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Server:**
```bash
npm run dev
```

### Option 3: Use the Combined Script (Windows)
```bash
npm run dev:all
```

## Verify Everything is Working
1. Backend should show: `Server running on port 3001`
2. Frontend should show: `VITE ready at http://localhost:3000`
3. Open browser to: http://localhost:3000
4. The folder browser should now work without JSON errors!

## What Was Fixed
1. **Unit Conversion**: Fixed file sizes showing 1024x larger than actual
2. **Proxy Configuration**: Added Vite proxy to forward API requests
3. **Error Handling**: Better error messages when backend is down
4. **Startup Scripts**: Easy ways to run both servers

## Troubleshooting
- If you still see JSON errors: Make sure the backend server is running (port 3001)
- If ports are in use: Kill any existing Node processes and try again
- Check the console in both terminal windows for any error messages