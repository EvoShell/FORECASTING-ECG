import numpy as np


def reconstruct_signal(
    beats: list[np.ndarray],
    rr_intervals: list[float],
    t_start: float = 0.0,
    fs: int = 360
) -> np.ndarray:
    if not beats:
        return np.array([])

    reconstructed = []

    for i, beat in enumerate(beats):
        reconstructed.append(beat)

    return np.concatenate(reconstructed) if reconstructed else np.array([])
