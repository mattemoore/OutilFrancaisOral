import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openai
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import BaseModel
from fastapi.responses import FileResponse

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

@app.get("/start-question/{question_id}")
async def start_question(question_id: str):
    """
    Simple endpoint that takes a question ID and returns it.
    This endpoint is used to demonstrate the functionality of the "Start Question" button.
    """
    # Check if the question ID is valid (using the same logic as in get_question_audio)
    questions = {
        "test-preparation": "Parlez-moi de comment vous vous préparez à cet examen. Qu'avez-vous fait pour améliorer votre français?",
        "current-employment": "Parlez-moi de votre emploi actuel. Quel est votre poste et quelles sont vos responsabilités principales?",
        "current-job-duties": "Décrivez-moi une journée typique dans votre travail. Quelles sont vos tâches quotidiennes?",
        "previous-job": "Parlez-moi de votre emploi précédent. Pourquoi avez-vous changé de poste?",
        "previous-job-duties": "Quelles étaient vos responsabilités dans votre poste précédent? En quoi étaient-elles différentes de votre poste actuel?"
    }
    
    # Check if the question ID exists
    if question_id not in questions:
        raise HTTPException(status_code=404, detail=f"Question ID '{question_id}' not found")
    
    # Return the question ID as confirmation
    return {
        "question_id": question_id,
        "status": "success",
        "message": "Question started successfully"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
