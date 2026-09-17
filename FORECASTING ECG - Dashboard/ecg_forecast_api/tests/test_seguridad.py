"""Pruebas de los hallazgos de seguridad de la auditoría del 12 de septiembre.

Estas pruebas **no importan `app.main`**, y eso es deliberado: `main` arrastra el
cargador de modelos, que importa TensorFlow, que no está en ningún entorno virtual del
disco. Una prueba que solo corre dentro del contenedor es una prueba que no se corre.
Aquí se invocan las funciones de ruta directamente, que es lo que sí se puede ejercitar.

Lo que se comprueba:

  1. Que `patientId` no puede salirse del directorio de datos. Antes de la corrección,
     `data_dir / patientId` con un operando absoluto descartaba la base, y los `..` ni se
     resolvían ni se rechazaban: quedaba un oráculo de existencia de archivos para
     cualquier ruta terminada en `.hea`.
  2. Que las listas de entrada declaran un tamaño máximo. Sin él, FastAPI carga el cuerpo
     entero en memoria antes de validar y basta un POST grande para reiniciar el
     contenedor.
  3. Que un error del cliente sale como 4xx y no como 500, y que el detalle no lleva la
     ruta absoluta del archivo.

Ejecución sin pytest (no está en `.venv_local`):
    python tests/test_seguridad.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import HTTPException  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app.api.routes import patients  # noqa: E402
from app.models import schemas  # noqa: E402


# ── 1 · recorrido de rutas ────────────────────────────────────────────────

#: Entradas que un atacante probaría. Ninguna debe llegar al sistema de archivos.
ENTRADAS_MALICIOSAS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\win.ini",
    "/etc/passwd",
    "C:/Windows/win.ini",
    "100/../../secreto",
    "....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "100\x00.hea",
    "",
    ".",
    "..",
]


def _es_404(exc: BaseException) -> bool:
    return isinstance(exc, HTTPException) and exc.status_code == 404


def test_signal_rechaza_rutas_fuera_del_directorio():
    """Cada entrada maliciosa tiene que dar 404, no leer nada ni reventar."""
    for mala in ENTRADAS_MALICIOSAS:
        try:
            asyncio.run(patients.get_signal(patientId=mala, lead="MLII", segment_60s=False))
        except BaseException as e:  # noqa: BLE001 - se inspecciona a continuación
            assert _es_404(e), f"{mala!r} devolvió {e!r} en vez de 404"
            # Y el mensaje no debe confirmar nada del sistema de archivos.
            assert "passwd" not in str(getattr(e, "detail", "")).lower(), (
                f"{mala!r}: el detalle repite la ruta pedida"
            )
        else:
            raise AssertionError(f"{mala!r} NO fue rechazada: devolvió datos")


def test_process_patient_rechaza_rutas_fuera_del_directorio():
    for mala in ENTRADAS_MALICIOSAS:
        try:
            asyncio.run(
                patients.process_patient(
                    patientId=mala, lead="MLII", filter_type="F_NB6", normalize_global=False
                )
            )
        except BaseException as e:  # noqa: BLE001
            assert _es_404(e), f"{mala!r} devolvió {e!r} en vez de 404"
        else:
            raise AssertionError(f"{mala!r} NO fue rechazada: devolvió datos")


def test_un_paciente_valido_sigue_pasando():
    """La corrección no puede cerrarle la puerta a los pacientes de verdad.

    No se comprueba que devuelva señal —los registros pueden no estar montados— sino
    que NO se rechaza con 404 por la validación. Si el archivo falta, el error será
    otro, y eso también nos vale.
    """
    for bueno in ("100", "I01", "234", "I75"):
        try:
            asyncio.run(patients.get_signal(patientId=bueno, lead="MLII", segment_60s=False))
        except HTTPException as e:
            assert e.status_code != 404 or "not found in" in str(e.detail), (
                f"{bueno} fue rechazado por la validación: {e.detail}"
            )
        except Exception:
            pass  # los datos pueden no estar montados; no es lo que se prueba aquí


# ── 2 · limite de tamano de las entradas ──────────────────────────────────

def test_las_listas_declaran_tamano_maximo():
    """Un cuerpo desmesurado tiene que rechazarse en la validación, no en la RAM."""
    campos = [
        (schemas.ProcessSignalRequest, "signal"),
        (schemas.ProcessSignalRequest, "r_peaks_hint"),
        (schemas.PredictLOPORequest, "beats"),
        (schemas.PredictLOPORequest, "rr_per_beat"),
    ]
    for modelo, campo in campos:
        info = modelo.model_fields.get(campo)
        assert info is not None, f"{modelo.__name__}.{campo} no existe"
        tiene_tope = any(
            getattr(m, "max_length", None) is not None for m in (info.metadata or [])
        )
        assert tiene_tope, f"{modelo.__name__}.{campo} no declara max_length"


def test_una_senal_desmesurada_se_rechaza():
    enorme = [0.0] * 3_000_001
    try:
        schemas.ProcessSignalRequest(signal=enorme, fs=360)
    except ValidationError:
        return
    raise AssertionError("una señal de 3 millones de muestras fue aceptada")


def test_una_senal_normal_se_acepta():
    """El tope no puede estorbar al uso real: media hora a 360 Hz son 648 000 muestras."""
    schemas.ProcessSignalRequest(signal=[0.0] * 648_000, fs=360)


# ── 3 · errores del cliente ───────────────────────────────────────────────

def test_filtro_desconocido_es_error_del_cliente():
    """Un `filter_type` inventado es culpa de quien llama: 4xx, no 500."""
    from app.api.routes import process

    peticion = schemas.ProcessSignalRequest(
        signal=[0.0, 1.0] * 600, fs=360, filter_type="F_INVENTADO"
    )
    try:
        asyncio.run(process.process_signal(peticion))
    except HTTPException as e:
        assert 400 <= e.status_code < 500, f"devolvió {e.status_code}, esperaba 4xx"
        assert ":\\" not in str(e.detail) and "/app/" not in str(e.detail), (
            f"el detalle filtra una ruta interna: {e.detail}"
        )
    else:
        raise AssertionError("un filtro inventado no dio error")


# ── ejecución sin pytest ──────────────────────────────────────────────────

if __name__ == "__main__":
    pruebas = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    fallos = 0
    for p in pruebas:
        try:
            p()
        except AssertionError as e:
            fallos += 1
            print(f"  FALLA  {p.__name__}\n         {e}")
        except Exception as e:  # noqa: BLE001
            fallos += 1
            print(f"  ERROR  {p.__name__}: {type(e).__name__}: {e}")
        else:
            print(f"  OK     {p.__name__}")
    print(f"\n{len(pruebas) - fallos} de {len(pruebas)} pruebas correctas")
    sys.exit(1 if fallos else 0)
