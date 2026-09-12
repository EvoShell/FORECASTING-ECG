import time
from typing import cast

import numpy as np
from fastapi import APIRouter, HTTPException

from app.config import ARCHITECTURES, FILTERS, LOOKBACK, LOPO_CONFIG
from app.core.model_loader import get_model_info, load_model
from app.models.schemas import PredictLOPORequest, PredictLOPOResponse

router = APIRouter()


def _build_model_name(architecture: str = "GRU", filter_type: str = "F_N+MED") -> str:
    """NB4B naming: modelo_{arch}_{filter}.keras  (no lookback suffix)."""
    return f"{architecture}_{filter_type}"


def _normalize_beats(beats_arr: np.ndarray) -> tuple[np.ndarray, float, float]:
    """Per-recording z-score normalization (used when no pre-norm stats provided)."""
    mu = float(beats_arr.mean())
    std = float(max(beats_arr.std(), 1e-8))
    return ((beats_arr - mu) / std).astype(np.float32), mu, std


def _maybe_normalize(
    beats_arr: np.ndarray, beat_mu: float | None, beat_std: float | None
) -> np.ndarray:
    """Skip normalization if the caller confirms beats are already z-scored (beat_mu/beat_std provided).
    Otherwise auto z-score so the model receives data in the trained distribution.
    """
    if beat_mu is not None and beat_std is not None:
        return beats_arr.astype(np.float32)
    beats_norm, _, _ = _normalize_beats(beats_arr)
    return beats_norm


def _build_lopo_input(
    beats_arr: np.ndarray, rr_per_beat: list[float] | None
) -> np.ndarray:
    """Build (1, lookback, 257) input for the NB6 CNN_GRU_ATTN model.

    feat_dim = 257:
        - 256 instance-normalized beat samples
    - 1 normalized RR interval: (rr_sec - rr_mu) / rr_std

    NB6 RR statistics (from CNN_GRU_ATTN_final_metadata.json):
    rr_mu = 0.7758458256721497
    rr_std = 0.23085200786590576

    When rr_per_beat is not provided, the global mean is used (normalized value = 0).
    """
    lookback = beats_arr.shape[0]
    rr_mu = cast(float, LOPO_CONFIG["rr_mu"]) # NB6: 0.7758
    rr_std = cast(float, LOPO_CONFIG["rr_std"]) # NB6: 0.2309

    if rr_per_beat and len(rr_per_beat) >= lookback:
        rr_sec = np.array(rr_per_beat[-lookback:], dtype=np.float32)
    else:
        # Fallback: use global mean → normalized RR = 0 for all beats
        rr_sec = np.full(lookback, rr_mu, dtype=np.float32)

    rr_norm = ((rr_sec - rr_mu) / max(rr_std, 1e-8)).reshape(-1, 1)  # (lookback, 1)
    features = np.concatenate([beats_arr, rr_norm], axis=-1)  # (lookback, 257)
    return np.expand_dims(features, axis=0)  # (1, lookback, 257)


# Los endpoints /predict y /predict_batch se retiraron: construian un nombre de
# modelo ("GRU_F_N+MED") que no existe en MODEL_REGISTRY, donde solo esta "LOPO",
# de modo que devolvian 500 en toda peticion. Ningun cliente los usaba. El unico
# camino de prediccion vivo es /predict_lopo, que es el del modelo de la tesis.

@router.post("/predict_lopo", response_model=PredictLOPOResponse)
async def predict_lopo(request: PredictLOPORequest):
    start_time = time.perf_counter()
    try:
        lookback = cast(int, LOPO_CONFIG["lookback"])
        horizon = cast(int, LOPO_CONFIG.get("horizon", 1))
        model_name = "LOPO"
        model = load_model(model_name)

        beats_arr = np.array(request.beats[-lookback:], dtype=np.float32)
        # NB6 uses per-beat instance normalization (each beat already mean=0, std=1)
        beats_arr = _maybe_normalize(beats_arr, request.beat_mu, request.beat_std)

        # Build (1, lookback, 257) — appends clip-normalized RR to each beat
        X = _build_lopo_input(beats_arr, request.rr_per_beat)

        # Se cronometra SOLO la pasada del modelo. El total del endpoint incluye
        # convertir listas JSON a numpy, serializar 3x256 flotantes de vuelta y la
        # validacion de Pydantic, que no son latencia del modelo.
        t_inf = time.perf_counter()
        pred_tensor = model(X, training=False)
        pred = pred_tensor.numpy()
        inference_ms = (time.perf_counter() - t_inf) * 1000

        # Handle multi-step output: (1, horizon, beat_len) or legacy (1, beat_len)
        if pred.ndim == 3:
            # NB6 CNN_GRU_ATTN: shape (1, horizon, beat_len)
            predicted_beats = [pred[0, h].tolist() for h in range(pred.shape[1])]
            pred_beat = predicted_beats[0]  # first predicted beat — backward compat
        else:
            # Legacy single-step: shape (1, 256) or flattened (1, beat_len*horizon)
            flat = pred[0].flatten()
            beat_len = cast(int, LOPO_CONFIG.get("beat_len", 256))
            if len(flat) == beat_len * horizon and horizon > 1:
                predicted_beats = [
                    flat[h * beat_len : (h + 1) * beat_len].tolist()
                    for h in range(horizon)
                ]
            else:
                predicted_beats = [flat.tolist()]
            pred_beat = predicted_beats[0]

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LOPO prediction error: {str(e)}")

    processing_time = (time.perf_counter() - start_time) * 1000

    return PredictLOPOResponse(
        predicted_beat=pred_beat,
        predicted_beats=predicted_beats,
        model_name=model_name,
        r2_score=cast(float, LOPO_CONFIG["r2_lopo"]),
        ci95=cast(list[float], LOPO_CONFIG["ic95"]),
        processing_time_ms=processing_time,
        inference_ms=inference_ms,
        is_normalized=True,
        horizon=horizon,
    )
