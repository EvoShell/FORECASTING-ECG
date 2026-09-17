import numpy as np
from scipy import signal


def resample_to_360(sig: np.ndarray, fs_orig: int) -> np.ndarray:
    if fs_orig == 360:
        return sig

    target_len = int(len(sig) * 360 / fs_orig)
    resampled = signal.resample(sig, target_len)
    return resampled


def preprocess_signal(
    sig: np.ndarray,
    fs: int,
    filter_type: str,
    detect_peaks: bool = True,
    r_peaks_hint: list[int] | None = None,
    normalize_global: bool = True,
    use_fixed_window: bool = False,
    beat_labels: list[str] | None = None,
) -> dict:
    """
    normalize_global=True  → NB4B global stats from norm_{filter}.json (use for NB4B models).
    normalize_global=False → per-beat instance normalization (use for NB5B/NB6 LOPO models,
                             which were trained with extraer_latidos_v2/v3 where each beat
                             is individually z-scored to mean=0, std=1).

    use_fixed_window=True  → Fixed-window (PRE_R=92, POST_R=164) segmentation matching
                             NB6 (CNN_GRU_ATTN) training pipeline (extraer_latidos_v3).
                             Auto-enabled when filter_type contains 'NB6'.
    use_fixed_window=False → Midpoint-to-midpoint + FFT resample (NB4B / NB5B pipeline).

    beat_labels → una etiqueta por pico de `r_peaks_hint`, en el mismo orden (el simbolo
                  de la anotacion del cardiologo, por ejemplo). Se entrega al segmentador
                  para que la filtre junto con los latidos, y vuelve en
                  result["beat_symbols"] alineada uno a uno con result["beats"].
                  Solo se propaga si los picos anotados son los que se usaron: si se cae
                  a la deteccion algoritmica, las etiquetas no corresponden a nada y se
                  descartan.
    """
    from app.config import BEAT_LEN, FS, NB4B_NORM
    from app.core.filtering import apply_filter
    from app.core.rpeak_detection import detect_r_peaks
    from app.core.segmentation import segment_beats, segment_beats_fixed_window

    # ── NB6 pipeline detection ─────────────────────────────────────────────────
    # filter_type='F_NB6' triggers the NB6 pipeline:
    #   - apply_filter_nb6() inside apply_filter() when 'NB6' is in filter_type
    #   - Fixed-window beat segmentation (extraer_latidos_v3, no resample)
    #   - Per-beat z-score normalization (instance norm)
    #   - BACKWARD RR interval
    #   - NO median filter
    # NB4B paths use 'F_N+PB+MED' / 'F_N+MED' / 'F_MED' with median and midpoint+resample.
    _use_fixed_window = use_fixed_window or "NB6" in filter_type.upper()

    if _use_fixed_window:
        # NB6: resample to 360 Hz BEFORE filtering (matches notebook: cargar_incart resamples first)
        if fs != FS:
            sig = resample_to_360(sig, fs)
            if r_peaks_hint:
                r_peaks_hint = [int(rp * FS / fs) for rp in r_peaks_hint]
            fs = FS
        sig_filtered = apply_filter(sig, FS, filter_type)
    else:
        # NB4B: resample to 360 if needed, then apply median-based filter
        if fs != FS:
            sig = resample_to_360(sig, fs)
            fs = FS
        sig_filtered = apply_filter(sig, fs, filter_type)

    result = {
        "signal": sig_filtered.tolist(),
        "fs": fs,
        "filter_type": filter_type,
    }

    if detect_peaks:
        # Prefer pre-annotated peaks (from wfdb .atr) over algorithmic detection.
        # Training used annotated peaks — using them here matches the training distribution.
        etiquetas: list[str] | None = None
        if r_peaks_hint and len(r_peaks_hint) > 3:
            r_peaks = np.array(r_peaks_hint, dtype=int)
            # Las etiquetas describen los picos anotados; solo valen si son esos los
            # que se segmentan. El remuestreo a 360 Hz reescala los picos pero no
            # cambia su numero ni su orden, asi que la correspondencia se mantiene.
            if beat_labels is not None and len(beat_labels) == len(r_peaks):
                etiquetas = list(beat_labels)
        else:
            r_peaks = detect_r_peaks(sig_filtered, fs)
        if _use_fixed_window:
            # NB6 (CNN_GRU_ATTN) pipeline: fixed centered window, per-beat z-score + clip
            raw_beats, rr_per_beat_sec, etiquetas_latido = segment_beats_fixed_window(
                sig_filtered, r_peaks, BEAT_LEN, etiquetas
            )
        else:
            # NB4B / NB5B pipeline: midpoint-to-midpoint + FFT resample
            raw_beats, rr_per_beat_sec, etiquetas_latido = segment_beats(
                sig_filtered, r_peaks, BEAT_LEN, etiquetas
            )
        rr_intervals = np.diff(r_peaks).tolist() if len(r_peaks) > 1 else []

        if len(raw_beats) > 0:
            beats_arr = np.array(raw_beats, dtype=np.float32)

            if normalize_global:
                # NB4B global normalization: mu/std from norm_{filter}.json
                norm = NB4B_NORM.get(filter_type, NB4B_NORM["F_N+PB+MED"])
                beat_mu = norm["mu"]
                beat_std = norm["std"]
                beats_norm = ((beats_arr - beat_mu) / beat_std).tolist()
            elif _use_fixed_window:
                # NB6 fixed-window: beats already z-scored + clipped in
                # segment_beats_fixed_window() -- no double normalization.
                beat_mu = 0.0
                beat_std = 1.0
                beats_norm = beats_arr.tolist()
            else:
                # NB5B per-beat Instance Normalization (midpoint + resample pipeline)
                beat_mu = float(beats_arr.mean())
                beat_std = float(max(beats_arr.std(), 1e-8))
                per_mu = beats_arr.mean(axis=1, keepdims=True)
                per_std = np.maximum(beats_arr.std(axis=1, keepdims=True), 1e-8)
                beats_norm = ((beats_arr - per_mu) / per_std).tolist()
                result["per_beat_mu"] = per_mu.squeeze(1).tolist()
                result["per_beat_std"] = per_std.squeeze(1).tolist()
        else:
            beats_norm = []
            beat_mu = 0.0
            beat_std = 1.0

        result["r_peaks"] = r_peaks.tolist()
        result["beats"] = beats_norm
        result["rr_intervals"] = rr_intervals
        result["num_beats"] = len(raw_beats)
        result["beat_mu"] = beat_mu
        result["beat_std"] = beat_std
        result["rr_per_beat"] = (
            rr_per_beat_sec  # raw RR in seconds — needed by NB5B LOPO (feat_dim=257)
        )
        if etiquetas is not None:
            # Una etiqueta por latido servido, ya filtrada por el segmentador.
            result["beat_symbols"] = etiquetas_latido

    return result
