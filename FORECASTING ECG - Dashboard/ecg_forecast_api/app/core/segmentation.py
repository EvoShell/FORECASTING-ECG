import numpy as np
from scipy import signal as spsig


def segment_beats(
    sig: np.ndarray,
    r_peaks: np.ndarray,
    beat_len: int = 256,
    labels: list[str] | None = None,
) -> tuple[list[np.ndarray], list[float], list[str]]:
    """Segment beats using midpoint-to-midpoint window and FFT-based resampling.

    Matches the training pipeline in all notebooks:
        start = (r_peaks[i-1] + r_peaks[i]) // 2
        end   = (r_peaks[i]   + r_peaks[i+1]) // 2
        beat  = scipy.signal.resample(seg, beat_len)   # FFT-based

    Requires at least 3 R-peaks to produce any beat.

    Parameters
    ----------
    labels : list of str, optional
        Una etiqueta por pico R (el simbolo de la anotacion, por ejemplo). Si se pasa,
        viaja DENTRO del bucle: este descarta latidos, y pegar las etiquetas despues
        correria todas las posteriores a cada descarte.

    Returns
    -------
    beats : list of np.ndarray, each shape (beat_len,)
    rr_per_beat : list of float — forward RR interval in seconds for each beat:
        rr[b] = (r_peaks[i+1] - r_peaks[i]) / 360.0
        This is the interval needed by the NB5B LOPO model (feat_dim=257).
    kept_labels : list of str — la etiqueta de cada latido que sobrevivio al bucle.
        Vacia si no se paso `labels`.
    """
    if labels is not None and len(labels) != len(r_peaks):
        # Un desajuste aqui no se nota en la respuesta: produce etiquetas creibles
        # pero corridas. Preferimos que reviente.
        raise ValueError(
            "labels y r_peaks deben tener la misma longitud: %d != %d"
            % (len(labels), len(r_peaks))
        )

    if len(r_peaks) < 3:
        return [], [], []

    beats: list[np.ndarray] = []
    rr_per_beat: list[float] = []
    kept_labels: list[str] = []

    for i in range(1, len(r_peaks) - 1):
        start = int((r_peaks[i - 1] + r_peaks[i]) // 2)
        end = int((r_peaks[i] + r_peaks[i + 1]) // 2)

        if end <= start or end - start < 50:
            continue

        seg = sig[start:end]

        if len(seg) < 2:
            continue

        # FFT-based polyphase resampling — identical to spsig.resample(seg, beat_len) in notebooks
        beat_resampled = spsig.resample(seg, beat_len).astype(np.float32)
        beats.append(beat_resampled)

        # Forward RR interval in seconds: r_peaks[i] → r_peaks[i+1]
        rr_sec = float((r_peaks[i + 1] - r_peaks[i]) / 360.0)
        rr_per_beat.append(rr_sec)

        if labels is not None:
            kept_labels.append(labels[i])

    return beats, rr_per_beat, kept_labels


def segment_beats_fixed_window(
    sig: np.ndarray,
    r_peaks: np.ndarray,
    beat_len: int = 256,
    labels: list[str] | None = None,
) -> tuple[list[np.ndarray], list[float], list[str]]:
    """Fixed-window segmentation centered on R-peak — matches NB6 training (extraer_latidos_v3).

    Window layout (no resampling — exactly beat_len samples):
        PRE_R  = beat_len * 36 // 100  # 92 samples before R-peak
        POST_R = beat_len - PRE_R      # 164 samples after R-peak

    Per-beat normalization:
        z = clip((beat - mean(beat)) / max(std(beat), 1e-6), -5, 5)

    RR interval (BACKWARD — matches extraer_latidos_v3 in NB6):
        rr_sec = (r_peaks[i] - r_peaks[i-1]) / 360.0  clipped to [0.3, 2.0] s

    NOTE: The notebook uses BACKWARD RR (from previous peak to current peak),
    not forward RR. This matters for the global statistics:
    rr_mu_global = 0.7758 s (metadata.json)
    rr_std_global = 0.2309 s

    Requires at least 3 R-peaks (first and last are skipped as guard beats).

    Parameters
    ----------
    sig : np.ndarray
        Filtered ECG signal sampled at 360 Hz.
    r_peaks : np.ndarray
        Array of R-peak sample indices (integer).
    beat_len : int
        Target beat length in samples (default 256).
    labels : list of str, optional
        Una etiqueta por pico R. Se filtra aqui dentro por el mismo motivo que en
        segment_beats(): el bucle descarta los latidos cuya ventana se sale de la
        senal, y una etiqueta anadida a posteriori quedaria desplazada.

    Returns
    -------
    beats : list of np.ndarray, each shape (beat_len,) — per-beat z-scored and clipped.
    rr_per_beat : list of float — BACKWARD RR interval in seconds per beat:
        rr[b] = (r_peaks[i] - r_peaks[i-1]) / 360.0, clipped [0.3, 2.0]
    kept_labels : list of str — la etiqueta de cada latido que sobrevivio al bucle.
        Vacia si no se paso `labels`.
    """
    if labels is not None and len(labels) != len(r_peaks):
        raise ValueError(
            "labels y r_peaks deben tener la misma longitud: %d != %d"
            % (len(labels), len(r_peaks))
        )

    if len(r_peaks) < 3:
        return [], [], []

    PRE_R = beat_len * 36 // 100  # 92 samples before R-peak  (36 %)
    POST_R = beat_len - PRE_R  # 164 samples after R-peak  (64 %)

    beats: list[np.ndarray] = []
    rr_per_beat: list[float] = []
    kept_labels: list[str] = []

    for i in range(1, len(r_peaks) - 1):
        r = int(r_peaks[i])
        ini = r - PRE_R
        fin = r + POST_R

        # Skip beats that would fall outside the signal boundaries
        if ini < 0 or fin > len(sig):
            continue

        beat = sig[ini:fin].astype(np.float32)
        if len(beat) != beat_len:
            continue  # safety guard (should not happen)

        # Per-beat z-score + clip to ±5 — matches extraer_latidos_v3
        mu = float(np.mean(beat))
        sd = max(float(np.std(beat)), 1e-6)
        beat = np.clip((beat - mu) / sd, -5.0, 5.0)

        beats.append(beat)

        # BACKWARD RR interval: r_peaks[i-1] → r_peaks[i], clipped to physiological range
        # Matches extraer_latidos_v3: rr = (rpeaks[i] - rpeaks[i-1]) / FS
        rr_sec = float((r_peaks[i] - r_peaks[i - 1]) / 360.0)
        rr_per_beat.append(float(np.clip(rr_sec, 0.3, 2.0)))

        if labels is not None:
            kept_labels.append(labels[i])

    return beats, rr_per_beat, kept_labels


def normalize_beats(beats: list[np.ndarray]) -> tuple[np.ndarray, float, float]:
    """Per-patient/per-recording z-score normalization over the full beat matrix.

    Matches 02b_reentrenar_global.ipynb and NB5B_cross_patient.ipynb:
        mu  = beats.mean()           # scalar over all beats × all timesteps
        std = max(beats.std(), 1e-8)
        beats_n = (beats - mu) / std

    Returns:
        beats_norm: np.ndarray shape (N, beat_len) — normalized beats
        mu: float
        std: float
    """
    if len(beats) == 0:
        return np.empty((0,), dtype=np.float32), 0.0, 1.0

    arr = np.array(beats, dtype=np.float32)  # (N, beat_len)
    mu = float(arr.mean())
    std = float(max(arr.std(), 1e-8))
    beats_norm = ((arr - mu) / std).astype(np.float32)
    return beats_norm, mu, std
