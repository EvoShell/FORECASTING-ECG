import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = os.getenv("MODEL_DIR", str(BASE_DIR / "models"))

FS = 360
BEAT_LEN = 256
LOOKBACK = 5  # NB4B fixed lookback (was [3, 5, 10])
FILTERS = ["F_N+MED", "F_MED", "F_N+PB+MED"]
ARCHITECTURES = ["GRU", "LSTM", "CNN-GRU", "CNN-LSTM"]

# Global normalization statistics from NB4B training set.
# Source: results/NB4B/modelos/norm_{filter}.json  (n_train = 3086 beat windows)
# Inference: (beats - mu) / std  before feeding a NB4B model.
NB4B_NORM: dict[str, dict[str, float]] = {
    "F_MED": {"mu": -0.3607941269874573, "std": 0.4094865620136261},
    "F_N+MED": {"mu": -0.36089080572128296, "std": 0.40945541858673096},
    "F_N+PB+MED": {"mu": -0.036191169172525406, "std": 0.22215603291988373},
}



# ─────────────────────────────────────────────────────────────────────────────
# Correspondencia simbolo PhysioNet -> clase AAMI (ANSI/AAMI EC57).
#
# Copiada del cuaderno 08 (celda 6) y de scripts/p2_analisis_exploratorio.py. Si
# aqui difiriera, la clase que sirve la API no seria la misma con la que se midio
# el error por clase en esa fase, y las dos cifras dejarian de ser comparables.
#
# La etiqueta es del cardiologo que anoto el registro, no del modelo: este predice
# morfologia y no clasifica el evento.
# ─────────────────────────────────────────────────────────────────────────────
AAMI_POR_SIMBOLO: dict[str, str] = {}
for _c in "NLRej":
    AAMI_POR_SIMBOLO[_c] = "N"      # normal o de conduccion
for _c in "AaJS":
    AAMI_POR_SIMBOLO[_c] = "SVEB"   # ectopico supraventricular
for _c in "VE":
    AAMI_POR_SIMBOLO[_c] = "VEB"    # ectopico ventricular
for _c in "F":
    AAMI_POR_SIMBOLO[_c] = "F"      # fusion
for _c in "/fQ":
    AAMI_POR_SIMBOLO[_c] = "Q"      # no clasificable o estimulado

CLASES_AAMI = ("N", "SVEB", "VEB", "F", "Q")


def clase_aami(simbolo: str) -> str:
    """Clase AAMI de un simbolo de latido.

    'B' es un tipo de latido para PhysioNet pero no tiene clase en la norma; como en
    el cuaderno 08, cae en Q (no clasificable) en vez de inventarle una.
    """
    return AAMI_POR_SIMBOLO.get(simbolo, "Q")


# NB6 model: CNN_GRU_ATTN — multi-step forecaster (HORIZON=3), trained on 123 patients (MIT-BIH + INCART)
# Source: results/NB5/modelos/CNN_GRU_ATTN_final.keras + CNN_GRU_ATTN_final_metadata.json
#
# FILTER: The NB6 notebook (06_Cross_patient_MultiStep.ipynb) uses filtro_completo():
#   1. iirnotch(60 Hz, Q=30) + filtfilt
#   2. butter(4, [0.5/180, 40/180], 'band', 'sos') + sosfiltfilt
#   3. detrend(type='linear')
#   4. global z-score: (s - mean) / (std + 1e-8)
# There is NO median filter in NB6. F_NB6 encodes this exact pipeline.
NB6_CONFIG = {
    "name": "CNN_GRU_ATTN",
    "filename": "CNN_GRU_ATTN_final_patched.keras",
    "filter": "F_NB6", # NOT F_N+PB+MED — NB6 has no median filter
    "lookback": 5,
    "horizon": 3,
    "beat_len": 256,
    "feat_dim": 257, # 256 beat samples + 1 normalized RR interval
    "instance_norm": True, # per-beat z-score normalization at inference
    "rr_mu": 0.7758458256721497,
    "rr_std": 0.23085200786590576,
    "r2_lopo": 0.6734,
    "ic95": [0.6237, 0.7231],
    "n_pacientes": 123,
}
LOPO_CONFIG = NB6_CONFIG  # backward-compatible alias
