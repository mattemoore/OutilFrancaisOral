# French Speech-to-Text Web Application

This is a simple web application that allows users to record French speech through their microphone and convert it to text using the AudioToText API.

## Features

- Record audio using the browser's microphone API
- Visual recording indicator and timer
- Send audio recordings to the AudioToText API
- Display transcribed text in a readable format

## How It Works

1. The user clicks the "Start Recording" button to begin recording audio through their microphone.
2. While recording, a timer displays the recording duration and a visual indicator shows that recording is in progress.
3. When the user clicks "Stop Recording", the audio is sent to the API for transcription.
4. The transcribed text is displayed in the output area.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Web Audio API
- MediaRecorder API

## Setup and Running

### Using Docker

The web application is containerized using Docker and can be run alongside the API using docker-compose:

```bash
docker-compose up -d
```

This will start both the API service and the web application.

- The web application will be available at: http://localhost:80
- The API will be available at: http://localhost:8000

### Running Locally (Development)

For development purposes, you can run the web application locally using any simple HTTP server:

```bash
cd webapp
# Using Python
python -m http.server 8080
# Or using Node.js with http-server
npx http-server -p 8080
```

Then open http://localhost:8080 in your browser.

## Browser Compatibility

This application requires modern browser features:

- MediaRecorder API
- Web Audio API
- Fetch API

Compatible browsers include:
- Chrome 49+
- Firefox 43+
- Edge 79+
- Safari 14.1+

## Important Note

When running locally, make sure to update the API_URL in script.js to point to your API endpoint if it's not running on the default http://localhost:8000.
