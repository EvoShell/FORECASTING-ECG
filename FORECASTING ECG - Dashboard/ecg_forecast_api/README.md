# API de predicción de ECG

Servicio FastAPI que sostiene el panel de la tesis. Hace dos cosas: preprocesa un
registro de PhysioNet igual que lo hizo el entrenamiento, y le pide al modelo final los
tres latidos siguientes a una ventana de cinco.

**Alcance.** El sistema predice la morfología de la señal futura; no clasifica el evento
arrítmico. No hay clasificador AAMI ni métricas de clasificación, y los campos de
etiqueta que devuelve `/api/process_patient` son la anotación del cardiólogo que marcó el
registro, no una salida del modelo.

## Puesta en marcha

La vía soportada es Docker, porque la imagen fija las versiones con las que el modelo
carga (TensorFlow 2.15 / Keras 2.15):

```bash
cd "FORECASTING ECG - Dashboard/ecg_forecast_api"
docker compose up --build        # api en :8000, frontend en :80
docker compose up api --build -d # solo el backend
```

Sin Docker hace falta un entorno con las dependencias de `requirements.txt`, TensorFlow
incluido:

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Documentación interactiva en `http://localhost:8000/docs`.

## Rutas

Son nueve, todas bajo el prefijo `/api`:

| Ruta | Qué hace |
| :---- | :---- |
| `GET /api/health` | Estado del servicio y número de modelos disponibles |
| `GET /api/models` | El registro de modelos: hoy tiene una entrada |
| `GET /api/metrics` | Métricas publicadas de todos los modelos, con su archivo de origen |
| `GET /api/metrics/{model}` | Lo mismo para un modelo concreto |
| `GET /api/patients` | Los 123 identificadores disponibles (48 de MIT-BIH, 75 de INCART) |
| `GET /api/signal` | Señal cruda del registro, picos R anotados, símbolo y clase AAMI por pico |
| `POST /api/process_signal` | Preprocesa una señal que envía el cliente |
| `POST /api/process_patient` | Carga el registro del disco y lo preprocesa en una sola llamada |
| `POST /api/predict_lopo` | Predicción de los tres latidos siguientes |

`/api/predict` y `/api/predict_batch` se retiraron: construían un nombre de modelo que no
existe en el registro y devolvían 500 en toda petición.

### Etiqueta por latido

`/api/process_patient` devuelve `beat_symbols` y `beat_classes`, uno por cada elemento de
`beats` y en el mismo orden. `beat_symbols` es el símbolo de PhysioNet (`N`, `V`, `A`…) y
`beat_classes` su clase AAMI, una de `N`, `SVEB`, `VEB`, `F` o `Q`, con la misma
correspondencia que usa el cuaderno 08 (`B` no tiene clase en la norma y cae en `Q`).

La alineación se hace dentro de la segmentación, no después: el segmentador descarta los
latidos cuya ventana se sale de la señal, y una etiqueta pegada a posteriori quedaría
desplazada a partir del primer descarte. Los dos campos son opcionales y valen `null`
cuando no hay anotación de donde sacarlos, que es el caso de `/api/process_signal`.

## El modelo

Uno solo, el de la sexta fase:

- Arquitectura `CNN_GRU_ATTN`: Conv1D ×3, GRU ×2, atención temporal y una conexión
  aditiva desde el último latido de entrada.
- Cadena de filtrado `F_NB6`: notch de 60 Hz, pasa banda Butterworth de 0.5–40 Hz,
  detrend lineal y z-score global. **Sin filtro de mediana**, que es lo que la distingue
  de las cadenas `F_*+MED` de la cuarta fase.
- Segmentación de ventana fija centrada en el pico R: 92 muestras antes y 164 después,
  sin remuestrear, con z-score por latido recortado a ±5.
- Entrada `(5, 257)`: cinco latidos de 256 muestras más su intervalo RR normalizado.
  Salida `(3, 256)`: los tres latidos siguientes.
- Archivo `CNN_GRU_ATTN_final_patched.keras`, 4.3 MB.
- R² medio 0.6734 (desviación 0.2825) sobre los 123 pliegues de
  `results/NB5/resultados_lopo.csv`. Esa cifra es del protocolo LOPO —un modelo por
  paciente, entrenado sin él—; el que sirve esta API está entrenado con los 123 y no es
  comparable con ella.

## Configuración

- `MODEL_DIR`: carpeta del archivo del modelo. En Docker vale
  `/app/results/NB5/modelos`; si no está puesta, `_find_model_path()` de
  `app/core/model_loader.py` prueba una lista de rutas conocidas.
- `MITBIH_DIR` y `INCART_DIR`: carpetas de los registros. Si no están puestas,
  `_find_data_dir()` prueba `/app/<base>` y luego sube por los directorios padre
  buscando `datos/<base>`.
- Frecuencia de muestreo 360 Hz; los registros de INCART se remuestrean al cargarlos.
- Longitud de latido 256 muestras.

## Utilidades y pruebas

`patch_model.py` reescribe el `.keras` de Keras 3 a un formato que Keras 2.15 lee. Hay
que ejecutarlo una vez por cada modelo nuevo, antes de construir la imagen; el propio
script explica en qué carpeta escribe y por qué hay dos.

```bash
pytest            # tests/test_api.py
```

Las pruebas importan `app.main`, que carga TensorFlow: solo corren en un entorno que lo
tenga, es decir, dentro del contenedor. Las que necesitan los registros de PhysioNet se
saltan solas si no están montados.
