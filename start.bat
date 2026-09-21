@echo off
title Ninimo 24/7 Minecraft Bot Server
echo ============================================================
echo   Starting Ninimo 24/7 Minecraft Bot Server on Local PC...
echo ============================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please install Node.js 18 or newer from https://nodejs.org/
    pause
    exit /b 1
)

if not exist node_modules (
    echo [Setup] Installing dependencies for first-time setup...
    call npm install --legacy-peer-deps
)

if not exist dist\server.cjs (
    echo [Build] Building dashboard and server bundle...
    call npm run build
)

echo [Launch] Starting Ninimo local server...
node index.js
pause
