# CodePair Installation Script for Windows
# This script sets up the Yjs server and VS Code extension

Write-Host "🚀 Installing CodePair - Real-time Collaborative Pair Programming" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm." -ForegroundColor Red
    exit 1
}

# Install server dependencies
Write-Host ""
Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
Set-Location "server"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install server dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Server dependencies installed" -ForegroundColor Green

# Build server
Write-Host "🔨 Building server..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build server" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Server built successfully" -ForegroundColor Green

# Go back to root
Set-Location ".."

# Install extension dependencies
Write-Host ""
Write-Host "📦 Installing extension dependencies..." -ForegroundColor Yellow
Set-Location "extension"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install extension dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Extension dependencies installed" -ForegroundColor Green

# Build extension
Write-Host "🔨 Building extension..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build extension" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Extension built successfully" -ForegroundColor Green

# Go back to root
Set-Location ".."

Write-Host ""
Write-Host "🎉 Installation completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the server: cd server && npm run dev" -ForegroundColor White
Write-Host "2. Open VS Code in the extension directory: cd extension && code ." -ForegroundColor White
Write-Host "3. Press F5 to run the extension in a new VS Code window" -ForegroundColor White
Write-Host "4. Use Ctrl+Shift+P and search for 'CodePair' to start collaboration" -ForegroundColor White
Write-Host ""
Write-Host "📚 For more information, see README.md" -ForegroundColor Cyan 