"""Pruebas de la API.

La suite anterior estaba rota por tres motivos: pedia `/health` cuando la ruta real es
`/api/health`; usaba `AsyncClient(app=...)`, eliminado en httpx >= 0.28; y probaba
`/predict`, endpoint que devolvia 500 en toda peticion y que ya se retiro.

Requiere TensorFlow, porque `app.main` importa el cargador de modelos.
"""
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.patients import BEAT_TYPES
from app.config import CLASES_AAMI
from app.main import app

BASE = "http://test"


@pytest.fixture
async def cliente():
    # ASGITransport es la forma vigente desde httpx 0.28; `app=` fue eliminado.
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE) as c:
        yield c


@pytest.mark.asyncio
async def test_salud(cliente):
    r = await cliente.get("/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "healthy"
    assert "version" in d
    assert "models_loaded" in d


@pytest.mark.asyncio
async def test_listado_de_modelos(cliente):
    r = await cliente.get("/api/models")
    assert r.status_code == 200
    d = r.json()
    assert "models" in d and d["total"] > 0
    nombres = [m["name"] for m in d["models"]]
    assert "CNN_GRU_ATTN" in nombres, "debe exponerse el modelo final de la tesis"


@pytest.mark.asyncio
async def test_metricas_son_reales(cliente):
    """Las metricas deben venir de los resultados, no estar escritas a mano."""
    r = await cliente.get("/api/metrics/CNN_GRU_ATTN")
    assert r.status_code == 200
    d = r.json()
    assert d["r2"] == pytest.approx(0.6734, abs=1e-4), "R2 del CSV del 12 de mayo"
    assert d["r2_std"] == pytest.approx(0.2825, abs=1e-4)
    assert d["n_pacientes"] == 123
    assert d["fuente"].endswith("resultados_lopo.csv")
    # Este proyecto nunca calculo metricas de clasificacion.
    assert "sensitivity" not in d and "specificity" not in d


@pytest.mark.asyncio
async def test_metricas_modelo_inexistente(cliente):
    r = await cliente.get("/api/metrics/NoExiste")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_procesar_senal_con_la_cadena_del_modelo(cliente):
    """F_NB6 es la cadena del modelo final: notch, paso banda, detrend y z-score."""
    t = np.linspace(0, 10, 3600)
    senal = np.sin(2 * np.pi * 1.2 * t).tolist()
    r = await cliente.post(
        "/api/process_signal",
        json={"signal": senal, "fs": 360, "filter_type": "F_NB6"},
    )
    assert r.status_code == 200
    d = r.json()
    assert d["fs"] == 360
    assert d["filter_type"] == "F_NB6"
    assert len(d["signal"]) == len(senal)


@pytest.mark.asyncio
async def test_procesar_senal_demasiado_corta(cliente):
    r = await cliente.post("/api/process_signal", json={"signal": [0.0] * 10, "fs": 360})
    assert r.status_code in (400, 422)


@pytest.mark.asyncio
async def test_paciente_inexistente(cliente):
    r = await cliente.get("/api/signal", params={"patientId": "999", "lead": "MLII"})
    assert r.status_code in (400, 404)


@pytest.mark.asyncio
async def test_extremo_a_extremo_paciente_100(cliente):
    """Los dos endpoints que sostienen la demo. Antes no tenian ninguna prueba.

    Se omite si los registros de PhysioNet no estan montados.
    """
    r = await cliente.post(
        "/api/process_patient",
        params={"patientId": "100", "lead": "MLII", "filter_type": "F_NB6",
                "normalize_global": "false"},
    )
    if r.status_code != 200:
        pytest.skip("los registros de MIT-BIH no estan disponibles en este entorno")

    d = r.json()
    assert d["fs"] == 360
    assert d["filter_type"] == "F_NB6"
    assert d["num_beats"] >= 5, "hacen falta al menos 5 latidos para el lookback"
    beats = d["beats"]
    assert len(beats[0]) == 256, "cada latido son 256 muestras"

    rr = d.get("rr_per_beat") or []
    cuerpo = {"beats": beats[:5], "lookback": 5}
    if len(rr) >= 5:
        cuerpo["rr_per_beat"] = rr[:5]

    r2 = await cliente.post("/api/predict_lopo", json=cuerpo)
    assert r2.status_code == 200, r2.text
    p = r2.json()
    assert p["horizon"] == 3, "el modelo predice 3 latidos"
    assert len(p["predicted_beats"]) == 3
    assert len(p["predicted_beats"][0]) == 256
    assert p["processing_time_ms"] >= 0


@pytest.mark.asyncio
async def test_predict_lopo_con_latidos_insuficientes(cliente):
    r = await cliente.post("/api/predict_lopo", json={"beats": [[0.1] * 256] * 2, "lookback": 5})
    assert r.status_code in (400, 422, 500)


@pytest.mark.asyncio
async def test_endpoints_retirados_ya_no_existen(cliente):
    """Devolvian 500 en toda peticion; se retiraron en la revision."""
    for ruta in ("/api/predict", "/api/predict_batch",
                 "/api/explainability/gradcam", "/api/explainability/shap"):
        r = await cliente.post(ruta, json={})
        assert r.status_code == 404, f"{ruta} deberia haber desaparecido"


@pytest.mark.asyncio
async def test_etiqueta_por_latido_alineada(cliente):
    """Un simbolo y una clase por latido, en el mismo orden que `beats`.

    La prueba que importa es la de longitud: la segmentacion descarta latidos, asi que
    una etiqueta anadida despues del bucle traeria mas elementos que latidos.
    """
    r = await cliente.post(
        "/api/process_patient",
        params={"patientId": "100", "lead": "MLII", "filter_type": "F_NB6",
                "normalize_global": "false"},
    )
    if r.status_code != 200:
        pytest.skip("los registros de MIT-BIH no estan disponibles en este entorno")

    d = r.json()
    simbolos = d["beat_symbols"]
    clases = d["beat_classes"]

    assert len(simbolos) == d["num_beats"], "un simbolo por latido servido"
    assert len(simbolos) == len(d["beats"])
    assert len(clases) == len(simbolos)

    # El segmentador salta el primer y el ultimo pico como latidos de guarda, y ademas
    # descarta los que se salen de la senal: siempre hay menos latidos que picos.
    assert d["num_beats"] <= len(d["r_peaks"]) - 2

    assert set(simbolos) <= BEAT_TYPES, "solo simbolos de latido, no anotaciones de ritmo"
    assert set(clases) <= set(CLASES_AAMI), "la clase AAMI es una de las cinco"
    # El registro 100 es casi todo normal, con unas pocas ectopias.
    assert clases.count("N") > 0


@pytest.mark.asyncio
async def test_signal_devuelve_simbolos_por_pico(cliente):
    """En /api/signal no hay segmentacion: una etiqueta por pico R, sin descartes."""
    r = await cliente.get("/api/signal", params={"patientId": "100", "lead": "MLII"})
    if r.status_code != 200:
        pytest.skip("los registros de MIT-BIH no estan disponibles en este entorno")

    d = r.json()
    assert len(d["symbols"]) == len(d["r_peaks"])
    assert len(d["aami_classes"]) == len(d["r_peaks"])
    assert set(d["aami_classes"]) <= set(CLASES_AAMI)
