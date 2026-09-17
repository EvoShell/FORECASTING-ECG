"""Pruebas de la alineacion entre latidos y etiquetas.

Van aparte de test_api.py a proposito: aqui no se importa `app.main`, de modo que estas
pruebas corren sin TensorFlow. Son las unicas que se pueden ejecutar fuera del
contenedor, y cubren justo el punto donde la alineacion se pierde con mas facilidad.
"""
import numpy as np
import pytest

from app.core.segmentation import segment_beats, segment_beats_fixed_window

BEAT_LEN = 256
PRE_R = BEAT_LEN * 36 // 100  # 92


def _senal(n: int = 2000) -> np.ndarray:
    t = np.linspace(0, 6, n)
    return np.sin(2 * np.pi * 1.2 * t).astype(np.float32)


def test_ventana_fija_descarta_latido_y_etiqueta_a_la_vez():
    """Con dos latidos fuera de la senal, sobran tres, y sus tres etiquetas."""
    sig = _senal(2000)
    #             guarda  fuera por la izq.  validos        fuera por la der.  guarda
    picos = np.array([10,    60,             600, 900, 1200,  1960,            1990])
    etiquetas = ["a", "b", "c", "d", "e", "f", "g"]

    beats, rr, kept = segment_beats_fixed_window(sig, picos, BEAT_LEN, etiquetas)

    assert 60 - PRE_R < 0 and 1960 + (BEAT_LEN - PRE_R) > len(sig), "el caso debe descartar"
    assert len(beats) == 3
    assert kept == ["c", "d", "e"], "la etiqueta que queda es la del latido que queda"
    assert len(kept) == len(beats) == len(rr)


def test_sin_etiquetas_no_se_inventa_ninguna():
    sig = _senal(2000)
    picos = np.array([300, 600, 900, 1200])
    beats, rr, kept = segment_beats_fixed_window(sig, picos, BEAT_LEN)
    assert len(beats) == 2 and kept == []


def test_longitudes_distintas_revientan():
    """Un desajuste silencioso produciria etiquetas creibles pero corridas."""
    sig = _senal(2000)
    picos = np.array([300, 600, 900, 1200])
    with pytest.raises(ValueError):
        segment_beats_fixed_window(sig, picos, BEAT_LEN, ["a", "b"])


def test_punto_medio_tambien_conserva_la_alineacion():
    """La otra segmentacion (NB4B/NB5B) descarta por ventana corta, no por borde."""
    sig = _senal(2000)
    # El latido de 430 queda entre los puntos medios 415 y 445: 30 muestras, por debajo
    # del minimo de 50 que exige el segmentador.
    picos = np.array([100, 400, 430, 460, 1400])
    etiquetas = ["a", "b", "c", "d", "e"]

    beats, rr, kept = segment_beats(sig, picos, BEAT_LEN, etiquetas)

    assert len(kept) == len(beats) == len(rr)
    assert kept == ["b", "d"], "el latido de ventana corta se descarta con su etiqueta"
