from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import sys
from pydantic import BaseModel
from typing import List

# Add ml folder to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ml.inference import AAQAInference

app = FastAPI(title="AAQA Backend API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Inference Instance (Singleton-like)
try:
    analyzer = AAQAInference()
except Exception as e:
    print(f"Error initializing analyzer: {e}")
    analyzer = None

from typing import List, Optional, Dict

class AnalysisResponse(BaseModel):
    score: float
    label: str
    snr: float
    transcription: str
    confidence: float
    noise_level: str
    clarity_score: float
    feedback: List[str]
    dsp_metrics: Optional[Dict] = None

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_ready": analyzer is not None}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="Invalid audio format. Use .wav, .mp3, or .m4a")
    
    # Save file temporarily
    temp_dir = "temp_audio"
    os.makedirs(temp_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    temp_path = os.path.join(temp_dir, f"{file_id}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Convert to standard WAV using pydub for compatibility with scipy and speech_recognition
        from pydub import AudioSegment
        wav_path = os.path.splitext(temp_path)[0] + "_converted.wav"
        
        try:
            audio_seg = AudioSegment.from_file(temp_path)
            audio_seg = audio_seg.set_channels(1).set_frame_rate(16000)
            audio_seg.export(wav_path, format="wav", parameters=["-acodec", "pcm_s16le"])
            processing_path = wav_path
        except Exception as e:
            print(f"Pydub conversion failed: {e}")
            processing_path = temp_path # Fallback
        
        # Run ML analysis
        if analyzer is None:
            raise HTTPException(status_code=503, detail="ML Model not initialized")
            
        result = analyzer.analyze(processing_path)
        
        # Cleanup converted file
        if processing_path != temp_path and os.path.exists(processing_path):
            os.remove(processing_path)
            
        return result
    
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
