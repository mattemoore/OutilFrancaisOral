import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import BaseModel
from fastapi.responses import FileResponse
from openai import OpenAI

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    UPLOAD_DIR: str = "uploads"
    
    class Config:
        env_file = ".env"


settings = Settings()
client = OpenAI(api_key=settings.OPENAI_API_KEY)

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


@app.post("/process-answer/")
async def process_answer(audio_file: UploadFile = File(...)):
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
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="fr"
            )
        
        # Return the transcript
        return {
            "text": transcript_response.text,
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

@app.get("/pose-question/{question_id}")
async def pose_question(question_id: str):
    """
    Retrieves a predefined question, reformulates it using OpenAI's GPT model, 
    and returns the reformulated question.
    """
    questions = {
        "current-employment": "Quel est votre poste courant?",
        "current-job-duties": "Décrivez-moi une journée typique dans votre travail. Quelles sont vos tâches quotidiennes?",
        "previous-job": "Parlez-moi de votre emploi précédent. Pourquoi avez-vous changé de poste?",
        "previous-job-duties": "Quelles étaient vos responsabilités dans votre poste précédent? En quoi étaient-elles différentes de votre poste actuel?"
    }
    
    original_question = questions.get(question_id)
    
    if not original_question:
        raise HTTPException(status_code=404, detail=f"Question ID '{question_id}' not found")
    
    try:
        # Reformulate the question using OpenAI's chat completion
        chat_completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Reformulate the following French question to make it sound more natural and engaging, as but keep it professional as this question is going to be asked in a oral exam setting. Keep it in French."},
                {"role": "user", "content": original_question}
            ]
        )
        reformulated_question = chat_completion.choices[0].message.content.strip()
        
        return {
            "original_question_id": question_id,
            "original_question": original_question,
            "reformulated_question": reformulated_question,
            "status": "success"
        }
    except Exception as e:
        # Log the error for debugging
        print(f"Error during OpenAI API call: {str(e)}")
        # Consider if the original question should be returned or a more specific error
        raise HTTPException(status_code=500, detail=f"Error reformulating question: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
