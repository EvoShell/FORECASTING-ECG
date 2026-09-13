<p align="center">
  <img src="./assets/header_banner.png" alt="Predicción de Arritmias Cardíacas mediante Señales ECG (ECG Forecasting) - Trabajo de Grado" width="100%" style="max-width: 950px; border-radius: 14px; box-shadow: 0 10px 25px rgba(15,23,42,0.15);">
</p>

<p align="center">
  <img src="./assets/ecg_animation.svg" alt="Animación: barrido de ECG desde el historial de 5 latidos y el intervalo RR, a través del modelo CNN-GRU con atención, hacia el pronóstico de los 3 latidos futuros." width="100%" style="max-width: 950px;">
</p>


<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.10+"></a>
  <a href="https://www.tensorflow.org/"><img src="https://img.shields.io/badge/TensorFlow-2.15-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" alt="TensorFlow 2.15"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://physionet.org/"><img src="https://img.shields.io/badge/PhysioNet-MIT--BIH%20%7C%20INCART-8B0000?style=flat-square&logo=heart&logoColor=white" alt="PhysioNet"></a>
  <a href="#-licencia-y-reconocimientos"><img src="https://img.shields.io/badge/Licencia-Académica%20%2F%20PhysioNet-blue?style=flat-square" alt="Licencia"></a>
</p>

<p align="center">
  <a href="#-resumen-del-proyecto"><b>Resumen</b></a> •
  <a href="#-bases-de-datos-utilizadas"><b>Bases de Datos</b></a> •
  <a href="#-fases-de-investigación-notebooks"><b>Notebooks</b></a> •
  <a href="#-métricas-de-evaluación-clínica-y-estadística"><b>Métricas</b></a> •
  <a href="#-arquitectura-del-software-dashboard"><b>Arquitectura</b></a> •
  <a href="#-guía-de-instalación-y-uso"><b>Instalación</b></a> •
  <a href="#-pruebas-unitarias-del-backend"><b>Pruebas</b></a> •
  <a href="#-equipo-de-investigación"><b>Equipo</b></a> •
  <a href="#-licencia-y-reconocimientos"><b>Licencia</b></a>
</p>

---

## 👥 Equipo de Investigación

<table align="center" width="100%">
  <tr align="center">
    <td width="33%" align="center">
      <img src="./assets/darwin_circle.png" width="105" height="105" alt="Darwin David Burbano Guerrero"><br><br>
      <b>Darwin David Burbano Guerrero</b><br>
      <sub>Investigador Principal · Preprocesamiento & ML</sub><br><br>
      <a href="https://github.com/EvoShell"><img src="https://img.shields.io/badge/GitHub-@EvoShell-181717?style=flat-square&logo=github" alt="GitHub EvoShell"></a>
    </td>
    <td width="34%" align="center">
      <img src="./assets/logoUniv.png" width="95" alt="Universidad CESMAG"><br><br>
      <b>Universidad CESMAG</b><br>
      <sub>Facultad de Ingeniería · Ingeniería de Sistemas (2025–2026)</sub><br><br>
      <img src="https://img.shields.io/badge/Director-Mg._Héctor_A._Mora_Paz-f59e0b?style=flat-square" alt="Director">
    </td>
    <td width="33%" align="center">
      <img src="./assets/dario_circle.png" width="105" height="105" alt="Darío Esteban Gómez Ordóñez"><br><br>
      <b>Darío Esteban Gómez Ordóñez</b><br>
      <sub>Investigador Principal · Deep Learning & API</sub><br><br>
      <a href="https://github.com/gomezdevx"><img src="https://img.shields.io/badge/GitHub-@gomezdevx-181717?style=flat-square&logo=github" alt="GitHub gomezdevx"></a>
    </td>
  </tr>
</table>

---

## 🫀 Resumen del Proyecto

Este repositorio contiene el sistema integral de investigación y la plataforma interactiva para el **pronóstico anticipado (*forecasting*) de señales de electrocardiograma (ECG)** con el objetivo de predecir arritmias cardíacas antes de su manifestación crítica.

A diferencia de los enfoques convencionales de clasificación post-evento, este sistema aborda el problema como una tarea de **pronóstico temporal y morfológico secuencial**: predice la morfología de latidos futuros completos ($H \in \{1, 2, 3\}$ latidos hacia adelante) a partir del historial previo ($L = 5$ latidos), integrando la morfología de la señal y la dinámica de los intervalos RR.

### 🔄 Esquema del Flujo Metodológico de Pronóstico

<p align="center">
  <img src="./assets/pipeline_diagram.svg" alt="Flujo del sistema en 4 pasos: el historial de 5 latidos más el intervalo RR entra a los modelos de forecasting (ML clásico evolucionando a Deep Learning), que producen la predicción de latidos futuros, la cual alimenta la detección anticipada de anomalías en el dashboard." width="100%" style="max-width: 780px; border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,0.08);">
</p>

<details>
<summary><b>🔧 Ver código fuente del diagrama (Mermaid, editable)</b></summary>

```mermaid
flowchart TD
    classDef input fill:#0369a1,stroke:#38bdf8,stroke-width:2px,color:#ffffff;
    classDef model fill:#4338ca,stroke:#818cf8,stroke-width:2px,color:#ffffff;
    classDef output fill:#be123c,stroke:#fb7185,stroke-width:2px,color:#ffffff;
    classDef clinic fill:#047857,stroke:#34d399,stroke-width:2px,color:#ffffff;

    IN["<b>📥 Señal de Entrada Multivariada</b><br/>• Historial L = 5 latidos (256 muestras/latido)<br/>• Intervalo temporal normalizado RRnorm (dim=257)"]:::input
    
    MOD{"<b>🧠 Modelos de Pronóstico Secuencial</b><br/><i>(ECG Forecasting)</i>"}:::model
    
    ML["<b>Línea Base & ML Clásico</b><br/>Persistencia · ARIMA · RF · MLP Regressor"]:::model
    DL["<b>Deep Learning Híbrido</b><br/>LSTM · GRU · CNN-GRU con Atención (Validación LOPO)"]:::model

    OUT["<b>📈 Pronóstico Morfológico Futuro</b><br/>• Morfología completa onda P - Complejo QRS - Onda T<br/>• Horizonte Multi-Step H ∈ {1, 2, 3} latidos"]:::output

    DET["<b>🩺 Detección Previa de Arritmias & Dashboard</b><br/>• Identificación de anomalías antes del evento crítico<br/>• Plataforma interactiva en tiempo real (FastAPI + React)"]:::clinic

    IN --> MOD
    MOD --> ML
    MOD --> DL
    ML -.-> OUT
    DL ==>|Mayor Fidelidad Morfológica| OUT
    OUT --> DET
```

</details>

---

## 🗄️ Bases de Datos Utilizadas

| Base de Datos | Fuente | Especificaciones Clínicas | Propósito en la Investigación |
| :--- | :---: | :--- | :--- |
| **[MIT-BIH Arrhythmia Database](https://physionet.org/content/mitdb/1.0.0/)** | `PhysioNet` | • 48 registros de pacientes (2 canales, ~30 min)<br>• Frecuencia de muestreo: $F_s = 360\text{ Hz}$<br>• Anotaciones clínicas de referencia | Entrenamiento principal, evaluación de latidos normales y arritmias (ventriculares, supraventriculares, bloqueos de rama). |
| **[St. Petersburg INCART Database](https://physionet.org/content/incartdb/1.0.0/)** | `PhysioNet` | • 75 registros de 12 derivaciones (~30 min)<br>• Frecuencia de muestreo: $F_s = 257\text{ Hz}$<br>• Validación independiente | **Validación cruzada independiente y pruebas de generalización inter-paciente** para descartar sesgos poblacionales. |

---

## 🔬 Fases de Investigación (Notebooks)

El núcleo científico del proyecto se encuentra estructurado en 8 cuadernos Jupyter numerados cronológicamente:

| Notebook | Nombre del Archivo | Etapa Metodológica | Enfoque y Descripción |
| :---: | :--- | :---: | :--- |
| **NB1** | `01_tradicionales.ipynb` | ![ML](https://img.shields.io/badge/ML-Clásico-4A90E2?style=flat-square) | Modelos de Machine Learning clásico: Regresión Lineal, Árboles de Decisión, Random Forest, SVR, MLP Regressor, ARIMA y línea base de Persistencia. |
| **NB2** | `02_deep_learning.ipynb` | ![DL](https://img.shields.io/badge/Deep-Learning-7B68EE?style=flat-square) | Modelos de Deep Learning recurrentes y convolucionales: LSTM, GRU, CNN-LSTM y CNN-GRU univariante. |
| **NB3** | `03_evaluation.ipynb` | ![Eval](https://img.shields.io/badge/Evaluación-Clínica-FF8C00?style=flat-square) | Protocolo de evaluación estandarizada, análisis de transferencia cruzada y escenarios clínicos. |
| **NB4** | `04_compuesta multi-sujeto.ipynb` | ![Filtros](https://img.shields.io/badge/Filtros-Multi--Sujeto-20B2AA?style=flat-square) | Experimentación multi-paciente comparando 7 variantes de preprocesamiento y filtrado (`F_N+MED`, `F_MED`, `F_N+PB+MED`). |
| **NB5** | `05_cross_patient.ipynb` | ![LOPO](https://img.shields.io/badge/Validación-LOPO-E74C3C?style=flat-square) | Validación inter-paciente rigurosa mediante **Leave-One-Patient-Out (LOPO)** para prevenir fuga de información (*data leakage*). |
| **NB6** | `06_Cross_patient_MultiStep.ipynb` | ![Atención](https://img.shields.io/badge/Atención-MultiStep-9B59B6?style=flat-square) | Modelo multi-step ($H=3$) híbrido **CNN-GRU con mecanismo de Atención**, incorporando latido (256 muestras) + intervalo $RR_{\text{norm}}$ ($\text{dim}=257$). |
| **NB7** | `07_hiperparametros.ipynb` | ![Opt](https://img.shields.io/badge/Opt-Hiperparámetros-F39C12?style=flat-square) | Búsqueda sistemática y optimización de hiperparámetros (tasas de aprendizaje, filtros CNN, unidades recurrentes, regularización). |
| **NB8** | `08_deteccion_evento.ipynb` | ![Detección](https://img.shields.io/badge/Detección-Arritmias-C0392B?style=flat-square) | Análisis y detección de eventos arrítmicos sobre las señales pronosticadas vs. reales. |

---

## 📊 Métricas de Evaluación Clínica y Estadística

| Métrica | Definición / Uso | Relevancia Clínica y Diagnóstica |
| :--- | :--- | :--- |
| **$R^2$ (Coeficiente de Determinación)** | Proporción de varianza explicada por el modelo | Evaluado en entrenamiento y prueba para verificar generalización estricta y evitar sobreajuste. |
| **RMSE / MSE** | Error cuadrático medio de reconstrucción | Cuantifica la magnitud de desviación en milivoltios ($\text{mV}$) entre la señal real y la predicha. |
| **MAE** | Error absoluto medio | Mide el error promedio directo en la amplitud morfológica de la onda cardíaca. |
| **DTW (Dynamic Time Warping)** | Alineamiento de secuencias temporales no lineales | Evalúa la similitud morfológica y preservación de la forma de las ondas P, complejo QRS y onda T. |
| **Tests Estadísticos No Paramétricos** | Pruebas de **Wilcoxon** y **Kruskal-Wallis / Mann-Whitney** | Demuestra significancia estadística real de las mejoras obtenidas frente al modelo base de persistencia. |

---

## 🏗️ Arquitectura del Software (Dashboard)

El proyecto cuenta con un aplicativo web interactivo para análisis clínico y demostración en tiempo real ubicado en [`FORECASTING ECG - Dashboard/`](./FORECASTING%20ECG%20-%20Dashboard):

### 🗺️ Diagrama de Arquitectura y Componentes

<p align="center">
  <img src="./assets/architecture_diagram.svg" alt="Arquitectura: el repositorio principal contiene notebooks, requirements y el dashboard. El dashboard es orquestado por Docker Compose, que levanta un backend FastAPI y un frontend React; el frontend llama al backend mediante peticiones HTTP a la ruta /api." width="100%" style="max-width: 1050px; border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,0.08);">
</p>



<p align="center">
  <img src="./assets/filetree_diagram.svg" alt="Estructura de carpetas: notebooks, requirements, gitignore y README en la raíz; el subdirectorio Dashboard contiene el backend ecg_forecast_api y el frontend ecg-react con sus respectivos archivos." width="100%" style="max-width: 900px; border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,0.08);">
</p>


## 🚀 Guía de Instalación y Uso

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

> [!IMPORTANT]
> Requiere **Docker Desktop** instalado y en ejecución (con motor WSL 2 habilitado en Windows) y al menos 6 GB de memoria RAM libre recomendada.

```bash
cd "FORECASTING ECG - Dashboard/ecg_forecast_api"
docker compose up --build
```

Una vez desplegados los contenedores:
* **Frontend Web:** [`http://localhost`](http://localhost) (puerto `80`)
* **Documentación interactiva de la API (Swagger UI):** [`http://localhost:8000/docs`](http://localhost:8000/docs)
* **Verificación de estado (Healthcheck):** [`http://localhost:8000/api/health`](http://localhost:8000/api/health)

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
   * Acceder en el navegador a: [`http://localhost:5173`](http://localhost:5173) (Vite configurado con proxy hacia `/api`).

---

## 🧪 Pruebas Unitarias del Backend

Para validar el funcionamiento del preprocesamiento, carga de modelos y endpoints de la API:

```bash
cd "FORECASTING ECG - Dashboard/ecg_forecast_api"
pytest tests/
```

---

## 📄 Licencia y Reconocimientos

* **Proyecto Académico:** Universidad CESMAG (Pasto, Nariño, Colombia), 2025–2026.
* **Bases de datos biomédicas:** Disponibles públicamente por PhysioNet bajo la licencia [Open Data Commons Attribution License v1.0](https://physionet.org/about/licenses/odc-by-10/).