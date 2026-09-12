FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV TF_CPP_MIN_LOG_LEVEL=2

RUN apt-get update && apt-get install -y --no-install-recommends \
wget \
libsndfile1 \
&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ecg_forecast_api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir wfdb==4.3.1 soundfile matplotlib && \
    pip install --no-cache-dir --force-reinstall numpy==1.24.3 scipy==1.11.4 pandas==2.0.3

COPY ecg_forecast_api/app/ ./app/
COPY results/NB5/modelos/ /app/results/NB5/modelos/
COPY datos/mit-bih/ /app/mit-bih/
COPY datos/incart/ /app/incart/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
