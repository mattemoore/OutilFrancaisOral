# French Audio to Text Project

This project consists of two components:
1. **AudioToText API**: A REST API service that converts French audio to text using OpenAI's Whisper API
2. **Web Application**: A simple web interface for recording audio and getting text transcriptions

## Quick Start

To run both services in development mode, use the provided PowerShell script:

```powershell
.\dev.ps1
```

This script will:
- Check if Docker or equivalent is running
- Verify the existence of a `.env` file in the AudioToText directory
- Start both services in the correct order
- Provide URLs to access each service
- Offer an option to view logs
- Stop all services when you press Enter

## Requirements

- Docker Desktop
- PowerShell
- An OpenAI API key (to be added to the `.env` file)

## Service URLs

- **AudioToText API**: http://localhost:8000
- **Web Application**: http://localhost:80

## Manual Setup

If you prefer to run each service manually:

### AudioToText API

```powershell
cd AudioToText
docker-compose up -d
```

### Web Application

```powershell
cd webapp
docker-compose up -d
```

## Project Structure

- **AudioToText/**
  - REST API service using FastAPI and OpenAI Whisper
  - See `AudioToText/README.md` for detailed documentation

- **webapp/**
  - Web interface for recording audio and displaying transcriptions
  - See `webapp/README.md` for detailed documentation

## Additional Documentation

For more details on each component, refer to their respective README files:
- [AudioToText API Documentation](./AudioToText/README.md)
- [Web Application Documentation](./webapp/README.md)
