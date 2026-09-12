import os
import threading
from pathlib import Path
from typing import Any, Optional

import numpy as np
import tensorflow as tf
from tensorflow import keras
import zipfile
import h5py
import tempfile

from app.config import LOPO_CONFIG, MODEL_DIR

# Only LOPO model is used — NB4B models removed in cleanup
MODEL_REGISTRY: dict[str, dict[str, Any]] = {}

MODEL_REGISTRY["LOPO"] = {
    "name": LOPO_CONFIG["name"],
    "architecture": "CNN_GRU_ATTN",
    "filter": LOPO_CONFIG["filter"],
    "lookback": LOPO_CONFIG["lookback"],
    "horizon": LOPO_CONFIG["horizon"],
    "filename": LOPO_CONFIG["filename"],
    "is_lopo": True,
    "r2_lopo": LOPO_CONFIG["r2_lopo"],
    "ic95": LOPO_CONFIG["ic95"],
}


class ModelCache:
    def __init__(self):
        self._cache: dict[str, keras.Model] = {}
        self._lock = threading.Lock()

    def get(self, model_name: str) -> Optional[keras.Model]:
        with self._lock:
            return self._cache.get(model_name)

    def put(self, model_name: str, model: keras.Model) -> None:
        with self._lock:
            self._cache[model_name] = model

    def has(self, model_name: str) -> bool:
        with self._lock:
            return model_name in self._cache

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def preload(self, model_names: list[str]) -> None:
        for name in model_names:
            if not self.has(name):
                self.put(name, load_model(name))


_model_cache = ModelCache()


def _register_custom_objects() -> None:
    """Register NB6 custom Keras layers required for CNN_GRU_ATTN_final.keras."""
    from tensorflow import keras
    
    # Allow deserialization of Lambda layers
    try:
        keras.config.enable_unsafe_deserialization()
        print("Unsafe deserialization enabled for Lambda layers")
    except Exception as ex:
        print(f"Could not enable unsafe deserialization: {ex}")

# Move TemporalAttention outside so it can be referenced directly in _build_lopo_architecture
import tensorflow as tf
from tensorflow import keras
@keras.utils.register_keras_serializable(package="Custom")
class TemporalAttention(keras.layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        n_feat = int(input_shape[-1])
        self.W = self.add_weight(
            name="att_W",
            shape=(n_feat, 1),
            initializer="glorot_uniform",
            trainable=True,
        )
        self.b = self.add_weight(
            name="att_b",
            shape=(1,),
            initializer="zeros",
            trainable=True,
        )
        super().build(input_shape)

    def call(self, x):
        e = tf.nn.tanh(tf.tensordot(x, self.W, axes=1) + self.b)
        a = tf.nn.softmax(e, axis=1)
        return tf.reduce_sum(x * a, axis=1)

    def get_config(self):
        return super().get_config()

_register_custom_objects()

# --- FIX KERAS 2.15 LAMBDA SHAPE BUG ---
# Models trained in Keras 3 drop the 'output_shape' attribute from Lambda layers.
# Keras 2.15 requires it for slicing operations. This globally overrides the Lambda class
# during model loading to manually provide the shape inference.
class FixedLambda(keras.layers.Lambda):
    def compute_output_shape(self, input_shape):
        # The model uses Lambda(lambda t: t[:, -1, :256])
        # input_shape is (batch, 5, 257) -> output is (batch, 256)
        if isinstance(input_shape, tuple) and len(input_shape) == 3 and input_shape[-1] >= 256:
            return (input_shape[0], 256)
        return super().compute_output_shape(input_shape)

keras.saving.get_custom_objects().update({'Lambda': FixedLambda})


def _find_model_path(filename: str) -> Path:
    """Find model file in various possible locations.

    MODEL_DIR is set by env var (e.g. /app/results/NB4B/modelos in Docker).
    We derive a sibling results root from it so Docker volume mounts resolve
    correctly without relying on __file__ depth (which changes between local
    dev and the Docker WORKDIR layout).
    """
    # Local-dev fallback: walk up from __file__ to the project root.
    local_base = Path(__file__).parent.parent.parent.parent

    # Docker-aware results root: MODEL_DIR = .../results/NB4B/modelos → parent×2 = .../results
    model_dir_path = Path(MODEL_DIR)
    results_root = model_dir_path.parent.parent  # resolves in Docker to /app/results

    search_paths = [
        model_dir_path / filename,  # NB4B models (MODEL_DIR)
        results_root / "NB5" / "modelos" / filename,  # NB6 model (saved to NB5 folder)
        results_root
        / "NB5B"
        / "modelos"
        / filename,  # Docker: /app/results/NB5B/modelos/
        results_root / "NB5B" / filename,  # fallback flat
        results_root / "NBRetrain" / "modelos_retrained" / filename,
        results_root / "NB2" / "modelos" / filename,
        local_base / "results" / "NB5" / "modelos" / filename,  # local-dev NB6 model
        local_base
        / "results"
        / "NB4B"
        / "modelos"
        / filename,  # local-dev absolute paths
        local_base / "results" / "NB5B" / "modelos" / filename,
        local_base / "results" / "NB5B" / filename,
    ]

    for path in search_paths:
        if path.exists():
            return path

    raise FileNotFoundError(f"Model file not found: {filename}")


def _build_lopo_architecture() -> keras.Model:
    inputs = keras.Input(shape=(5, 257), name='input_layer')
    x = keras.layers.Conv1D(64, 5, padding='same', activation='relu', name='conv1d')(inputs)
    x = keras.layers.BatchNormalization(name='batch_normalization')(x)
    x = keras.layers.Conv1D(128, 3, padding='same', dilation_rate=2, activation='relu', name='conv1d_1')(x)
    x = keras.layers.Conv1D(128, 3, padding='same', dilation_rate=4, activation='relu', name='conv1d_2')(x)
    x = keras.layers.MaxPooling1D(2, name='max_pooling1d')(x)
    x = keras.layers.GRU(128, return_sequences=True, name='gru')(x)
    x = keras.layers.GRU(64, return_sequences=True, name='gru_1')(x)
    
    x = TemporalAttention(name='temporal_attention')(x)
    
    x = keras.layers.Dropout(0.3, name='dropout')(x)
    enc_out = keras.layers.Dense(128, activation='relu', name='dense')(x)

    last_beat = keras.layers.Lambda(lambda t: t[:, -1, :256], output_shape=(256,), name='lambda')(inputs)
    y = keras.layers.Dense(768, activation='linear', name='dense_1')(enc_out)
    y = keras.layers.Reshape((3, 256), name='reshape')(y)
    lb_rep = keras.layers.RepeatVector(3, name='repeat_vector')(last_beat)
    out_ecg = keras.layers.Add(name='out_ecg')([lb_rep, y])

    model = keras.Model(inputs=inputs, outputs=out_ecg, name='CNN_GRU_ATTN')
    return model


def _load_keras3_weights_from_zip(model: keras.Model, zip_path: Path) -> None:
    with zipfile.ZipFile(str(zip_path), 'r') as z:
        with tempfile.NamedTemporaryFile(suffix='.h5', delete=False) as tmp:
            tmp.write(z.read('model.weights.h5'))
            tmp_name = tmp.name

    try:
        with h5py.File(tmp_name, 'r') as f:
            for layer in model.layers:
                if not layer.weights: continue
                
                base = f['layers'][layer.name]
                if 'vars' in base and len(base.get('vars', [])) > 0:
                    var_grp = base['vars']
                elif 'cell' in base and 'vars' in base['cell']:
                    var_grp = base['cell']['vars']
                else:
                    raise ValueError(f"No vars for {layer.name}")
                    
                arrays = [var_grp[str(i)][()] for i in range(len(layer.weights))]
                layer.set_weights(arrays)
    finally:
        os.remove(tmp_name)


def get_model(model_name: str) -> Optional[keras.Model]:
    return _model_cache.get(model_name)


def load_model(model_name: str) -> keras.Model:
    cached = _model_cache.get(model_name)
    if cached is not None:
        return cached

    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_name}")

    model_info = MODEL_REGISTRY[model_name]
    model_path = _find_model_path(model_info["filename"])

    print(f"Loading model from: {model_path}")
    print(f"TF/Keras version: {tf.__version__}")

    if model_info.get("name") == "CNN_GRU_ATTN":
        print(f"Using native TF 2.15 build + Keras 3 weights extraction for {model_name}")
        model = _build_lopo_architecture()
        _load_keras3_weights_from_zip(model, model_path)
    else:
        try:
            from app.core.model_loader import FixedLambda
            custom_objects = {"Lambda": FixedLambda}
        except ImportError:
            custom_objects = {}

        try:
            model = keras.models.load_model(str(model_path), compile=False, safe_mode=False, custom_objects=custom_objects)
        except Exception as e:
            print(f"Error loading with keras.models.load_model (safe_mode=False): {e}")
            try:
                model = tf.keras.models.load_model(
                    str(model_path), compile=False, safe_mode=False, custom_objects=custom_objects
                )
            except Exception as e2:
                print(f"Error loading with tf.keras.models.load_model: {e2}")
                try:
                    model = keras.models.load_model(str(model_path), compile=False, custom_objects=custom_objects)
                except Exception as e3:
                    print(f"Error with default keras load: {e3}")
                    raise ValueError(f"Failed to load model {model_name}: {e3}")

    print(f"Model loaded successfully: {model.input_shape} -> {model.output_shape}")
    _model_cache.put(model_name, model)
    return model


def preload_models(model_names: Optional[list[str]] = None) -> None:
    if model_names is None:
        model_names = list(MODEL_REGISTRY.keys())
    for name in model_names:
        if not _model_cache.has(name):
            try:
                _model_cache.put(name, load_model(name))
            except (FileNotFoundError, ValueError) as e:
                print(f"Model {name} could not be preloaded: {e}, skipping...")
                continue


def get_model_info(model_name: str) -> dict[str, Any]:
    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_name}")
    return MODEL_REGISTRY[model_name]


def list_available_models() -> list[dict[str, Any]]:
    """List all models with their availability status."""
    result = []
    for name, info in MODEL_REGISTRY.items():
        try:
            path = _find_model_path(info["filename"])
            available = True
        except FileNotFoundError:
            available = False
            path = None

        result.append(
            {
                **info,
                "available": available,
                "path": str(path) if path else None,
            }
        )
    return result
