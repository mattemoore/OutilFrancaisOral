# French Audio to Text Converter

A containerized REST API service that converts French audio files to text using OpenAI's Whisper API.

## Features

- Upload French audio files
- Transcribe audio to text using OpenAI Whisper API
- Dockerized for easy deployment

## Prerequisites

- Docker
- OpenAI API Key

## Setup

1. Clone this repository.
2. Copy the example environment file and add your OpenAI API key:

```bash
cp .env.example .env
```

3. Open the `.env` file and add your OpenAI API key.

## Running with Docker

Build and run the Docker container:

```bash
docker build -t french-audio-converter .
docker run -p 8000:8000 -d french-audio-converter
```

The API will be available at http://localhost:8000

## API Endpoints

### GET /

Returns a welcome message.

### POST /transcribe/

Uploads an audio file and returns the transcribed text.

**Parameters**:
- `audio_file`: Audio file to transcribe (form data)

**Response**:
```json
{
  "text": "Transcribed text in French",
  "language": "fr"
}
```

## Usage Example

Using curl:

```bash
curl -X POST -F "audio_file=@path/to/your/audio.mp3" http://localhost:8000/transcribe/
```

Using Python:

```python
import requests

url = "http://localhost:8000/transcribe/"
files = {"audio_file": open("path/to/your/audio.mp3", "rb")}
response = requests.post(url, files=files)
print(response.json())
```

## Local Development

To run the application locally without Docker:

1. Set up a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the application:

```bash
uvicorn app.main:app --reload
```
