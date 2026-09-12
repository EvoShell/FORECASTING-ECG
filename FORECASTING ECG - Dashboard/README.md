# Predicción de Arritmias Cardíacas mediante Señales ECG

**Forecasting de señales de electrocardiograma (ECG) utilizando modelos tradicionales de Machine Learning y Deep Learning**

> Universidad CESMAG · Ingeniería de Sistemas · 2025–2026  
> **Autores:** Darwin David Burbano Guerrero & Darío Esteban Gómez Ordóñez  
> **Director:** Mg. Héctor Andrés Mora Paz

---

## Descripción

Este proyecto investiga la **predicción (forecasting) de señales ECG** para la detección anticipada de arritmias cardíacas, utilizando la base de datos [MIT-BIH Arrhythmia Database](https://physionet.org/content/mitdb/1.0.0/) de PhysioNet (48 pacientes, 2 canales, FS = 360 Hz).

Se implementan dos familias de modelos:

| Notebook | Modelos | Descripción |
|----------|---------|-------------|
| **01_tradicionales** | LinReg, DT, RF, SVR, MLP, ARIMA + Persistencia | Machine Learning clásico |
| **02_deep_learning** | LSTM, GRU, CNN-LSTM, CNN-GRU + Persistencia | Redes neuronales recurrentes |

Cada notebook ejecuta **dos experimentos**:

| Experimento | Formulación | Entrada | Salida |
|-------------|-------------|---------|--------|
| **Exp A** — Multi-step Directo | Seq-to-Seq temporal | L = 5 s (1800 muestras) | H = 1, 3, 5 s de predicción simultánea |
| **Exp B** — Latidos | One-beat-ahead | N latidos anteriores (3, 5, 10) | Siguiente latido completo (256 muestras) |

Los 48 pacientes se procesan con **7 pipelines de preprocesamiento** (combinaciones de filtros pasabanda, notch y medianas), generando miles de evaluaciones para análisis comparativo robusto.

---

## Estructura del Repositorio

```
ecg-forecasting/
├── README.md                         # Este archivo
├── .gitignore
├── requirements.txt
│
├── notebooks/
│   ├── 01_tradicionales.ipynb        # Modelos ML tradicionales
│   └── 02_deep_learning.ipynb        # Modelos Deep Learning
│
├── data/                             # Datos MIT-BIH (no incluidos)
│   └── mit-bih/                      # .dat, .atr, .hea
│
├── results/                          # Resultados del experimento
│   ├── NB1/                          # CSVs, PNGs, checkpoints
│   │   └── models/                   # .joblib (gitignored)
│   └── NB2/                          # CSVs, PNGs, configs
│       └── models/                   # .keras (gitignored)
│
├── docs/                             # Documentación
│   ├── logo_color_unicesmag.png
│   ├── cronograma.csv
│   ├── tesis.pdf
│   └── README_experimento.md
│
└── legacy/                           # Versiones anteriores (referencia)
    └── experimentos/
```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/ecg-forecasting.git
cd ecg-forecasting
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Descargar datos MIT-BIH

Los datos no se incluyen en el repositorio. Descárgalos desde [PhysioNet](https://physionet.org/content/mitdb/1.0.0/):

```bash
mkdir -p data/mit-bih
python -c "import wfdb; wfdb.dl_database('mitdb', 'data/mit-bih')"
```

---

## Ejecución

### En Google Colab (recomendado)

1. Subir la carpeta completa a **Google Drive** como `MyDrive/FORECASTING-ECG/`
2. Abrir el notebook deseado desde `notebooks/`
3. La celda de configuración monta Drive y detecta las rutas automáticamente

### En local (VS Code / Jupyter)

1. Abrir el proyecto desde la carpeta raíz
2. Ejecutar las celdas normalmente — las rutas se detectan automáticamente

> **Nota:** Los notebooks detectan automáticamente si están en Colab o en local, resolviendo la raíz del proyecto buscando la carpeta `data/`.

---

## Métricas de Evaluación

| Métrica | Descripción |
|---------|-------------|
| **R²** | Coeficiente de determinación (test y train) |
| **MSE** | Error cuadrático medio |
| **RMSE** | Raíz del MSE |
| **MAE** | Error absoluto medio |
| **DTW** | Dynamic Time Warping (similitud morfológica) |
| **Latencia** | Tiempo de predicción por muestra (ms) |

---

## Correcciones del Director

| # | Corrección | Estado |
|---|-----------|--------|
| 1 | Reportar R² train **y** test por separado | Completado |
| 2 | Tablas con media ± desviación estándar | Completado |
| 3 | Baseline Persistencia como referencia | Completado |
| 4 | Gráficas de bigotes (boxplots) | Completado |
| 5 | Exp A + Exp B (temporal + latidos) | Completado |
| 6 | Visualización predicción vs real | Completado |
| 7 | 48 pacientes MIT-BIH | Completado |
| 8 | Formulación multi-step directo Seq-to-Seq | Completado |
| 9 | Guardado selectivo de modelos | Completado |
| 10 | MLP Regressor agregado | Completado |

---

## Licencia

Proyecto académico — Universidad CESMAG, 2025–2026.  
Los datos MIT-BIH pertenecen a [PhysioNet](https://physionet.org/) bajo la licencia Open Data Commons Attribution License v1.0.
