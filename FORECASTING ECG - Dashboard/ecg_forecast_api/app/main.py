from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import time

from app.models.schemas import HealthResponse
from app.api.routes import predict, process, models, patients
from app.core.model_loader import preload_models, MODEL_REGISTRY, list_available_models

app = FastAPI(
    title="ECG Forecasting API",
    description="API for ECG beat prediction using deep learning models",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api", tags=["predict"])
app.include_router(process.router, prefix="/api", tags=["process"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(patients.router, prefix="/api", tags=["patients"])

_start_time = time.time()


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    available = list_available_models()
    n_available = sum(1 for m in available if m.get("available", False))
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        models_loaded=n_available,
        uptime_seconds=time.time() - _start_time
    )


@app.on_event("startup")
async def startup_event():
    import keras
    print(f"Keras version at startup: {keras.__version__}")
    print("Preloading models...")
    preload_models()
    print("Models preloaded successfully")
