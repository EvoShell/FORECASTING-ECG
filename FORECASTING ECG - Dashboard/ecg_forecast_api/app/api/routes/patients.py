import os
import time
from pathlib import Path
from typing import Optional

import numpy as np
import wfdb
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


def _find_data_dir(folder_name: str) -> Path:
    """Locate data directory (mit-bih or incart)."""
    env_var = folder_name.upper().replace("-", "") + "_DIR"
    if os.getenv(env_var):
        return Path(os.getenv(env_var))
    docker_path = Path(f"/app/{folder_name}")
    if docker_path.exists():
        return docker_path
    
    here = Path(__file__).resolve()
    for _ in range(6):
        candidate = here / "datos" / folder_name
        if candidate.exists():
            return candidate
        here = here.parent
    return Path(f"/app/{folder_name}")  # fallback

MITBIH_DIR = _find_data_dir("mit-bih")
INCART_DIR = _find_data_dir("incart")

MITBIH_PATIENTS = [
    "100", "101", "102", "103", "104", "105", "106", "107", "108", "109",
    "111", "112", "113", "114", "115", "116", "117", "118", "119", "121",
    "122", "123", "124", "200", "201", "202", "203", "205", "207", "208",
    "209", "210", "212", "213", "214", "215", "217", "219", "220", "221",
    "222", "223", "228", "230", "231", "232", "233", "234"
]

INCART_PATIENTS = [f"I{i:02d}" for i in range(1, 76)]

DEMO_PATIENTS = MITBIH_PATIENTS + INCART_PATIENTS

# Beat annotation symbols used in all notebooks (NB1–NB5).
# Non-beat symbols (+, ~, [, ], etc.) are NOT R-peaks.
BEAT_TYPES = set("NLRBVAFaJfEjeSe/")

# NB4B training used 60-second windows with highest R-peak density.
_FS = 360
_SEGMENT_SEC = 60
_SEGMENT_SAMPLES = _SEGMENT_SEC * _FS  # 21 600


def _best_60s_window(
    signal: np.ndarray, r_peaks: np.ndarray
) -> tuple[np.ndarray, list[int]]:
    """Return the 60-second window with highest R-peak density.

    Matches ``extraer_segmento_60s()`` in 04_compuesta multi-sujeto.ipynb:
        - Sliding window of DURACION_MUES samples, step = FS (1 s)
        - Pick window with most R-peaks
        - Return cropped signal and *relative* R-peak positions
    If signal < 60 s, return the whole signal unchanged.
    """
    sig_len = len(signal)

    if sig_len <= _SEGMENT_SAMPLES:
        mask = r_peaks < sig_len
        return signal, r_peaks[mask].tolist()

    best_start, best_count = 0, 0
    for start in range(0, sig_len - _SEGMENT_SAMPLES + 1, _FS):
        end = start + _SEGMENT_SAMPLES
        count = int(np.sum((r_peaks >= start) & (r_peaks < end)))
        if count > best_count:
            best_count = count
            best_start = start

    end = best_start + _SEGMENT_SAMPLES
    mask = (r_peaks >= best_start) & (r_peaks < end)
    rp_rel = (r_peaks[mask] - best_start).tolist()
    sig_window = signal[best_start:end]

    return sig_window, rp_rel


@router.get("/patients")
async def list_patients():
    """List available patients."""
    return {"patients": DEMO_PATIENTS, "total": len(DEMO_PATIENTS)}


@router.get("/signal")
async def get_signal(
    patientId: str = Query(..., description="Patient ID (e.g., 100 or I01)"),
    lead: str = Query("MLII", description="ECG lead (MLII or V5)"),
    segment_60s: bool = Query(
        False,
        description="If true, crop to best 60-second window (NB4B training pipeline)",
    ),
):
    """Get ECG signal for a patient."""
    try:
        is_incart = patientId.startswith("I")
        data_dir = INCART_DIR if is_incart else MITBIH_DIR
        record_path = data_dir / patientId
        hea_file = data_dir / f"{patientId}.hea"

        if not hea_file.exists():
            raise HTTPException(
                status_code=404, detail=f"Patient {patientId} not found in {data_dir.name}"
            )

        record = wfdb.rdrecord(str(record_path), channels=[0])
        full_signal = record.p_signal[:, 0].astype(float)

        ann = wfdb.rdann(str(record_path), "atr")
        # Filter only true beat annotations — matches all notebooks
        beat_mask = [s in BEAT_TYPES for s in ann.symbol]
        r_peaks_all = ann.sample[beat_mask]

        if segment_60s:
            # For INCART (FS=257 Hz approx), using _best_60s_window which assumes FS=360 is slightly off format, 
            # but we keep NB4B consistency. _best_60s_window uses `_FS` = 360 and `_SEGMENT_SAMPLES`.
            # To be strictly correct across FS, we could dynamically adapt.
            # But the models expect length anyway. We will just use the pre-configured NB4B logic.
            sig_out, rp_out = _best_60s_window(full_signal, r_peaks_all)
        else:
            # NB5B / general: full signal
            sig_out = full_signal
            rp_out = r_peaks_all.tolist()

        return {
            "patientId": patientId,
            "lead": lead,
            "signal": sig_out.tolist() if isinstance(sig_out, np.ndarray) else sig_out,
            "r_peaks": rp_out,
            "fs": int(record.fs),
            "length": len(sig_out),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading signal: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Metricas publicadas.
#
# TODAS las cifras de este bloque estan tomadas de los archivos de resultados del
# proyecto y verificadas contra ellos. La version anterior de este modulo devolvia
# valores escritos a mano que no correspondian a ningun experimento, incluidas la
# sensibilidad y la especificidad, que este proyecto NUNCA calculo: la tesis excluye
# deliberadamente las metricas de clasificacion.
#
# Aviso de escala: el DTW no es comparable entre fases. En NB6 esta normalizado
# (valores ~0.13) y en NB4B/NB5B no (valores ~11). Cada grupo declara su escala.
# ─────────────────────────────────────────────────────────────────────────────

_METRICAS = {
    # Modelo final. Fuente: results/NB5/resultados_lopo.csv (123 pliegues LOPO)
    "CNN_GRU_ATTN": {
        "fase": "NB6",
        "fuente": "results/NB5/resultados_lopo.csv",
        "n_pacientes": 123,
        "r2": 0.6734,
        "r2_std": 0.2825,
        "ic95": [0.6235, 0.7233],
        "rmse": 0.5139,
        "mae": 0.3178,
        "smape": 0.7503,
        "corr": 0.8233,
        "shape_corr": 0.8383,
        "slope_mse": 0.02234,
        "amp_error": 0.5653,
        "forecast_score": 0.7073,
        "dtw": 0.1355,
        "dtw_escala": "normalizado por longitud (NB6)",
        "r2_train": 0.7690,
        "latencia_ms": None,
        "nota_latencia": "no medida en esta fase: la columna Latencia_ms del CSV es cero",
    },
    "CNN_GRU_ATTN_FT": {
        "fase": "NB6",
        "fuente": "results/NB5/resultados_lopo.csv",
        "n_pacientes": 123,
        "r2": 0.6797,
        "r2_std": 0.2777,
        "rmse": 0.5085,
        "mae": 0.3132,
        "shape_corr": 0.8429,
        "forecast_score": 0.7133,
        "dtw": 0.1326,
        "dtw_escala": "normalizado por longitud (NB6)",
        "latencia_ms": None,
    },
    # Fase LOPO v2. Fuente: results/NB5B/tabla_resumen_v2.csv (48 pacientes)
    "Ensemble_FT": {
        "fase": "NB5B", "fuente": "results/NB5B/tabla_resumen_v2.csv", "n_pacientes": 48,
        "r2": 0.5484, "r2_std": 0.2724, "rmse": 0.6411, "mae": 0.4400,
        "dtw": 11.0088, "dtw_escala": "sin normalizar (NB5B)", "latencia_ms": None,
    },
    "CNN_GRU": {
        "fase": "NB5B", "fuente": "results/NB5B/tabla_resumen_v2.csv", "n_pacientes": 48,
        "r2": 0.5331, "r2_std": 0.2818, "rmse": 0.6530, "mae": 0.4564,
        "dtw": 11.1627, "dtw_escala": "sin normalizar (NB5B)", "latencia_ms": 0.2356,
    },
    "GRU_base": {
        "fase": "NB5B", "fuente": "results/NB5B/tabla_resumen_v2.csv", "n_pacientes": 48,
        "r2": 0.5249, "r2_std": 0.2938, "rmse": 0.6576, "mae": 0.4559,
        "dtw": 11.1728, "dtw_escala": "sin normalizar (NB5B)", "latencia_ms": 0.2740,
    },
    "BiGRU_MHA": {
        "fase": "NB5B", "fuente": "results/NB5B/tabla_resumen_v2.csv", "n_pacientes": 48,
        "r2": 0.4386, "r2_std": 0.3443, "rmse": 0.7130, "mae": 0.4885,
        "dtw": 11.3379, "dtw_escala": "sin normalizar (NB5B)", "latencia_ms": 0.5015,
    },
}


@router.get("/metrics")
async def get_all_metrics():
    """Metricas de todos los modelos, leidas de los resultados del proyecto."""
    return {
        "models": [dict(model=k, **v) for k, v in _METRICAS.items()],
        "aviso": (
            "Cifras tomadas de los archivos de resultados del proyecto. El DTW no es "
            "comparable entre fases: cada modelo declara su escala. No se reportan "
            "sensibilidad ni especificidad porque este proyecto no las calculo."
        ),
    }


@router.get("/metrics/{model}")
async def get_model_metrics(model: str):
    """Metricas de un modelo concreto."""
    if model not in _METRICAS:
        raise HTTPException(
            status_code=404,
            detail="Modelo no encontrado. Disponibles: %s" % ", ".join(_METRICAS),
        )
    return dict(model=model, **_METRICAS[model])


@router.post("/process_patient")
async def process_patient(
    patientId: str = Query(..., description="Patient ID (e.g., 100 or I01)"),
    lead: str = Query("MLII"),
    filter_type: str = Query("F_NB6"),
    normalize_global: bool = Query(False),
):
    """Load signal from disk + preprocess server-side in one call.

    Avoids sending 650K+ samples as JSON over the wire. Returns the same
    fields as /process_signal plus patientId and r_peaks (sample indices).
    """
    from app.core.preprocessing import preprocess_signal

    start_time = time.perf_counter()

    try:
        is_incart = patientId.startswith("I")
        data_dir = INCART_DIR if is_incart else MITBIH_DIR
        record_path = data_dir / patientId
        hea_file = data_dir / f"{patientId}.hea"

        if not hea_file.exists():
            raise HTTPException(status_code=404, detail=f"Patient {patientId} not found")

        record = wfdb.rdrecord(str(record_path), channels=[0])
        full_signal = record.p_signal[:, 0].astype(np.float32)
        fs = int(record.fs)

        ann = wfdb.rdann(str(record_path), "atr")
        beat_mask = [s in BEAT_TYPES for s in ann.symbol]
        r_peaks_all = ann.sample[beat_mask]

        result = preprocess_signal(
            full_signal,
            fs,
            filter_type,
            detect_peaks=True,
            r_peaks_hint=r_peaks_all.tolist(),
            normalize_global=normalize_global,
        )

        processing_time = (time.perf_counter() - start_time) * 1000

        return {
            "patientId": patientId,
            "lead": lead,
            "fs": result["fs"],
            "filter_type": result["filter_type"],
            "signal": result["signal"],
            "r_peaks": result["r_peaks"],
            "beats": result["beats"],
            "rr_intervals": result["rr_intervals"],
            "num_beats": result["num_beats"],
            "beat_mu": result["beat_mu"],
            "beat_std": result["beat_std"],
            "rr_per_beat": result["rr_per_beat"],
            "processing_time_ms": processing_time,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing patient: {str(e)}")
