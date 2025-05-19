import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openai
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    UPLOAD_DIR: str = "uploads"
    
    class Config:
        env_file = ".env"


settings = Settings()
openai.api_key = settings.OPENAI_API_KEY
print(f"OpenAI API Key: {settings.OPENAI_API_KEY}")

app = FastAPI(title="French Audio to Text Converter", 
             description="REST API service that converts French audio to text using OpenAI's Whisper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@app.get("/")
def read_root():
    return {"message": "Welcome to the French Audio to Text Converter API"}


@app.post("/transcribe/")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """
    Transcribe French audio file to text using OpenAI Whisper API.
    """
    # Validate file
    if not audio_file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Save uploaded file to disk temporarily
    file_extension = audio_file.filename.split(".")[-1] if "." in audio_file.filename else ""
    temp_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = Path(settings.UPLOAD_DIR) / temp_filename
    
    try:
        # Save the file
        with open(file_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        # Call OpenAI Whisper API
        with open(file_path, "rb") as audio:
            transcript = openai.Audio.transcribe(
                model="whisper-1",
                file=audio,
                language="fr"
            )
        
        # Return the transcript
        return {
            "text": transcript.text,
            "language": "fr"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    
    finally:
        # Clean up the temporary file
        if file_path.exists():
            try:
                os.unlink(file_path)
            except:
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
