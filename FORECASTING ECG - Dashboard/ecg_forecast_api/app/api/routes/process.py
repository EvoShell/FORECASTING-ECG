import logging
from fastapi import APIRouter, HTTPException
import time
import numpy as np

from app.models.schemas import ProcessSignalRequest, ProcessSignalResponse
from app.core.preprocessing import preprocess_signal

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/process_signal", response_model=ProcessSignalResponse)
async def process_signal(request: ProcessSignalRequest):
    if len(request.signal) < 360:
        raise HTTPException(status_code=400, detail="Signal too short (minimum 360 samples)")

    start_time = time.perf_counter()

    try:
        sig_array = np.array(request.signal, dtype=np.float32)
        result = preprocess_signal(
            sig_array,
            request.fs,
            request.filter_type,
            request.detect_peaks,
            r_peaks_hint=request.r_peaks_hint,
            normalize_global=request.normalize_global,
        )
    except ValueError as e:
        # `filtering.py` lanza ValueError cuando el `filter_type` no existe. Eso es un
        # error de quien llama, no del servidor: devolverlo como 500 falsea las
        # metricas de error y hace perder el tiempo a quien depura.
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Las excepciones de wfdb y de h5py llevan la ruta absoluta del archivo. El
        # frontend muestra este texto tal cual en pantalla, asi que el detalle se
        # queda generico y la traza va al registro del servidor.
        logger.exception("Fallo al procesar la senal")
        raise HTTPException(
            status_code=500,
            detail="No se pudo procesar la senal. Revise el registro del servidor.",
        ) from e

    processing_time = (time.perf_counter() - start_time) * 1000

    return ProcessSignalResponse(
        signal=result["signal"],
        fs=result["fs"],
        filter_type=result["filter_type"],
        r_peaks=result.get("r_peaks"),
        beats=result.get("beats"),
        rr_intervals=result.get("rr_intervals"),
        num_beats=result.get("num_beats", 0),
        beat_mu=result.get("beat_mu"),
        beat_std=result.get("beat_std"),
        per_beat_mu=result.get("per_beat_mu"),
        per_beat_std=result.get("per_beat_std"),
        rr_per_beat=result.get("rr_per_beat"),
        processing_time_ms=processing_time,
    )
