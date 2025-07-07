# CodePair Server Startup Script
# This script starts the Yjs WebSocket server

Write-Host "🚀 Starting CodePair Yjs Server..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "server")) {
    Write-Host "❌ Error: 'server' directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Navigate to server directory
Set-Location "server"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check if dist directory exists, if not build the project
if (-not (Test-Path "dist")) {
    Write-Host "🔨 Building server..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build server" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Starting server on http://localhost:3001" -ForegroundColor Green
Write-Host "📊 Health check: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "📋 Active rooms: http://localhost:3001/rooms" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev 