import numpy as np
from scipy import signal


def detect_r_peaks(sig: np.ndarray, fs: int = 360) -> np.ndarray:
    """Pan-Tompkins-style QRS detector.

    Steps:
    1. Remove DC offset
    2. Bandpass 5-15 Hz (QRS energy band)
    3. Square the signal
    4. Moving-window integration
    5. Peak detection with adaptive threshold and 300 ms refractory period
    """
    if len(sig) < 2 * fs:
        return np.array([], dtype=int)

    s = sig.copy().astype(np.float64)
    s -= s.mean()

    low  = 5.0  / (fs / 2.0)
    high = 15.0 / (fs / 2.0)
    b, a = signal.butter(3, [low, high], btype="band")
    filtered = signal.filtfilt(b, a, s)

    squared = filtered ** 2

    window_size = int(0.15 * fs)
    if window_size % 2 == 0:
        window_size += 1
    integrated = np.convolve(squared, np.ones(window_size) / window_size, mode="same")

    # Initial threshold from first second of signal
    noise_level = np.percentile(integrated[:fs], 75)
    threshold   = noise_level * 0.5

    min_distance = int(0.3 * fs)  # 300 ms refractory period
    peaks, _ = signal.find_peaks(integrated, height=threshold, distance=min_distance)

    if len(peaks) == 0:
        return np.array([], dtype=int)

    # Adaptive refinement: raise threshold temporarily if RR suspiciously short
    rr_intervals = np.diff(peaks) if len(peaks) > 1 else np.array([fs])
    median_rr = float(np.median(rr_intervals))

    adaptive_threshold = threshold
    refined_peaks: list[int] = []
    for peak in peaks:
        if integrated[peak] > adaptive_threshold:
            refined_peaks.append(int(peak))
            if len(refined_peaks) > 1:
                current_rr = refined_peaks[-1] - refined_peaks[-2]
                if current_rr < 0.3 * median_rr:
                    adaptive_threshold *= 1.5
                else:
                    adaptive_threshold = threshold

    return np.array(refined_peaks, dtype=int)

