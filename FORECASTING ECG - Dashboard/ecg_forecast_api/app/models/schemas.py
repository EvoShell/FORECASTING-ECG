from typing import Optional

from pydantic import BaseModel, Field

# ── Topes de tamano de las entradas ──────────────────────────────────────────
#
# Sin ellos, FastAPI carga el cuerpo entero en memoria ANTES de validar: un POST
# suficientemente grande agota los 4 GB del contenedor y lo reinicia. Ademas
# `scipy.signal.resample` esta basado en FFT y con una longitud de numero primo
# recurre al algoritmo de Bluestein, cuyo coste se dispara.
#
# Los valores no son redondos por capricho, salen del uso real:
#   - Un registro de MIT-BIH son ~650 000 muestras (30 min a 360 Hz). El tope de
#     3 000 000 deja margen para casi dos horas y media, muy por encima de
#     cualquier registro de las dos bases.
#   - Los picos R de media hora rondan los 2 300; 50 000 es holgadisimo.
#   - `predict_lopo` recibe el contexto del modelo, que son 5 latidos. El tope de
#     64 admite cualquier ventana razonable sin permitir un lote gigante.

MAX_MUESTRAS = 3_000_000
MAX_PICOS = 50_000
MAX_LATIDOS_CONTEXTO = 64
MAX_MUESTRAS_POR_LATIDO = 4_096


class ProcessSignalRequest(BaseModel):
    signal: list[float] = Field(..., max_length=MAX_MUESTRAS)
    fs: int = Field(default=360, ge=100, le=2000)
    filter_type: str = Field(default="F_NB6")   # cadena del modelo final; la de mediana se descarto
    detect_peaks: bool = Field(default=True)
    # Picos preanotados (p. ej. del .atr de wfdb); si vienen, se salta la deteccion.
    r_peaks_hint: Optional[list[int]] = Field(default=None, max_length=MAX_PICOS)
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
    # beat_symbols y beat_classes son opcionales por dos motivos. Uno: quedan en null
    # para quien no los espere, de modo que ningun cliente anterior se rompe. Y dos:
    # solo hay etiqueta cuando la senal viene de un registro anotado, que es el caso de
    # /api/process_patient; /api/process_signal recibe una senal cruda y no tiene de
    # donde sacarla. Son la anotacion del registro, nunca una salida del modelo.
    beat_symbols: Optional[list[str]] = (
        None # simbolo PhysioNet de cada latido, alineado con `beats`
    )
    beat_classes: Optional[list[str]] = (
        None # clase AAMI de cada latido: N, SVEB, VEB, F o Q
    )
    processing_time_ms: float


# Aqui vivian PredictRequest/Response y PredictBatchRequest/Response. Se retiraron
# con sus endpoints /api/predict y /api/predict_batch, que construian un nombre de
# modelo inexistente y devolvian 500 en toda peticion. No los usaba nadie mas: el
# unico camino de prediccion vivo es /api/predict_lopo.


class PredictLOPORequest(BaseModel):
    beats: list[list[float]] = Field(..., max_length=MAX_LATIDOS_CONTEXTO)
    lookback: Optional[int] = Field(default=5, ge=3, le=10)
    beat_mu: Optional[float] = None
    beat_std: Optional[float] = None
    # RR hacia atras en segundos por latido: rr[i] = (r_peaks[i] - r_peaks[i-1]) / fs.
    # Si falta, se usa la media global (0.7758 s).
    rr_per_beat: Optional[list[float]] = Field(default=None, max_length=MAX_LATIDOS_CONTEXTO)


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
