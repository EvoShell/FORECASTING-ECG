# Por qué esta carpeta existe

Aquí vive la configuración del Space de Hugging Face, que **no es la misma que la
del proyecto** aunque lo parezca. Tenerla versionada aquí sirve para dos cosas:
que no viva solo en Hugging Face sin respaldo, y que el flujo de sincronización
tenga de dónde copiarla.

## El detalle que costó una caída

El `requirements.txt` de esta carpeta **no declara `wfdb` ni `h5py`**, y eso es
deliberado. El `Dockerfile` los resuelve en tres pasos:

```
pip install -r requirements.txt                    → numpy queda en 1.24.3
pip install wfdb==4.3.1 soundfile matplotlib       → wfdb sube numpy
pip install --force-reinstall numpy==1.24.3 ...    → numpy vuelve a bajar
```

Ese rodeo existe porque **el modelo se guardó con numpy 1.24.3 y `wfdb` exige
1.26.4**. Son incompatibles, y en una sola resolución pip no puede satisfacer
ambas: aborta con `ResolutionImpossible`.

El 17 de septiembre de 2026 se copió aquí el `requirements.txt` del proyecto, que
sí declara `wfdb`, y la construcción falló dejando el servicio caído con un 503.
El mensaje de pip fue exactamente este:

```
The user requested numpy==1.24.3
wfdb 4.3.1 depends on numpy>=1.26.4
ERROR: ResolutionImpossible
```

**No sustituyas este archivo por el del proyecto.** El del proyecto sirve para la
composición local, donde no hay esa restricción; este es el que funciona aquí.

## Qué sincroniza el flujo, y qué no

| Se copia desde el proyecto | Se conserva en el Space |
| :---- | :---- |
| `app/` | `datos_linux.zip`, 638 MB de señales |
| `Dockerfile`, `README.md` y `requirements.txt` **de esta carpeta** | `results/`, con los modelos |

Los dos de la derecha no están en el repositorio de GitHub —el `.gitignore`
excluye `datos/`, `*.zip`, `*.keras` y `results/`— así que el flujo no podría
reponerlos si los borrara. Por eso aborta si no los encuentra.
