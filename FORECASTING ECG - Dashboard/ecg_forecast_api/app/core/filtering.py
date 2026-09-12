import numpy as np
from scipy import signal
from scipy.ndimage import median_filter as ndimage_median_filter


def _f_notch(sig: np.ndarray, fs: int = 360) -> np.ndarray:
    """IIR notch at 60 Hz, Q=30, zero-phase filtfilt.
    Matches: b, a = spsig.iirnotch(60.0, 30.0, FS); spsig.filtfilt(b, a, s)
    """
    b, a = signal.iirnotch(60.0, 30.0, fs)
    return signal.filtfilt(b, a, sig)


def _f_butter_bp(sig: np.ndarray, fs: int = 360) -> np.ndarray:
    """4th-order Butterworth bandpass 0.5–40 Hz, zero-phase filtfilt.
    Matches: b, a = spsig.butter(4, [0.5/nyq, 40.0/nyq], btype='band'); spsig.filtfilt(b, a, s)
    """
    nyq = fs / 2.0
    b, a = signal.butter(4, [0.5 / nyq, 40.0 / nyq], btype="band")
    return signal.filtfilt(b, a, sig)


def _f_mediana(sig: np.ndarray, fs: int = 360) -> np.ndarray:
    """Median smoothing filter — replaces signal with median-smoothed version.

    Matches exactly:
        k = FS // 10          # 360 // 10 = 36
        k = k if k % 2 == 1 else k + 1   # -> 37
        return median_filter(s, size=k)

    NOTE: this is a SMOOTHING filter (not baseline subtraction).
    k = 37 at fs=360.
    """
    k = fs // 10
    if k % 2 == 0:
        k += 1
    return ndimage_median_filter(sig, size=k)


def apply_filter_nb6(sig: np.ndarray, fs: int = 360) -> np.ndarray:
    """NB6-specific filter — exactly matches filtro_completo() in 06_Cross_patient_MultiStep.ipynb.

    Pipeline (in order):
    1. Notch 60 Hz, Q=30 — iirnotch + filtfilt
    2. Butterworth BP 0.5-40 Hz, order 4, SOS form — sosfiltfilt
    3. Linear detrend — scipy.signal.detrend(type='linear')
    4. Global z-score of the ENTIRE signal — (s - mean) / (std + 1e-8)
    5. NaN replacement — nan_to_num

    IMPORTANT: The notebook uses FS=360 for ALL signals including INCART (257 Hz).
    The filter is therefore always designed for 360 Hz even if the source data
    was recorded at a different sample rate.
    """
    s = sig.copy().astype(np.float64)

    try:
        # 1. Notch 60 Hz
        b, a = signal.iirnotch(60.0, 30.0, fs)
        s = signal.filtfilt(b, a, s)

        # 2. Butterworth bandpass SOS (matches sosfiltfilt in notebook)
        nyq = fs / 2.0
        sos = signal.butter(4, [0.5 / nyq, 40.0 / nyq], btype="band", output="sos")
        s = signal.sosfiltfilt(sos, s)

    except Exception as e:
        print(f"  ⚠ NB6 filter fallback: {e}")

    # 3. Linear detrend
    s = signal.detrend(s, type="linear")

    # 4. Global z-score normalization
    mu = float(np.mean(s))
    std = max(float(np.std(s)), 1e-8)
    s = (s - mu) / std

    # 5. Replace NaN/Inf
    return np.nan_to_num(s).astype(np.float32)


def apply_filter(sig: np.ndarray, fs: int, filter_type: str) -> np.ndarray:
    """Apply filter pipeline.

    NB4B filters (with Median):
        'F_MED'      : [f_mediana]
        'F_N+MED'    : [f_notch, f_mediana]
        'F_N+PB+MED' : [f_notch, f_butter_bp, f_mediana]

    NB6 filter (NO Median — matches filtro_completo in 06_Cross_patient_MultiStep.ipynb):
        'F_NB6' : Notch(60Hz) + BP_SOS(0.5–40Hz) + Detrend + Z-score_global

    'N'   = Notch 60 Hz iirnotch
    'PB'  = Pasa-Banda Butterworth 4th order
    'MED' = Mediana smoothing (k=37 at 360Hz) — only for NB4B models
    """
    s = sig.copy().astype(np.float64)

    # ── NB6 pipeline — no median filter ──
    if "NB6" in filter_type.upper():
        return apply_filter_nb6(sig, fs)

    # ── NB4B pipelines (with median) ──
    if filter_type == "F_MED":
        return _f_mediana(s, fs).astype(np.float32)

    elif filter_type == "F_N+MED":
        s = _f_notch(s, fs)
        s = _f_mediana(s, fs)
        return s.astype(np.float32)

    elif filter_type == "F_N+PB+MED":
        s = _f_notch(s, fs)
        s = _f_butter_bp(s, fs)
        s = _f_mediana(s, fs)
        return s.astype(np.float32)

    else:
        raise ValueError(
            f"Unknown filter type: {filter_type}. Valid: F_NB6, F_MED, F_N+MED, F_N+PB+MED"
        )
