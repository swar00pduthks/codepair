# CodePair Extension Build Script
# This script builds and packages the VS Code extension into a .vsix file

Write-Host "🔨 Building CodePair VS Code Extension..." -ForegroundColor Green
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
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Compile TypeScript
Write-Host "🔨 Compiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to compile TypeScript" -ForegroundColor Red
    exit 1
}
Write-Host "✅ TypeScript compiled" -ForegroundColor Green

# Check if vsce is installed globally
try {
    $vsceVersion = vsce --version
    Write-Host "✅ VSCE found: $vsceVersion" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing VSCE globally..." -ForegroundColor Yellow
    npm install -g vsce
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install VSCE" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ VSCE installed" -ForegroundColor Green
}

# Package the extension
Write-Host "📦 Packaging extension..." -ForegroundColor Yellow
npm run package
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to package extension" -ForegroundColor Red
    exit 1
}

# Find the generated .vsix file
$vsixFiles = Get-ChildItem -Name "*.vsix"
if ($vsixFiles.Count -eq 0) {
    Write-Host "❌ No .vsix file found" -ForegroundColor Red
    exit 1
}

$vsixFile = $vsixFiles[0]
$fileSize = (Get-Item $vsixFile).Length / 1MB

Write-Host ""
Write-Host "🎉 Extension packaged successfully!" -ForegroundColor Green
Write-Host "📦 File: $vsixFile" -ForegroundColor Cyan
Write-Host "📏 Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Installation instructions:" -ForegroundColor Yellow
Write-Host "1. Open VS Code" -ForegroundColor White
Write-Host "2. Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "3. Type 'Extensions: Install from VSIX...'" -ForegroundColor White
Write-Host "4. Select the file: $vsixFile" -ForegroundColor White
Write-Host "5. Restart VS Code" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Don't forget to start the server: .\start-server.ps1" -ForegroundColor Yellow

# Go back to root
Set-Location ".." 