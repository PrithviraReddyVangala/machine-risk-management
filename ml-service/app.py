from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "risk_model.joblib"

app = FastAPI(
    title="Local Machine Risk Prediction Service",
    version="1.0.0"
)

bundle = None


class PredictionRequest(BaseModel):
    temperature: float = Field(..., description="Machine temperature")
    pressure: float = Field(..., description="Machine pressure")
    vibration: str = Field(..., description="Low, Medium or High")
    humidity: float = Field(..., description="Machine humidity")

@app.on_event("startup")
def load_model():
    global bundle

    if not MODEL_PATH.exists():
        raise RuntimeError(
            "Model not found. Run `python train_model.py` before starting the API."
        )

    bundle = joblib.load(MODEL_PATH)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": bundle is not None
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    if bundle is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    vibration = request.vibration.strip().title()

    if vibration not in bundle["vibration_map"]:
        raise HTTPException(
            status_code=400,
            detail="Vibration must be Low, Medium or High."
        )

    X = pd.DataFrame([{
    "Temperature": request.temperature,
    "Pressure": request.pressure,
    "Vibration": bundle["vibration_map"][vibration],
    "Humidity": request.humidity
}])

    prediction = bundle["model"].predict(X)[0]
    risk_level = bundle["label_encoder"].inverse_transform([prediction])[0]

    return {
        "risk_level": risk_level
    }
