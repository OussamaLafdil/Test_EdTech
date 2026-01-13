import os
import tempfile
import pandas as pd
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.funcs import generate_dashboard_data

app = FastAPI(
    title="Student Support Prioritization API",
    description="Backend for the Ministry of Education Student Dashboard.",
    version="1.0.0"
)

# Allow CORS so the React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

if os.path.exists(os.path.join(BACKEND_DIR, "ressources")):
    RESSOURCES_DIR = os.path.join(BACKEND_DIR, "ressources")
elif os.path.exists(os.path.join(PROJECT_ROOT, "ressources")):
    RESSOURCES_DIR = os.path.join(PROJECT_ROOT, "ressources")
else:
    RESSOURCES_DIR = os.path.join(BACKEND_DIR, "ressources")
    os.makedirs(RESSOURCES_DIR, exist_ok=True)

DATA_PATH = os.path.join(RESSOURCES_DIR, "exercice_data.csv")
MODEL_PATH = os.path.join(RESSOURCES_DIR, "model.pkl")
FEATS_PATH = os.path.join(RESSOURCES_DIR, "model_features.pkl")

@app.get("/health")
def health_check():
    """Simple health check to ensure server is running."""
    return {"status": "active"}

@app.get("/api/v1/students")
def get_student_priorities():
    """
    Returns the list of students from the default static dataset.
    """
    if not os.path.exists(MODEL_PATH) or not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=500, detail="Model or Data files not found.")

    try:
        df_results = generate_dashboard_data(DATA_PATH, MODEL_PATH, FEATS_PATH)
        # Rename for frontend consistency (Snake_case to CamelCase/React props)
        df_results = df_results.rename(columns={
            'FinalGrade': 'ActualGrade',
            'Potential_Grade': 'PotentialGrade',
            'Complexity_Score': 'ComplexityScore'
        })
        return df_results.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating data: {str(e)}")

@app.post("/simulate_batch")
async def simulate_batch(data: List[Dict[str, Any]]):
    """
    Receives JSON data (parsed CSV from frontend), saves it to a temp file,
    runs the scoring model, and returns results compatible with the Dashboard.
    """
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(status_code=500, detail="Model file not found. Please train model first.")

    # 1. Convert JSON payload back to DataFrame
    try:
        df_input = pd.DataFrame(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")

    # 2. Create a temporary CSV file because
    # We use delete=False to close the file so pandas can read it, then we remove it manually.
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', encoding='utf-8') as tmp:
        df_input.to_csv(tmp.name, index=False)
        tmp_path = tmp.name

    try:
        # 3. Run the processing function from funcs.py
        df_results = generate_dashboard_data(tmp_path, MODEL_PATH, FEATS_PATH)
        
        # funcs.py outputs: ['FinalGrade', 'Potential_Grade', 'Complexity_Score', ...]
        # App.jsx expects:  ['ActualGrade', 'PotentialGrade', 'ComplexityScore']
        df_results = df_results.rename(columns={
            'FinalGrade': 'ActualGrade',
            'Potential_Grade': 'PotentialGrade',
            'Complexity_Score': 'ComplexityScore'
        })

        # 5. Return JSON
        return df_results.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# run with: uvicorn backend.main:app --host 0.0.0.0 --port 8000
