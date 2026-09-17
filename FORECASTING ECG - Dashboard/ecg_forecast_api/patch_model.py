"""Reescribe CNN_GRU_ATTN_final.keras para que Keras 2.15 pueda leerlo.

El modelo se entreno con Keras 3, que guarda los modulos como `keras.src.*` y omite
`output_shape` en las capas Lambda. La imagen de la API lleva Keras 2.15, que no
entiende ni una cosa ni la otra. Este script copia el .keras cambiando solo esas dos
cosas en config.json; los pesos pasan intactos.

DONDE ESCRIBE, Y POR QUE IMPORTA
--------------------------------
Hay dos copias de `results/NB5/modelos/` en el disco:

  A)  <raiz del proyecto>/results/NB5/modelos/          <- salida de los cuadernos
  B)  FORECASTING ECG - Dashboard/results/NB5/modelos/  <- la que se despliega

La API solo lee la B, por dos caminos que coinciden en ella:

  * En Docker, el contexto de construccion es la carpeta del dashboard
    (`context: ..` en docker-compose.yml), de modo que el `COPY results/NB5/modelos/`
    del Dockerfile toma la B y la deja en /app/results/NB5/modelos.
  * En local, `_find_model_path()` de app/core/model_loader.py sube cuatro niveles
    desde el propio archivo hasta la carpeta del dashboard y busca alli
    `results/NB5/modelos/`, que es de nuevo la B.

La version anterior de este script escribia en la A con una ruta absoluta fija, asi
que el archivo que parcheaba no era el que la API cargaba: las dos copias llegaron a
diferir en cerca de 4 KB. Ahora la ruta se deriva de la posicion de este archivo, y
manda la B salvo que MODEL_DIR diga otra cosa (esa variable es el primer candidato que
`_find_model_path()` prueba, asi que si esta puesta, gana).
"""
import json
import os
import zipfile
from pathlib import Path

ARCHIVO = "CNN_GRU_ATTN_final.keras"
ARCHIVO_PARCHEADO = "CNN_GRU_ATTN_final_patched.keras"

# .../ecg_forecast_api/patch_model.py -> .../FORECASTING ECG - Dashboard
RAIZ_DASHBOARD = Path(__file__).resolve().parent.parent
DIR_MODELOS = Path(os.getenv("MODEL_DIR") or RAIZ_DASHBOARD / "results" / "NB5" / "modelos")

src = DIR_MODELOS / ARCHIVO
dst = DIR_MODELOS / ARCHIVO_PARCHEADO

if not src.exists():
    raise SystemExit(
        "No esta el modelo sin parchear en %s.\n"
        "Copialo alli desde la salida de los cuadernos, o pon MODEL_DIR." % src
    )

with zipfile.ZipFile(str(src), "r") as z_in:
    config_raw = z_in.read("config.json").decode("utf-8")

    # Rutas de modulo de Keras 3 -> nombres que Keras 2.15 resuelve
    config_patched = config_raw.replace("keras.src.models.functional", "keras.models")
    config_patched = config_patched.replace("keras.src.layers", "keras.layers")
    config_patched = config_patched.replace("keras.src.initializers", "keras.initializers")
    config_patched = config_patched.replace("keras.src.regularizers", "keras.regularizers")
    config_patched = config_patched.replace("keras.src.constraints", "keras.constraints")
    config_patched = config_patched.replace("keras.src.optimizers", "keras.optimizers")
    config_patched = config_patched.replace("keras.src.dtype_policies", "keras.dtype_policies")

    # La capa Lambda es `t[:, -1, :256]`; sin output_shape, Keras 2.15 no infiere la forma.
    config_patched = config_patched.replace(
        '"arguments": {}}',
        '"arguments": {}, "output_shape": [256]}',
    )

    with zipfile.ZipFile(str(dst), "w", zipfile.ZIP_DEFLATED) as z_out:
        for item in z_in.namelist():
            if item == "config.json":
                z_out.writestr(item, config_patched)
            else:
                z_out.writestr(item, z_in.read(item))

cfg = json.loads(config_patched)
print("Modelo parcheado: %s (%d bytes)" % (dst, dst.stat().st_size))
print("Modulo raiz: %s" % cfg.get("module"))
print("Contenido: %s" % zipfile.ZipFile(str(dst)).namelist())

# La copia de los cuadernos no se despliega. Si esta y difiere, conviene saberlo antes
# de perseguir una diferencia de comportamiento entre local y produccion.
otra = RAIZ_DASHBOARD.parent / "results" / "NB5" / "modelos" / ARCHIVO_PARCHEADO
if otra.exists() and otra.resolve() != dst.resolve() and otra.stat().st_size != dst.stat().st_size:
    print(
        "\nAviso: %s existe y pesa distinto (%d bytes). Esa copia NO se despliega."
        % (otra, otra.stat().st_size)
    )
