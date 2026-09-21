#!/usr/bin/env bash
# Ninimo 24/7 Minecraft Bot Server - Linux & macOS Terminal Launcher
set -e

echo "============================================================"
echo "  Starting Ninimo 24/7 Minecraft Bot Server..."
echo "============================================================"

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ [ERROR] Node.js is not installed or not in your PATH."
    echo "Please install Node.js (v18 or newer) to continue: https://nodejs.org/"
    exit 1
fi

# Ensure data directory exists
mkdir -p data

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 [Setup] Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Ensure production build exists
if [ ! -f "dist/server.cjs" ] || [ ! -f "dist/index.html" ]; then
    echo "⚡ [Build] Compiling website and server..."
    npm run build
fi

echo "🚀 [Launch] Starting server..."
node index.js
