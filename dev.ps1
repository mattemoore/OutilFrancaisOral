#!/usr/bin/env pwsh
# start-services.ps1
# PowerShell script to run both API and webapp services

# Set the base directory
$baseDir = "c:\Code\OutilFrancaisOral"
$apiDir = Join-Path $baseDir "API"
$webappDir = Join-Path $baseDir "WebApp"

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        $dockerInfo = podman info 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $false
        }
        return $true
    }
    catch {
        return $false
    }
}

# Check if Docker is running
if (-not (Test-DockerRunning)) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Display a welcome message
Write-Host "=== French Audio to Text Development Environment ===" -ForegroundColor Cyan
Write-Host "This script will start both the API and the webapp services."
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host ""

try {
    # Validate directories exist
    if (-not (Test-Path $apiDir)) {
        Write-Host "Error: API directory not found at: $apiDir" -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Path $webappDir)) {
        Write-Host "Error: webapp directory not found at: $webappDir" -ForegroundColor Red
        exit 1
    }

    # Check for .env file in API directory
    $envFile = Join-Path $apiDir ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "Warning: .env file not found in API directory." -ForegroundColor Yellow
        Write-Host "Creating .env file from example. Please edit it with your OpenAI API key." -ForegroundColor Yellow
        
        $envExampleFile = Join-Path $apiDir ".env.example"
        if (Test-Path $envExampleFile) {
            Copy-Item -Path $envExampleFile -Destination $envFile
            Write-Host "Created .env file from example. Please edit it with your OpenAI API key before continuing." -ForegroundColor Yellow
            Write-Host "Press Enter to continue after editing the .env file, or Ctrl+C to exit..." -ForegroundColor Cyan
            Read-Host
        }
        else {
            Write-Host "Error: .env.example file not found. Please create a .env file with OPENAI_API_KEY=your_key_here" -ForegroundColor Red
            exit 1
        }
    }

    # Start API service
    Write-Host "Starting API service..." -ForegroundColor Green
    Push-Location $apiDir
    podman compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start API service." -ForegroundColor Red
        exit 1
    }
    Pop-Location

    # Wait for API to start
    Write-Host "Waiting for API to start (5 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Start webapp service
    Write-Host "Starting webapp service..." -ForegroundColor Green
    Push-Location $webappDir
    podman compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start webapp service." -ForegroundColor Red
        exit 1
    }
    Pop-Location

    # Display success message and URLs
    Write-Host ""
    Write-Host "Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "API: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "Webapp: http://localhost:80" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Logs can be viewed with:" -ForegroundColor Yellow
    Write-Host "  docker-compose -f $apiDir\docker-compose.yml logs -f" -ForegroundColor Gray
    Write-Host "  docker-compose -f $webappDir\docker-compose.yml logs -f" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press Enter to stop all services..." -ForegroundColor Yellow
    Read-Host

    # Stop services when Enter is pressed
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    
    # Stop webapp service
    Push-Location $webappDir
    podman compose down
    Pop-Location
    
    # Stop API service
    Push-Location $apiDir
    podman compose down
    Pop-Location
    
    Write-Host "All services stopped." -ForegroundColor Green
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
    
    # Try to stop any services that might be running
    try {
        Push-Location $webappDir
        docker-compose down 2>$null
        Pop-Location
        
        Push-Location $apiDir
        docker-compose down 2>$null
        Pop-Location
    }
    catch {
        # Ignore errors when stopping
    }
    
    exit 1
}
