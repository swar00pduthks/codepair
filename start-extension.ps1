# CodePair Extension Startup Script
# This script opens VS Code with the extension for development

Write-Host "🚀 Starting CodePair VS Code Extension..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "extension")) {
    Write-Host "❌ Error: 'extension' directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Navigate to extension directory
Set-Location "extension"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check if out directory exists, if not compile the project
if (-not (Test-Path "out")) {
    Write-Host "🔨 Compiling extension..." -ForegroundColor Yellow
    npm run compile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to compile extension" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Opening VS Code with extension..." -ForegroundColor Green
Write-Host "📋 Instructions:" -ForegroundColor Cyan
Write-Host "1. Press F5 to run the extension in a new VS Code window" -ForegroundColor White
Write-Host "2. In the new window, open a text file" -ForegroundColor White
Write-Host "3. Press Ctrl+Shift+P and search for 'CodePair'" -ForegroundColor White
Write-Host "4. Choose 'CodePair: Start Collaboration'" -ForegroundColor White
Write-Host "5. Share the room ID with your partner" -ForegroundColor White
Write-Host ""

# Open VS Code in the extension directory
code . 