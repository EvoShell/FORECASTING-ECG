# ECG Forecasting API

FastAPI backend for ECG beat prediction using deep learning models (GRU/LSTM).

## Setup

### Using Docker

```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`

### Local Development

```bash
cd ecg_forecast_api
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/models` - List all available models
- `POST /api/process_signal` - Process ECG signal (resample, filter, segment)
- `POST /api/predict` - Predict next beat
- `POST /api/predict_batch` - Predict multiple beats
- `POST /api/predict_lopo` - Cross-patient LOPO prediction

## Models

18 models available:
- Architectures: GRU, LSTM
- Filters: F_N+MED, F_MED, F_N+PB+MED
- Lookbacks: 3, 5, 10

Plus LOPO cross-patient model (GRU, F_N+PB+MED, LB5)

## Configuration

- `MODEL_DIR`: Directory containing model files (default: `./models`)
- Sample rate: 360 Hz
- Beat length: 256 samples
