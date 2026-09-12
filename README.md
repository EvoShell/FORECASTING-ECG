# Predicción de Arritmias Cardíacas mediante Señales ECG (ECG Forecasting)

> **Trabajo de Grado · Universidad CESMAG**  
> Facultad de Ingeniería · Programa de Ingeniería de Sistemas (2025–2026)  
> **Autores:** Darwin David Burbano Guerrero & Darío Esteban Gómez Ordóñez  
> **Director:** Mg. Héctor Andrés Mora Paz  

---

## Resumen del Proyecto

Este repositorio contiene el sistema integral de investigación y la plataforma interactiva para el **pronóstico anticipado (*forecasting*) de señales de electrocardiograma (ECG)** con el objetivo de predecir arritmias cardíacas antes de su manifestación crítica.

A diferencia de los enfoques convencionales de clasificación post-evento, este sistema aborda el problema como una tarea de **pronóstico temporal y morfológico secuencial**: predice la morfología de latidos futuros completos ($H \in \{1, 2, 3\}$ latidos hacia adelante) a partir del historial previo ($L = 5$ latidos), integrando la morfología de la señal y la dinámica de los intervalos RR.

```
Historial (5 latidos anteriores) + Intervalos RR
               │
               ▼
┌───────────────────────────────────────────────────────────┐
│     Modelos de Forecasting (ML Clásico / Deep Learning)    │
│  [ARIMA, RF, MLP]  ───▶  [LSTM, GRU, CNN-GRU + Atención]  │
└───────────────────────────────────────────────────────────┘
               │
               ▼
Predicción de latidos futuros (Morfología onda P-QRS-T, 256 muestras/latido)
               │
               ▼
Detección anticipada de anomalías y visualización clínica en tiempo real
```

---

## Bases de Datos Utilizadas

1. **[MIT-BIH Arrhythmia Database](https://physionet.org/content/mitdb/1.0.0/) (PhysioNet):**
   - 48 registros de pacientes de dos canales (longitud ~30 minutos, frecuencia de muestreo $F_s = 360\text{ Hz}$).
   - Anotaciones clínicas de referencia para latidos normales y diversas arritmias (ventriculares, supraventriculares, bloqueos de rama).
2. **[St. Petersburg INCART 12-lead Arrhythmia Database](https://physionet.org/content/incartdb/1.0.0/) (PhysioNet):**
   - 75 registros de 12 derivaciones ($F_s = 257\text{ Hz}$) utilizados para **validación cruzada independiente y pruebas de generalización inter-paciente**.

---

## Fases de Investigación (Notebooks)

El núcleo científico del proyecto se encuentra estructurado en 8 cuadernos Jupyter numerados cronológicamente:

| Notebook | Nombre | Enfoque y Descripción |
| :--- | :--- | :--- |
| **NB1** | `01_tradicionales.ipynb` | Modelos de Machine Learning clásico: Regresión Lineal, Árboles de Decisión, Random Forest, SVR, MLP Regressor, ARIMA y línea base de Persistencia. |
| **NB2** | `02_deep_learning.ipynb` | Modelos de Deep Learning recurrentes y convolucionales: LSTM, GRU, CNN-LSTM y CNN-GRU univariante. |
| **NB3** | `03_evaluation.ipynb` | Protocolo de evaluación estandarizada, análisis de transferencia cruzada y escenarios clínicos. |
| **NB4** | `04_compuesta multi-sujeto.ipynb` | Experimentación multi-paciente comparando 7 variantes de preprocesamiento y filtrado (`F_N+MED`, `F_MED`, `F_N+PB+MED`). |
| **NB5** | `05_cross_patient.ipynb` | Validación inter-paciente rigurosa mediante **Leave-One-Patient-Out (LOPO)** para prevenir fuga de información (*data leakage*). |
| **NB6** | `06_Cross_patient_MultiStep.ipynb` | Modelo multi-step ($H=3$) híbrido **CNN-GRU con mecanismo de Atención**, incorporando latido (256 muestras) + intervalo $RR_{\text{norm}}$ ($\text{dim}=257$). |
| **NB7** | `07_hiperparametros.ipynb` | Búsqueda sistemática y optimización de hiperparámetros (tasas de aprendizaje, filtros CNN, unidades recurrentes, regularización). |
| **NB8** | `08_deteccion_evento.ipynb` | Análisis y detección de eventos arrítmicos sobre las señales pronosticadas vs. reales. |

---

## Métricas de Evaluación Clínica y Estadística

* **$R^2$ (Coeficiente de Determinación):** Evaluado tanto en conjunto de entrenamiento como de prueba para verificar generalización y evitar sobreajuste.
* **RMSE / MSE:** Magnitud del error cuadrático medio de reconstrucción en milivoltios.
* **MAE:** Error absoluto medio en la amplitud de la señal.
* **DTW (Dynamic Time Warping):** Similitud de forma morfológica entre el latido real y el pronosticado.
* **Tests Estadísticos No Paramétricos:** Comparación mediante **Wilcoxon** y **Kruskal-Wallis / Mann-Whitney** para evaluar diferencias significativas frente al modelo base de persistencia.

---

## Arquitectura del Software (Dashboard)

El proyecto cuenta con un aplicativo web interactivo para análisis clínico y demostración en tiempo real ubicado en [`FORECASTING ECG - Dashboard/`](file:///D:/FORECASTING%20ECG/FORECASTING%20ECG%20-%20Dashboard):

```
FORECASTING ECG/
├── notebooks/                     # Cuadernos de experimentación (NB1 a NB8)
├── requirements.txt               # Dependencias Python del entorno de experimentación
├── .gitignore                     # Configuración de exclusiones de Git
├── README.md                      # Documentación principal del sistema
│
└── FORECASTING ECG - Dashboard/   # Aplicativo completo (API + Web)
    ├── docker-compose.yml         # Orquestación de contenedores
    │
    ├── ecg_forecast_api/          # Backend de Inferencia (FastAPI + TensorFlow)
    │   ├── Dockerfile             # Imagen Docker Python 3.11
    │   ├── requirements.txt       # Dependencias del backend
    │   ├── app/
    │   │   ├── main.py            # Inicialización de la API y precarga de modelos
    │   │   ├── config.py          # Constantes de señal, filtros y rutas
    │   │   ├── api/routes/        # Endpoints (predict, process, models, patients)
    │   │   ├── core/              # Preprocesamiento, segmentación y reconstrucción
    │   │   └── models/schemas.py  # Modelos de datos Pydantic
    │   └── tests/                 # Pruebas automatizadas (pytest + httpx)
    │
    └── ecg-react/                 # Frontend Moderno (React 19 + Vite + TypeScript)
        ├── Dockerfile             # Imagen Docker con Nginx para producción
        ├── src/
        │   ├── pages/             # Home, Modelos, Experimentos, LOPO, Explorador
        │   ├── components/        # Visualizadores de ECG, gráficos Plotly, KPIs
        │   ├── store/             # Estado global con Zustand (useECGStore)
        │   └── styles/            # Sistema de diseño con TailwindCSS
        └── public/data/           # Checkpoints y resultados estadísticos curados
```

---

## Guía de Instalación y Uso

### 1. Clonar el repositorio

```bash
git clone https://github.com/EvoShell/FORECASTING-ECG.git
cd FORECASTING-ECG
```

### 2. Entorno para los Notebooks de Investigación

Se recomienda crear un entorno virtual con Python 3.10+:

```bash
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

#### Descarga de señales PhysioNet (Opcional si se ejecutan notebooks locales):
```python
import wfdb
# Descarga la base de datos MIT-BIH
wfdb.dl_database('mitdb', 'datos/mit-bih')
```

---

### 3. Ejecutar el Dashboard Interactivo

#### Opción A: Despliegue con Docker Compose (Recomendado)

Requiere Docker Desktop instalado:

```bash
cd "FORECASTING ECG - Dashboard/ecg_forecast_api"
docker compose up --build
```

* **Frontend Web:** `http://localhost` (puerto 80)
* **Documentación interactiva de la API:** `http://localhost:8000/docs`
* **Healthcheck:** `http://localhost:8000/api/health`

#### Opción B: Ejecución en Desarrollo Local (Sin Docker)

1. **Iniciar el Backend:**
   ```bash
   cd "FORECASTING ECG - Dashboard/ecg_forecast_api"
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Iniciar el Frontend:**
   ```bash
   cd "FORECASTING ECG - Dashboard/ecg-react"
   npm install
   npm run dev
   ```
   * Acceder a `http://localhost:5173` (Vite configurado con proxy hacia `/api`).

---

## Pruebas Unitarias del Backend

```bash
cd "FORECASTING ECG - Dashboard/ecg_forecast_api"
pytest tests/
```

---

## Licencia y Reconocimientos

* **Proyecto Académico:** Universidad CESMAG (Pasto, Nariño, Colombia), 2025–2026.
* **Bases de datos biomédicas:** Disponibles públicamente por PhysioNet bajo la licencia Open Data Commons Attribution License v1.0.
