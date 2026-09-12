from typing import Optional

from pydantic import BaseModel, Field


class ProcessSignalRequest(BaseModel):
    signal: list[float]
    fs: int = Field(default=360, ge=100, le=2000)
    filter_type: str = Field(default="F_NB6")   # cadena del modelo final; la de mediana se descarto
    detect_peaks: bool = Field(default=True)
    r_peaks_hint: Optional[list[int]] = (
        None  # Pre-annotated peaks (e.g. from wfdb .atr); skip algorithmic detection if provided
    )
    normalize_global: bool = Field(
        default=True
    )  # True=NB4B global stats (for NB4B models); False=per-recording z-score (for NB5B LOPO model)


class ProcessSignalResponse(BaseModel):
    signal: list[float]
    fs: int
    filter_type: str
    r_peaks: Optional[list[int]] = None
    beats: Optional[list[list[float]]] = (
        None # z-score normalized beats ready for model input
    )
    rr_intervals: Optional[list[float]] = None
    num_beats: int = 0
    beat_mu: Optional[float] = (
        None # global training mu for the filter — needed to denormalize predictions
    )
    beat_std: Optional[float] = (
        None # global training std for the filter — needed to denormalize predictions
    )
    per_beat_mu: Optional[list[float]] = (
        None # per-beat instance normalization mu (one per beat, NB5B midpoint pipeline)
    )
    per_beat_std: Optional[list[float]] = (
        None # per-beat instance normalization std (one per beat, NB5B midpoint pipeline)
    )
    rr_per_beat: Optional[list[float]] = (
        None # BACKWARD RR interval in seconds per beat (NB5B/NB6 LOPO requires this)
    )
    processing_time_ms: float


class PredictRequest(BaseModel):
    beats: list[
        list[float]
    ]  # must be z-score normalized (use beat_mu/beat_std from ProcessSignalResponse)
    lookback: int = Field(default=5, ge=3, le=10)
    model_name: Optional[str] = None
    architecture: Optional[str] = None
    filter_type: Optional[str] = None
    beat_mu: Optional[float] = (
        None  # if provided, prediction is denormalized: pred * beat_std + beat_mu
    )
    beat_std: Optional[float] = None


class PredictResponse(BaseModel):
    predicted_beat: list[
        float
    ]  # always in z-score space — caller multiplies by beat_std and adds beat_mu to get physical units
    model_name: str
    processing_time_ms: float
    is_normalized: bool = True  # True = output is z-score space (default); False = physical space (reserved)


class PredictBatchRequest(BaseModel):
    beats: list[list[float]]
    lookback: int = Field(default=5, ge=3, le=10)
    model_name: Optional[str] = None
    beat_mu: Optional[float] = None
    beat_std: Optional[float] = None


class PredictBatchResponse(BaseModel):
    predicted_beats: list[list[float]]
    model_name: str
    processing_time_ms: float
    is_normalized: bool = True  # True = output is z-score space (default); model always returns normalized


class PredictLOPORequest(BaseModel):
    beats: list[list[float]]
    lookback: Optional[int] = Field(default=5, ge=3, le=10)
    beat_mu: Optional[float] = None
    beat_std: Optional[float] = None
    rr_per_beat: Optional[list[float]] = (
        None # BACKWARD RR in seconds per beat (rr[i] = r_peaks[i]-r_peaks[i-1])/fs; if absent, global mean (0.7758 s) is used
    )


class PredictLOPOResponse(BaseModel):
    predicted_beat: list[float] # first predicted beat (256 samples) — backward compat
    predicted_beats: list[list[float]] # all HORIZON beats: shape (horizon, 256)
    model_name: str
    r2_score: float
    ci95: list[float]
    processing_time_ms: float   # total del servidor: preparar entrada + inferencia + serializar
    inference_ms: float = 0.0    # SOLO la pasada del modelo; es la latencia que la tesis declara
    is_normalized: bool = True
    horizon: int = 3


class ModelInfo(BaseModel):
    name: str
    architecture: str
    filter: str
    lookback: int
    is_lopo: bool = False
    r2_lopo: Optional[float] = None
    ic95: Optional[list[float]] = None


class ModelsListResponse(BaseModel):
    models: list[ModelInfo]
    total: int


class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: int
    uptime_seconds: Optional[float] = None
