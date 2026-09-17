import { useState } from 'react';
import { useTablaLopo } from '@/hooks/useTablaLopo';
import { Boton } from '@/components/ui/Boton';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { ModelBadge } from '@/components/models/ModelBadge';
import { motion, AnimatePresence } from 'framer-motion';
import type { ModelName } from '@/types/ecg.types';
import { MODEL_COLORS } from '@/types/ecg.types';
import { useLang, type TFn } from '@/i18n';

/* ================================================================
   TYPES
   ================================================================ */
type Category = 'deep' | 'traditional' | 'lopo';
type DeepModel = 'LSTM' | 'GRU' | 'CNN-GRU';
type TraditionalModel = 'RF' | 'MLP' | 'SVR_rbf' | 'DT';
type LopoModel = 'GRU_base' | 'CNN_GRU' | 'BiGRU_MHA' | 'Ensemble' | 'CNN_GRU_ATTN';
type AnyModel = DeepModel | TraditionalModel | LopoModel;

const getCategoryMeta = (t: TFn): Record<Category, { label: string; sub: string; models: AnyModel[] }> => ({
  deep:        { label: 'Deep Learning',       sub: t('NB2 · Redes neuronales recurrentes e híbridas', 'NB2 · Recurrent and hybrid neural networks'),    models: ['LSTM', 'GRU', 'CNN-GRU'] },
  traditional: { label: t('ML Tradicional', 'Traditional ML'),      sub: t('NB1 · Modelos clásicos de machine learning', 'NB1 · Classical machine learning models'),      models: ['RF', 'MLP', 'SVR_rbf', 'DT'] },
  lopo:        { label: 'Cross-Patient (LOPO)', sub: t('NB5B y NB6 · Leave-One-Patient-Out con fine-tuning', 'NB5B and NB6 · Leave-One-Patient-Out with fine-tuning'),    models: ['GRU_base', 'CNN_GRU', 'BiGRU_MHA', 'Ensemble', 'CNN_GRU_ATTN'] },
});

function modelColor(m: AnyModel): string {
  const map: Record<string, string> = {
    ...MODEL_COLORS,
    GRU_base: MODEL_COLORS['GRU'],
    CNN_GRU: MODEL_COLORS['CNN-GRU'],
    BiGRU_MHA: '#1d4ed8',
    Ensemble: '#f472b6',
    CNN_GRU_ATTN: '#8b5cf6',
  };
  return map[m] || '#8899bb';
}

function badgeName(m: AnyModel): ModelName {
  const map: Record<string, ModelName> = {
    GRU_base: 'GRU', CNN_GRU: 'CNN-GRU', BiGRU_MHA: 'GRU', Ensemble: 'LOPO', CNN_GRU_ATTN: 'CNN-GRU',
  };
  return (map[m] ?? m) as ModelName;
}

/* ================================================================
   MODEL DESCRIPTIONS
   ================================================================ */
interface ModelDesc {
  fullName: string;
  summary: string;
  mechanism: string;
  strengths: string[];
  tradeoffs: string[];
  ecgRationale: string;
}

const getDescriptions = (t: TFn): Record<AnyModel, ModelDesc> => ({
  /* ─── Deep Learning ─── */
  LSTM: {
    fullName: 'Long Short-Term Memory',
    summary: t('Red recurrente con compuertas de entrada, olvido y salida que regulan el flujo de información a través de una celda de memoria persistente.', 'Recurrent network with input, forget, and output gates that regulate information flow through a persistent memory cell.'),
    mechanism: t('Cada celda LSTM mantiene un estado interno (cell state) que atraviesa la secuencia con cambios aditivos controlados por tres compuertas sigmoide: la compuerta de olvido decide qué información descartar; la de entrada selecciona nueva información candidata (tanh); y la de salida filtra el estado para producir la salida del paso actual. Resuelve el problema del gradiente desvaneciente.', 'Each LSTM cell maintains an internal state (cell state) that traverses the sequence with additive changes controlled by three sigmoid gates: the forget gate decides what information to discard; the input gate selects new candidate information (tanh); and the output gate filters the state to produce the current step output. Solves the vanishing gradient problem.'),
    strengths: [
      t('Captura dependencias de largo alcance (cientos de pasos)', 'Captures long-range dependencies (hundreds of steps)'),
      t('Estado interno protegido contra degradación de gradiente', 'Internal state protected against gradient degradation'),
      t('Ampliamente documentado en series temporales biomédicas', 'Widely documented in biomedical time series'),
    ],
    tradeoffs: [
      t('Mayor tiempo de entrenamiento que GRU (~15% más lento)', 'Longer training time than GRU (~15% slower)'),
      t('Más parámetros por capa (4 matrices de pesos vs 3 de GRU)', 'More parameters per layer (4 weight matrices vs 3 for GRU)'),
      t('Puede sobreajustar con secuencias cortas sin regularización', 'Can overfit with short sequences without regularization'),
    ],
    ecgRationale: t('La LSTM captura la relación entre ciclos cardíacos sucesivos: la morfología de la onda P y el complejo QRS del latido anterior influyen en la predicción del siguiente, incluso cuando hay arritmias intercaladas.', 'LSTM captures the relationship between successive cardiac cycles: the P wave morphology and QRS complex of the previous beat influence the prediction of the next, even with interspersed arrhythmias.'),
  },
  GRU: {
    fullName: 'Gated Recurrent Unit',
    summary: t('Variante simplificada de la LSTM que combina las compuertas de entrada y olvido en una sola compuerta de actualización, y elimina el cell state separado.', 'Simplified LSTM variant that combines input and forget gates into a single update gate and eliminates the separate cell state.'),
    mechanism: t('La GRU utiliza dos compuertas: la de reinicio (reset gate) controla cuánto del estado oculto anterior se combina con la entrada para generar un candidato; la de actualización (update gate) decide la proporción entre el estado anterior y el nuevo candidato. Al fusionar cell state y hidden state, reduce la complejidad computacional.', 'GRU uses two gates: the reset gate controls how much of the previous hidden state combines with the input to generate a candidate; the update gate decides the proportion between the previous state and the new candidate. By merging cell state and hidden state, it reduces computational complexity.'),
    strengths: [
      t('Entrenamiento más rápido que LSTM con rendimiento comparable', 'Faster training than LSTM with comparable performance'),
      t('Menos parámetros → menor riesgo de sobreajuste', 'Fewer parameters → lower overfitting risk'),
      t('Convergencia más rápida (70 epochs vs 80 de LSTM)', 'Faster convergence (70 epochs vs 80 for LSTM)'),
    ],
    tradeoffs: [
      t('Menor capacidad de memoria de muy largo plazo vs LSTM', 'Lower very long-term memory capacity vs LSTM'),
      t('Menor flexibilidad en el control del flujo de información', 'Less flexibility in information flow control'),
    ],
    ecgRationale: t('Para forecasting latido-a-latido, la GRU es ideal: los patrones relevantes están en los 3-10 latidos inmediatos. Fue el modelo principal seleccionado para LOPO por su balance entre generalización y velocidad de inferencia.', 'For beat-to-beat forecasting, GRU is ideal: relevant patterns are in the 3-10 immediate beats. It was the main model selected for LOPO due to its balance between generalization and inference speed.'),
  },
  'CNN-GRU': {
    fullName: 'Convolutional Neural Network + GRU',
    summary: t('Arquitectura híbrida que combina capas Conv1D para extracción de features morfológicas locales con una capa GRU para modelado de dependencias temporales.', 'Hybrid architecture combining Conv1D layers for local morphological feature extraction with a GRU layer for temporal dependency modeling.'),
    mechanism: t('Dos capas Conv1D (64 filtros, kernel=3) detectan patrones locales (pendientes QRS, ondas P/T). BatchNorm + ReLU estabilizan el entrenamiento. MaxPool1D comprime la dimensionalidad temporal. La capa GRU modela la evolución secuencial de estas features entre latidos. Una capa Dense reconstruye la predicción.', 'Two Conv1D layers (64 filters, kernel=3) detect local patterns (QRS slopes, P/T waves). BatchNorm + ReLU stabilize training. MaxPool1D compresses temporal dimensionality. The GRU layer models sequential evolution of these features across beats. A Dense layer reconstructs the prediction.'),
    strengths: [
      t('Extracción automática de features morfológicas', 'Automatic morphological feature extraction'),
      t('Robusto ante ruido de alta frecuencia', 'Robust against high-frequency noise'),
      t('Combina lo mejor de ambos paradigmas: local (CNN) + temporal (GRU)', 'Combines the best of both paradigms: local (CNN) + temporal (GRU)'),
    ],
    tradeoffs: [
      t('Arquitectura más compleja → más difícil de interpretar', 'More complex architecture → harder to interpret'),
      t('Requiere ajuste de hiperparámetros CNN adicionales', 'Requires additional CNN hyperparameter tuning'),
      t('Mayor consumo de memoria por los feature maps', 'Higher memory consumption due to feature maps'),
    ],
    ecgRationale: t('En señales ECG ruidosas o con artefactos de movimiento, la etapa CNN filtra componentes irrelevantes antes del modelado temporal, mejorando la predicción en registros de baja calidad.', 'In noisy ECG signals or with motion artifacts, the CNN stage filters irrelevant components before temporal modeling, improving prediction in low-quality recordings.'),
  },

  /* ─── Tradicionales ─── */
  RF: {
    fullName: 'Random Forest',
    summary: t('Ensemble de múltiples árboles de decisión entrenados sobre subconjuntos bootstrap del dataset, cuyas predicciones se promedian para reducir varianza.', 'Ensemble of multiple decision trees trained on bootstrap subsets of the dataset, whose predictions are averaged to reduce variance.'),
    mechanism: t('Se construyen 30 árboles independientes, cada uno entrenado con un subconjunto aleatorio de muestras (bagging) y un subconjunto de features (√p). Cada árbol hace una predicción y el resultado final es el promedio de todas las predicciones. La decorrelación entre árboles (por la aleatorización) reduce la varianza sin aumentar significativamente el sesgo.', '30 independent trees are built, each trained with a random subset of samples (bagging) and a feature subset (√p). Each tree makes a prediction and the final result is the average of all predictions. The decorrelation between trees (through randomization) reduces variance without significantly increasing bias.'),
    strengths: [
      t('Mejor generalización que un solo árbol (reduce overfitting)', 'Better generalization than a single tree (reduces overfitting)'),
      t('Robusto ante outliers y features irrelevantes', 'Robust against outliers and irrelevant features'),
      t('No requiere normalización de entrada', 'Does not require input normalization'),
      t('Mejor R² en Exp A multi-step (0.1603)', 'Best R² in Exp A multi-step (0.1603)'),
    ],
    tradeoffs: [
      t('No captura dependencias temporales largas (decisions are i.i.d.)', 'Does not capture long temporal dependencies (decisions are i.i.d.)'),
      t('Salida discreta → predicciones pueden ser escalonadas', 'Discrete output → predictions can be step-like'),
      t('Mayor uso de memoria con muchos árboles', 'Higher memory usage with many trees'),
    ],
    ecgRationale: t('El RF fue el mejor modelo tradicional en predicción multi-step (ventana de 5s → 1800 muestras). Su capacidad de manejar features de alta dimensionalidad sin normalización lo hace práctico para señales ECG con múltiples pipelines de preprocesamiento.', 'RF was the best traditional model in multi-step prediction (5s window → 1800 samples). Its ability to handle high-dimensional features without normalization makes it practical for ECG signals with multiple preprocessing pipelines.'),
  },
  MLP: {
    fullName: t('Perceptrón Multicapa', 'Multilayer Perceptron'),
    summary: t('Red neuronal feedforward con capas ocultas fully-connected que aprende mapeos no lineales entre entrada y salida mediante retropropagación.', 'Feedforward neural network with fully-connected hidden layers that learns non-linear mappings between input and output via backpropagation.'),
    mechanism: t('La entrada (ventana de latidos aplanada) pasa por dos capas ocultas (128 → 64 neuronas) con activación ReLU. Cada neurona computa una combinación lineal de sus entradas, aplica un sesgo y pasa el resultado por la función de activación. El optimizador Adam ajusta los pesos minimizando MSE con early stopping (15% validation). La red aprende representaciones intermedias no lineales de la señal.', 'The input (flattened beat window) passes through two hidden layers (128 → 64 neurons) with ReLU activation. Each neuron computes a linear combination of its inputs, applies a bias, and passes the result through the activation function. The Adam optimizer adjusts weights minimizing MSE with early stopping (15% validation). The network learns non-linear intermediate signal representations.'),
    strengths: [
      t('Aproximador universal de funciones (teorema de Cybenko)', 'Universal function approximator (Cybenko theorem)'),
      t('Rápido de entrenar con Adam solver', 'Fast to train with Adam solver'),
      t('Dispersión entre pacientes de 0.2448 en R² (Exp B), menor que DT y SVR_rbf', 'Across-patient dispersion of 0.2448 in R² (Exp B), lower than DT and SVR_rbf'),
    ],
    tradeoffs: [
      t('No modela dependencias secuenciales explícitamente', 'Does not model sequential dependencies explicitly'),
      t('Sensible a la escala de entrada (requiere normalización)', 'Sensitive to input scale (requires normalization)'),
      t('Capacidad limitada con features de alta dimensionalidad', 'Limited capacity with high-dimensional features'),
    ],
    ecgRationale: t('El MLP sirve como baseline neural: es la red más simple que puede aprender patrones no lineales del ECG. Su rendimiento (R²=0.5829 en Exp B) establece el umbral mínimo que los modelos recurrentes deben superar para justificar su mayor complejidad.', 'MLP serves as a neural baseline: it is the simplest network that can learn non-linear ECG patterns. Its performance (R²=0.5829 in Exp B) establishes the minimum threshold that recurrent models must exceed to justify their greater complexity.'),
  },
  SVR_rbf: {
    fullName: 'Support Vector Regression (kernel RBF)',
    summary: t('Regresor que busca un hiperplano en un espacio de alta dimensionalidad (kernel RBF) que maximiza el margen dentro de un tubo de tolerancia ε.', 'Regressor that seeks a hyperplane in a high-dimensional space (RBF kernel) that maximizes the margin within an ε-tolerance tube.'),
    mechanism: t('Mediante el kernel RBF K(x,x\') = exp(-γ||x-x\'||²), SVR proyecta los latidos a un espacio de dimensiones infinitas donde la relación puede ser lineal. Los vectores de soporte definen la frontera del tubo ε=0.01. El parámetro C=1.0 penaliza las violaciones del margen. Para predicción multi-paso se envuelve en MultiOutputRegressor (un SVR por muestra de salida).', 'Using the RBF kernel K(x,x\') = exp(-γ||x-x\'||²), SVR projects beats into an infinite-dimensional space where the relationship can be linear. Support vectors define the ε=0.01 tube boundary. Parameter C=1.0 penalizes margin violations. For multi-step prediction, it is wrapped in MultiOutputRegressor (one SVR per output sample).'),
    strengths: [
      t('Mejor R² en predicción one-beat-ahead (0.6454 en Exp B)', 'Best R² in one-beat-ahead prediction (0.6454 in Exp B)'),
      t('Robusto ante datos de alta dimensionalidad', 'Robust with high-dimensional data'),
      t('Regularización intrínseca vía margen', 'Intrinsic regularization via margin'),
    ],
    tradeoffs: [
      t('Escalabilidad O(n²~n³) con el número de muestras', 'Scalability O(n²~n³) with the number of samples'),
      t('MultiOutputRegressor necesario para predicción vectorial → lento', 'MultiOutputRegressor needed for vector prediction → slow'),
      t('Sensible a la selección de γ y C', 'Sensitive to γ and C selection'),
    ],
    ecgRationale: t('SVR-RBF destacó en predicción escalar de R-peaks individuales (one-beat-ahead). El kernel RBF captura similitudes no lineales entre morfologías de latidos, siendo efectivo para pacientes con patrones regulares.', 'SVR-RBF excelled in scalar prediction of individual R-peaks (one-beat-ahead). The RBF kernel captures non-linear similarities between beat morphologies, being effective for patients with regular patterns.'),
  },
  DT: {
    fullName: t('Decision Tree (Árbol de Decisión)', 'Decision Tree'),
    summary: t('Modelo que particiona recursivamente el espacio de features mediante umbrales óptimos, creando una estructura de árbol binario para regresión.', 'Model that recursively partitions the feature space using optimal thresholds, creating a binary tree structure for regression.'),
    mechanism: t('En cada nodo interno, el algoritmo busca la feature y el umbral que minimizan la varianza (MSE) de las particiones resultantes. La profundidad máxima (max_depth=8) limita la complejidad del árbol para evitar sobreajuste extremo. Las hojas almacenan el valor promedio de las muestras que caen en esa partición.', 'At each internal node, the algorithm searches for the feature and threshold that minimize variance (MSE) of the resulting partitions. Maximum depth (max_depth=8) limits tree complexity to avoid extreme overfitting. Leaves store the average value of samples falling in that partition.'),
    strengths: [
      t('Completamente interpretable (se puede visualizar cada decisión)', 'Fully interpretable (each decision can be visualized)'),
      t('Sin suposiciones sobre la distribución de datos', 'No assumptions about data distribution'),
      t('Entrenamiento e inferencia muy rápidos', 'Very fast training and inference'),
    ],
    tradeoffs: [
      t('Severo sobreajuste: gap train-test de 0.744 en R²', 'Severe overfitting: train-test gap of 0.744 in R²'),
      t('Alta varianza (pequeños cambios en datos → árbol diferente)', 'High variance (small data changes → different tree)'),
      t('Predicciones discretas/escalonadas', 'Discrete/step-like predictions'),
    ],
    ecgRationale: t('El DT sirve como referencia de interpretabilidad: sus reglas de decisión son auditables por clínicos. Sin embargo, su R² negativo en Exp A (-0.1989) confirma que la complejidad morfológica del ECG requiere modelos con mayor capacidad de generalización.', 'DT serves as an interpretability reference: its decision rules are auditable by clinicians. However, its negative R² in Exp A (-0.1989) confirms that ECG morphological complexity requires models with greater generalization capacity.'),
  },

  /* ─── LOPO (NB5B) ─── */
  GRU_base: {
    fullName: 'GRU Base (LOPO)',
    summary: t('Red GRU de 2 capas entrenada con el pool de latidos de 47 pacientes y evaluada en el paciente excluido (Leave-One-Patient-Out).', '2-layer GRU network trained with the beat pool from 47 patients and evaluated on the excluded patient (Leave-One-Patient-Out).'),
    mechanism: t('Arquitectura idéntica a la GRU de NB2 (128 → 64 unidades, Dropout 0.20, L2=1e-4) pero entrenada en modo cross-patient: para cada fold k, el modelo se entrena con ~9,400 pares de latidos de 47 pacientes (máx 200/paciente) y se evalúa en el paciente k. Gradient clipping (clipnorm=1.0) estabiliza el entrenamiento con datos heterogéneos.', 'Architecture identical to NB2 GRU (128 → 64 units, Dropout 0.20, L2=1e-4) but trained in cross-patient mode: for each fold k, the model trains with ~9,400 beat pairs from 47 patients (max 200/patient) and is evaluated on patient k. Gradient clipping (clipnorm=1.0) stabilizes training with heterogeneous data.'),
    strengths: [
      t('R² = 0.5249 ± 0.2938 en 48 pacientes', 'R² = 0.5249 ± 0.2938 across 48 patients'),
      t('Latencia de 0.274 ms por predicción', '0.274 ms latency per prediction'),
      t('No requiere datos del paciente objetivo para entrenar', 'Does not require target patient data for training'),
    ],
    tradeoffs: [
      t('Alta variabilidad inter-paciente (R² range: -0.30 a +0.93)', 'High inter-patient variability (R² range: -0.30 to +0.93)'),
      t('Rendimiento inferior al modelo intra-paciente (0.52 vs 0.72)', 'Lower performance than intra-patient model (0.52 vs 0.72)'),
    ],
    ecgRationale: t('GRU_base es el modelo baseline de generalización: entrena con diversidad de pacientes para predecir en uno jamás visto. Es la referencia contra la cual se miden las mejoras de fine-tuning y ensemble.', 'GRU_base is the generalization baseline model: it trains with patient diversity to predict on one never seen. It is the reference against which fine-tuning and ensemble improvements are measured.'),
  },
  CNN_GRU: {
    fullName: 'CNN-GRU (LOPO)',
    summary: t('Modelo híbrido CNN-GRU en protocolo cross-patient, donde las capas convolucionales extraen features morfológicas invariantes al paciente.', 'Hybrid CNN-GRU model in cross-patient protocol, where convolutional layers extract patient-invariant morphological features.'),
    mechanism: t('La misma arquitectura CNN-GRU de NB2 (Conv1D 64f → Conv1D 64f → BN → MaxPool → GRU 64 → Dense 256) entrenada en modo LOPO. Las capas CNN aprenden features locales compartidas entre pacientes (pendientes QRS generalizadas), mientras la GRU captura la dinámica temporal. En la variante fine-tuned (CNN_GRU_FT), 15 muestras del paciente objetivo refinan las últimas capas.', 'The same CNN-GRU architecture from NB2 (Conv1D 64f → Conv1D 64f → BN → MaxPool → GRU 64 → Dense 256) trained in LOPO mode. CNN layers learn shared local features across patients (generalized QRS slopes), while GRU captures temporal dynamics. In the fine-tuned variant (CNN_GRU_FT), 15 samples from the target patient refine the last layers.'),
    strengths: [
      t('R² = 0.5331 ± 0.2818 (mejor individual sin fine-tuning)', 'R² = 0.5331 ± 0.2818 (best individual without fine-tuning)'),
      t('Dispersión algo menor que GRU_base (R² std 0.2818 vs 0.2938 en Exp. 5)', 'Slightly lower dispersion than GRU_base (R² std 0.2818 vs 0.2938 in Exp. 5)'),
      t('Fine-tuning (+15 muestras): R² sube a 0.5349', 'Fine-tuning (+15 samples): R² rises to 0.5349'),
      t('Menor latencia que GRU_base (0.236 ms)', 'Lower latency than GRU_base (0.236 ms)'),
    ],
    tradeoffs: [
      t('Mayor complejidad de entrenamiento cross-patient', 'Higher cross-patient training complexity'),
      t('Fine-tuning marginal (+0.34%) comparado con BiGRU_MHA', 'Marginal fine-tuning (+0.34%) compared to BiGRU_MHA'),
    ],
    ecgRationale: t('Las capas CNN capturan patterns morfológicos universales del ECG (pico R, onda T) que son estables entre pacientes, haciendo al modelo más robusto en generalización cross-patient que una GRU pura.', 'CNN layers capture universal ECG morphological patterns (R peak, T wave) that are stable across patients, making the model more robust in cross-patient generalization than a pure GRU.'),
  },
  BiGRU_MHA: {
    fullName: 'Bidirectional GRU + Multi-Head Attention',
    summary: t('Modelo bidireccional con mecanismo de atención multi-cabeza que pondera la importancia de cada paso temporal para la predicción.', 'Bidirectional model with multi-head attention mechanism that weights the importance of each temporal step for prediction.'),
    mechanism: t('Una capa BiGRU (64+64 unidades) procesa la secuencia en ambas direcciones, generando una representación que combina contexto pasado y futuro (dentro del lookback). Luego, Multi-Head Attention (8 cabezas) pondera dinámicamente qué pasos temporales son más informativos. La variante fine-tuned (BiGRU_MHA_FT) muestra la mayor ganancia relativa (+4.15% R²) al adaptarse al paciente específico.', 'A BiGRU layer (64+64 units) processes the sequence in both directions, generating a representation that combines past and future context (within the lookback). Then, Multi-Head Attention (8 heads) dynamically weights which temporal steps are most informative. The fine-tuned variant (BiGRU_MHA_FT) shows the highest relative gain (+4.15% R²) when adapting to the specific patient.'),
    strengths: [
      t('Mayor ganancia con fine-tuning (+4.15% vs +0.34% CNN_GRU)', 'Highest fine-tuning gain (+4.15% vs +0.34% CNN_GRU)'),
      t('Atención multi-cabeza (8 cabezas) que pondera los pasos del lookback', 'Multi-head attention (8 heads) weighting the lookback steps'),
      t('Procesamiento bidireccional captura contexto completo', 'Bidirectional processing captures full context'),
    ],
    tradeoffs: [
      t('Mayor varianza en R² (0.3443 std) → menos estable', 'Higher R² variance (0.3443 std) → less stable'),
      t('R² = 0.4386 sin fine-tuning (menor que GRU_base)', 'R² = 0.4386 without fine-tuning (lower than GRU_base)'),
      t('8 pacientes con R² < 0 (predicción peor que persistencia)', '8 patients with R² < 0 (prediction worse than persistence)'),
    ],
    ecgRationale: t('La atención multi-cabeza permite al modelo enfocarse en los latidos más relevantes del lookback, especialmente útil en pacientes con arritmias intermitentes donde no todos los latidos previos son igualmente informativos.', 'Multi-head attention allows the model to focus on the most relevant beats in the lookback, especially useful in patients with intermittent arrhythmias where not all previous beats are equally informative.'),
  },
  Ensemble: {
    fullName: t('Ensemble (Promedio de 3 modelos)', 'Ensemble (Average of 3 models)'),
    summary: t('Combinación de GRU_base + CNN_GRU + BiGRU_MHA mediante promedio simple de predicciones, con variante fine-tuned que aplica adaptación individual.', 'Combination of GRU_base + CNN_GRU + BiGRU_MHA through simple prediction averaging, with fine-tuned variant that applies individual adaptation.'),
    mechanism: t('Para cada paciente, las predicciones de los 3 modelos base se promedian elemento a elemento: ŷ = (ŷ_GRU + ŷ_CNN_GRU + ŷ_BiGRU_MHA) / 3. Esto reduce la varianza de predicción (diversidad de errores se cancela). En la variante fine-tuned (Ensemble_FT), cada modelo componente se adapta con 15 muestras del paciente antes de promediar.', 'For each patient, predictions from the 3 base models are averaged element-wise: ŷ = (ŷ_GRU + ŷ_CNN_GRU + ŷ_BiGRU_MHA) / 3. This reduces prediction variance (error diversity cancels out). In the fine-tuned variant (Ensemble_FT), each component model adapts with 15 patient samples before averaging.'),
    strengths: [
      t('Mejor R² global: 0.5484 ± 0.2724 (Ensemble_FT)', 'Best global R²: 0.5484 ± 0.2724 (Ensemble_FT)'),
      t('Menor varianza entre pacientes (σ=0.2724 vs 0.2938)', 'Lower inter-patient variance (σ=0.2724 vs 0.2938)'),
      t('RMSE más bajo de todos: 0.6411', 'Lowest RMSE of all: 0.6411'),
      t('La dispersión más baja del Exp. 5 junto a su variante FT (R² std 0.2727 y 0.2724)', 'The lowest dispersion in Exp. 5 alongside its FT variant (R² std 0.2727 and 0.2724)'),
    ],
    tradeoffs: [
      t('3× costo computacional en inferencia', '3× computational cost in inference'),
      t('Requiere mantener 3 modelos en memoria', 'Requires keeping 3 models in memory'),
      t('Mejora marginal sobre CNN_GRU individual (+2.5%)', 'Marginal improvement over individual CNN_GRU (+2.5%)'),
    ],
    ecgRationale: t('El ensemble combina la estabilidad de CNN_GRU, la velocidad de GRU_base y la capacidad adaptativa de BiGRU_MHA. Fue el modelo más consistente en producir predicciones útiles para el mayor número de pacientes (44/48 con R² > 0).', 'The ensemble combines CNN_GRU stability, GRU_base speed, and BiGRU_MHA adaptive capacity. It was the most consistent model in producing useful predictions for the greatest number of patients (44/48 with R² > 0).'),
  },
  CNN_GRU_ATTN: {
    fullName: 'CNN-GRU with Temporal Attention (Multi-Step)',
    summary: t('Arquitectura híbrida avanzada que combina CNN dilatadas, GRU apiladas y un mecanismo de atención temporal para forecasting multi-step (H=3) en 123 pacientes de MIT-BIH + INCART.', 'Advanced hybrid architecture combining dilated CNN, stacked GRU, and a temporal attention mechanism for multi-step forecasting (H=3) across 123 patients from MIT-BIH + INCART.'),
    mechanism: t('La entrada (5 latidos × 257 features: 256 muestras + RR normalizado) pasa por una Conv1D(64, k=5) estándar seguida de dos Conv1D(128, k=3) con dilatación progresiva (d=2, d=4) que amplían el campo receptivo sin perder resolución. MaxPool1D(2) comprime la secuencia. Dos capas GRU apiladas (128 → 64 unidades) modelan la dinámica temporal. Un mecanismo de Temporal Attention (Bahdanau-style) aprende pesos de relevancia por cada paso temporal, colapsando la secuencia en un vector de contexto. Una conexión residual suma la predicción delta (Dense → Reshape) con el último latido de entrada replicado H veces, estabilizando el entrenamiento. La loss ECG combina MSE (50%), MAE (30%) y Slope-MSE (20%) para preservar la morfología de derivadas.', 'The input (5 beats × 257 features: 256 samples + normalized RR) passes through a standard Conv1D(64, k=5) followed by two Conv1D(128, k=3) with progressive dilation (d=2, d=4) that expand the receptive field without losing resolution. MaxPool1D(2) compresses the sequence. Two stacked GRU layers (128 → 64 units) model temporal dynamics. A Temporal Attention mechanism (Bahdanau-style) learns relevance weights per temporal step, collapsing the sequence into a context vector. A residual connection adds the delta prediction (Dense → Reshape) to the last input beat replicated H times, stabilizing training. The ECG loss combines MSE (50%), MAE (30%), and Slope-MSE (20%) to preserve derivative morphology.'),
    strengths: [
      t('R² = 0.6734 ± 0.2825 en 123 pacientes (MIT-BIH + INCART)', 'R² = 0.6734 ± 0.2825 across 123 patients (MIT-BIH + INCART)'),
      t('Forecast Score = 0.7073 (métrica compuesta de calidad predictiva)', 'Forecast Score = 0.7073 (composite predictive quality metric)'),
      t('Shape Correlation = 0.8383 · alta fidelidad morfológica', 'Shape Correlation = 0.8383 · high morphological fidelity'),
      t('Fine-tuning con 30 latidos: R² sube a 0.6797 (+0.93%), y mejora en 114 de 123 pacientes', 'Fine-tuning with 30 beats: R² rises to 0.6797 (+0.93%), improving 114 of 123 patients'),
      t('Incluye conexión residual en la predicción multi-paso', 'Includes a residual connection in the multi-step prediction'),
      t('Degradación temporal controlada: Slope MSE = 0.0223', 'Controlled temporal degradation: Slope MSE = 0.0223'),
    ],
    tradeoffs: [
      t('Entrenamiento extenso: ~774 s por pliegue en GPU (30 épocas)', 'Extensive training: ~774 s per fold on GPU (30 epochs)'),
      t('Alta variabilidad inter-paciente (σ=0.2825): 5 pacientes de INCART con R² < 0', 'High inter-patient variability (σ=0.2825): 5 INCART patients with R² < 0'),
      t('Amp Error = 0.5653 indica desviación en amplitud de picos', 'Amp Error = 0.5653 indicates peak amplitude deviation'),
      t('Pacientes INCART con baja calidad de señal muestran R² < 0', 'INCART patients with low signal quality show R² < 0'),
    ],
    ecgRationale: t('El CNN-GRU-ATTN representa la evolución final del pipeline: las CNN dilatadas capturan patrones morfológicos multi-escala (desde pendientes QRS locales hasta segmentos ST completos), la atención temporal focaliza los latidos más informativos del lookback, y la conexión residual asegura que la predicción multi-paso no diverja. Es el único modelo evaluado en el pool completo de 123 pacientes (MIT-BIH + INCART), demostrando generalización cross-database.', 'CNN-GRU-ATTN represents the final pipeline evolution: dilated CNNs capture multi-scale morphological patterns (from local QRS slopes to complete ST segments), temporal attention focuses on the most informative lookback beats, and the residual connection ensures multi-step prediction does not diverge. It is the only model evaluated on the full pool of 123 patients (MIT-BIH + INCART), demonstrating cross-database generalization.'),
  },
});

/* ================================================================
   HYPERPARAMETERS
   ================================================================ */
const getHyperparams = (t: TFn): Record<AnyModel, { label: string; value: string }[]> => ({
  LSTM: [
    { label: t('Capas recurrentes', 'Recurrent layers'), value: '2 (stacked)' },
    { label: t('Unidades/capa', 'Units/layer'),     value: '128' },
    { label: 'Dropout',           value: '0.20' },
    { label: 'Optimizer',         value: 'Adam (lr=0.001)' },
    { label: 'Batch size',        value: '64' },
    { label: 'Epochs',            value: '80 (EarlyStopping p=10)' },
    { label: t('Entrada', 'Input'),           value: 'LB × 256 pts' },
    { label: t('Pérdida', 'Loss'),           value: 'MSE' },
  ],
  GRU: [
    { label: t('Capas recurrentes', 'Recurrent layers'), value: '2 (stacked)' },
    { label: t('Unidades/capa', 'Units/layer'),     value: '128' },
    { label: 'Dropout',           value: '0.20' },
    { label: 'Optimizer',         value: 'Adam (lr=0.001)' },
    { label: 'Batch size',        value: '64' },
    { label: 'Epochs',            value: '70 (EarlyStopping p=10)' },
    { label: t('Entrada', 'Input'),           value: 'LB × 256 pts' },
    { label: t('Pérdida', 'Loss'),           value: 'MSE' },
  ],
  'CNN-GRU': [
    { label: t('Capas Conv1D', 'Conv1D layers'),      value: '2 (64 filtros, k=3)' },
    { label: 'BatchNorm + ReLU',  value: t('Tras cada Conv', 'After each Conv') },
    { label: 'MaxPool1D',         value: '2' },
    { label: t('Capas GRU', 'GRU layers'),         value: '1 (64 unidades)' },
    { label: 'Dropout',           value: '0.20' },
    { label: 'Optimizer',         value: 'Adam (lr=0.001)' },
    { label: 'Batch size',        value: '64' },
    { label: 'Epochs',            value: '60 (EarlyStopping p=10)' },
    { label: t('Pérdida', 'Loss'),           value: 'MSE' },
  ],
  RF: [
    { label: 'n_estimators',      value: '30' },
    { label: 'max_depth',         value: '10' },
    { label: 'max_features',      value: '√p (sqrt)' },
    { label: 'min_samples_leaf',  value: '2' },
    { label: 'Criterion',         value: 'squared_error' },
    { label: 'Bootstrap',         value: 'True' },
    { label: 'Framework',         value: 'scikit-learn' },
  ],
  MLP: [
    { label: t('Capas ocultas', 'Hidden layers'),     value: '128 → 64' },
    { label: t('Activación', 'Activation'),        value: 'ReLU' },
    { label: 'Solver',            value: 'Adam' },
    { label: 'max_iter',          value: '300' },
    { label: 'Early stopping',    value: 'True (val=15%)' },
    { label: 'Framework',         value: 'scikit-learn' },
  ],
  SVR_rbf: [
    { label: 'Kernel',            value: 'RBF (radial basis function)' },
    { label: t('C (penalización)', 'C (penalty)'),   value: '1.0' },
    { label: 'γ (gamma)',          value: 'scale' },
    { label: 'ε (epsilon)',        value: '0.01' },
    { label: 'Multi-output',      value: 'MultiOutputRegressor' },
    { label: 'Framework',         value: 'scikit-learn' },
  ],
  DT: [
    { label: 'max_depth',         value: '8' },
    { label: 'Criterion',         value: 'squared_error' },
    { label: 'Splitter',          value: 'best' },
    { label: 'min_samples_split', value: '2 (default)' },
    { label: 'Framework',         value: 'scikit-learn' },
  ],
  GRU_base: [
    { label: t('Capas', 'Layers'),             value: 'GRU(128) → GRU(64)' },
    { label: 'Dropout',           value: '0.20' },
    { label: t('Regularización', 'Regularization'),    value: 'L2=1e-4, clipnorm=1.0' },
    { label: 'Optimizer',         value: 'Adam (lr=1e-3)' },
    { label: 'Batch size',        value: '32' },
    { label: 'Epochs',            value: '100 (ES p=15, ReduceLR p=5)' },
    { label: 'Val split',         value: '15%' },
    { label: 'Lookback',          value: t('5 latidos', '5 beats') },
    { label: 'Fine-tune',         value: t('15 muestras del paciente', '15 patient samples') },
  ],
  CNN_GRU: [
    { label: 'CNN',               value: 'Conv1D(64,3) × 2 + BN + MaxPool' },
    { label: 'GRU',               value: t('64 unidades', '64 units') },
    { label: 'Dropout',           value: '0.20' },
    { label: t('Regularización', 'Regularization'),    value: 'L2=1e-4, clipnorm=1.0' },
    { label: 'Optimizer',         value: 'Adam (lr=1e-3)' },
    { label: 'Batch size',        value: '32' },
    { label: 'Epochs',            value: '100 (ES p=15, ReduceLR p=5)' },
    { label: 'Fine-tune',         value: t('15 muestras del paciente', '15 patient samples') },
  ],
  BiGRU_MHA: [
    { label: 'BiGRU',             value: t('64 + 64 unidades (bidirectional)', '64 + 64 units (bidirectional)') },
    { label: 'Attention',         value: t('Multi-Head (8 cabezas)', 'Multi-Head (8 heads)') },
    { label: 'Dropout',           value: '0.20' },
    { label: t('Regularización', 'Regularization'),    value: 'L2=1e-4, clipnorm=1.0' },
    { label: 'Optimizer',         value: 'Adam (lr=1e-3)' },
    { label: 'Batch size',        value: '32' },
    { label: 'Epochs',            value: '100 (ES p=15, ReduceLR p=5)' },
    { label: 'Fine-tune',         value: t('15 muestras (+4.15% R²)', '15 samples (+4.15% R²)') },
  ],
  Ensemble: [
    { label: t('Componentes', 'Components'),       value: 'GRU_base + CNN_GRU + BiGRU_MHA' },
    { label: t('Combinación', 'Combination'),       value: t('Promedio aritmético', 'Arithmetic average') },
    { label: 'Fine-tune',         value: t('Cada componente con 15 muestras', 'Each component with 15 samples') },
    { label: t('Pacientes evaluados', 'Evaluated patients'), value: '48 (LOPO completo)' },
    { label: t('Mejor R²', 'Best R²'),          value: '0.5484 ± 0.2724 (FT)' },
    { label: t('Mejor RMSE', 'Best RMSE'),        value: '0.6411 (FT)' },
  ],
  CNN_GRU_ATTN: [
    { label: 'CNN', value: 'Conv1D(64,5) + Conv1D(128,3,d=2) + Conv1D(128,3,d=4)' },
    { label: 'Pooling', value: 'MaxPooling1D(2)' },
    { label: 'GRU', value: t('128 → 64 unidades (stacked)', '128 → 64 units (stacked)') },
    { label: 'Attention', value: t('Temporal (Bahdanau, aprendida)', 'Temporal (Bahdanau, learned)') },
    { label: 'Residual', value: t('last_beat × H + δ_pred', 'last_beat × H + δ_pred') },
    { label: 'Dropout', value: '0.30' },
    { label: 'Optimizer', value: 'Adam (lr=1e-3)' },
    { label: 'Batch size', value: '32' },
    { label: 'Epochs', value: '30 (ES p=15, ReduceLR p=5)' },
    { label: t('Pérdida', 'Loss'), value: 'ECG Loss (0.5·MSE + 0.3·MAE + 0.2·Slope)' },
    { label: t('Entrada', 'Input'), value: '5 × 257 (256 pts + RR)' },
    { label: t('Salida', 'Output'), value: 'H=3 × 256 pts (multi-step)' },
    { label: 'Fine-tune', value: t('30 latidos, 5 epochs, lr=1e-4', '30 beats, 5 epochs, lr=1e-4') },
  ],
});

/* ================================================================
   TRAINING CONFIGS per category
   ================================================================ */
const getTrainDeep = (t: TFn) => [
  { label: 'Dataset',        value: t('MIT-BIH Arrhythmia Database (48 registros, 30 min c/u)', 'MIT-BIH Arrhythmia Database (48 records, 30 min each)') },
  { label: t('Frecuencia', 'Frequency'),     value: '360 Hz' },
  { label: t('Segmentación', 'Segmentation'),   value: t('Latido a latido (R-peak → 256 muestras resampleadas)', 'Beat-to-beat (R-peak → 256 resampled samples)') },
  { label: t('Normalización', 'Normalization'),  value: t('Z-score por paciente (μ=0, σ=1)', 'Z-score per patient (μ=0, σ=1)') },
  { label: t('Filtros', 'Filters'),        value: 'F_N+MED, F_MED, F_N+PB+MED' },
  { label: 'Lookback',       value: t('3, 5, 10 latidos de contexto', '3, 5, 10 context beats') },
  { label: 'Split',          value: t('80% / 20% temporal (sin data leakage)', '80% / 20% temporal (no data leakage)') },
  { label: 'Framework',      value: 'TensorFlow / Keras 2.x' },
  { label: 'Hardware',       value: 'Google Colab GPU (T4 / A100)' },
];
const getTrainTrad = (t: TFn) => [
  { label: 'Dataset',        value: t('MIT-BIH Arrhythmia Database (48 registros)', 'MIT-BIH Arrhythmia Database (48 records)') },
  { label: 'Exp A (multi-step)', value: t('Ventana 5s (1800 pts) → pred. 1/3/5s', '5s window (1800 pts) → pred. 1/3/5s') },
  { label: 'Exp B (one-beat)',   value: t('Lookback 3/5/10 latidos → pred. 1 latido (256 pts)', 'Lookback 3/5/10 beats → pred. 1 beat (256 pts)') },
  { label: t('Pipelines filtro', 'Filter pipelines'), value: t('7 configuraciones (F_SIN, F_N, F_PB, F_N+PB, F_MED, F_N+MED, F_N+PB+MED)', '7 configurations (F_SIN, F_N, F_PB, F_N+PB, F_MED, F_N+MED, F_N+PB+MED)') },
  { label: 'Split',          value: t('80% / 20% temporal por paciente', '80% / 20% temporal per patient') },
  { label: t('Evaluaciones', 'Evaluations'),   value: t('13,104 entrenamientos individuales (7,056 Exp A + 6,048 Exp B)', '13,104 individual trainings (7,056 Exp A + 6,048 Exp B)') },
  { label: 'Framework',      value: 'scikit-learn' },
  { label: t('Métricas', 'Metrics'),       value: 'R², MSE, RMSE, MAE, DTW, latencia' },
];
const getTrainLopo = (t: TFn) => [
  { label: t('Protocolo', 'Protocol'),      value: t('Leave-One-Patient-Out (123 pacientes, MIT-BIH + INCART)', 'Leave-One-Patient-Out (123 patients, MIT-BIH + INCART)') },
  { label: t('Entrenamiento', 'Training'),  value: t('122 pacientes → beat-pool (máx 400 pares/pac)', '122 patients → beat-pool (max 400 pairs/pat)') },
  { label: 'Test',           value: t('Todos los latidos del paciente excluido', 'All beats from excluded patient') },
  { label: t('Entrada', 'Input'),        value: t('5 latidos × 257 features (256 pts + RR norm)', '5 beats × 257 features (256 pts + norm RR)') },
  { label: t('Filtro', 'Filter'),         value: t('Filtro rápido (Notch 60Hz + SOS Bandpass 0.5-40Hz + Detrend)', 'Fast filter (Notch 60Hz + SOS Bandpass 0.5-40Hz + Detrend)') },
  { label: 'Callbacks',      value: 'EarlyStopping (p=15)' },
  { label: 'Fine-tuning',    value: t('30 latidos calibración, 5 epochs, lr=1e-4', '30 calibration beats, 5 epochs, lr=1e-4') },
  { label: 'Framework',      value: 'TensorFlow / Keras 2.x (Google Colab)' },
];

const getTrainByCat = (t: TFn): Record<Category, { label: string; value: string }[]> => ({
  deep: getTrainDeep(t), traditional: getTrainTrad(t), lopo: getTrainLopo(t),
});

/* ================================================================
   ARCHITECTURE DIAGRAM (Deep Learning only)
   ================================================================ */
type NodeType = 'input' | 'recurrent' | 'conv' | 'dense' | 'output' | 'norm' | 'attn';
interface ArchNode { x: number; y: number; w: number; h: number; label: string; sub: string; type: NodeType }

const DEEP_ARCHS: Record<DeepModel, { nodes: ArchNode[]; width: number }> = {
  LSTM: {
    width: 660,
    nodes: [
      { x: 40, y: 50, w: 80, h: 60, label: 'Input', sub: 'LB × 256', type: 'input' },
      { x: 170, y: 50, w: 80, h: 60, label: 'LSTM', sub: '128 units', type: 'recurrent' },
      { x: 280, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 360, y: 50, w: 80, h: 60, label: 'LSTM', sub: '128 units', type: 'recurrent' },
      { x: 470, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 540, y: 50, w: 70, h: 60, label: 'Dense', sub: '64 → ReLU', type: 'dense' },
      { x: 640, y: 50, w: 70, h: 60, label: 'Output', sub: '256', type: 'output' },
    ],
  },
  GRU: {
    width: 660,
    nodes: [
      { x: 40, y: 50, w: 80, h: 60, label: 'Input', sub: 'LB × 256', type: 'input' },
      { x: 170, y: 50, w: 80, h: 60, label: 'GRU', sub: '128 units', type: 'recurrent' },
      { x: 280, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 360, y: 50, w: 80, h: 60, label: 'GRU', sub: '128 units', type: 'recurrent' },
      { x: 470, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 540, y: 50, w: 70, h: 60, label: 'Dense', sub: '64 → ReLU', type: 'dense' },
      { x: 640, y: 50, w: 70, h: 60, label: 'Output', sub: '256', type: 'output' },
    ],
  },
  'CNN-GRU': {
    width: 820,
    nodes: [
      { x: 30, y: 50, w: 70, h: 60, label: 'Input', sub: 'LB × 256', type: 'input' },
      { x: 130, y: 50, w: 70, h: 60, label: 'Conv1D', sub: '64 f, k=3', type: 'conv' },
      { x: 220, y: 40, w: 56, h: 24, label: 'BN+ReLU', sub: '', type: 'norm' },
      { x: 300, y: 50, w: 70, h: 60, label: 'Conv1D', sub: '64 f, k=3', type: 'conv' },
      { x: 390, y: 40, w: 56, h: 24, label: 'BN+ReLU', sub: '', type: 'norm' },
      { x: 470, y: 40, w: 56, h: 24, label: 'MaxPool', sub: '2', type: 'norm' },
      { x: 560, y: 50, w: 70, h: 60, label: 'GRU', sub: '64 units', type: 'recurrent' },
      { x: 650, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 730, y: 50, w: 70, h: 60, label: 'Dense', sub: '256', type: 'dense' },
      { x: 820, y: 50, w: 60, h: 60, label: 'Output', sub: '256', type: 'output' },
    ],
  },
};

const LOPO_ARCHS: Record<LopoModel, { nodes: ArchNode[]; width: number }> = {
  GRU_base: {
    width: 660,
    nodes: [
      { x: 40, y: 50, w: 80, h: 60, label: 'Input', sub: '5 × 256', type: 'input' },
      { x: 170, y: 50, w: 80, h: 60, label: 'GRU', sub: '128 units', type: 'recurrent' },
      { x: 280, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 360, y: 50, w: 80, h: 60, label: 'GRU', sub: '64 units', type: 'recurrent' },
      { x: 470, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 540, y: 50, w: 70, h: 60, label: 'Dense', sub: '256', type: 'dense' },
      { x: 640, y: 50, w: 70, h: 60, label: 'Output', sub: '256', type: 'output' },
    ],
  },
  CNN_GRU: {
    width: 820,
    nodes: [
      { x: 30, y: 50, w: 70, h: 60, label: 'Input', sub: '5 × 256', type: 'input' },
      { x: 130, y: 50, w: 70, h: 60, label: 'Conv1D', sub: '64 f, k=3', type: 'conv' },
      { x: 220, y: 40, w: 56, h: 24, label: 'BN+ReLU', sub: '', type: 'norm' },
      { x: 300, y: 50, w: 70, h: 60, label: 'Conv1D', sub: '64 f, k=3', type: 'conv' },
      { x: 390, y: 40, w: 56, h: 24, label: 'BN+ReLU', sub: '', type: 'norm' },
      { x: 470, y: 40, w: 56, h: 24, label: 'MaxPool', sub: '2', type: 'norm' },
      { x: 560, y: 50, w: 70, h: 60, label: 'GRU', sub: '64 units', type: 'recurrent' },
      { x: 650, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 730, y: 50, w: 70, h: 60, label: 'Dense', sub: '256', type: 'dense' },
      { x: 820, y: 50, w: 60, h: 60, label: 'Output', sub: '256', type: 'output' },
    ],
  },
  BiGRU_MHA: {
    width: 820,
    nodes: [
      { x: 30, y: 50, w: 70, h: 60, label: 'Input', sub: '5 × 256', type: 'input' },
      { x: 140, y: 50, w: 80, h: 60, label: 'BiGRU', sub: '64+64', type: 'recurrent' },
      { x: 250, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 340, y: 50, w: 100, h: 60, label: 'MH-Attn', sub: '8 heads', type: 'attn' },
      { x: 480, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.20', type: 'norm' },
      { x: 570, y: 50, w: 70, h: 60, label: 'Dense', sub: '128', type: 'dense' },
      { x: 680, y: 50, w: 70, h: 60, label: 'Dense', sub: '256', type: 'dense' },
      { x: 780, y: 50, w: 60, h: 60, label: 'Output', sub: '256', type: 'output' },
    ],
  },
  Ensemble: {
    width: 700,
    nodes: [
      { x: 30, y: 20, w: 90, h: 40, label: 'GRU_base', sub: 'ŷ₁', type: 'recurrent' },
      { x: 30, y: 70, w: 90, h: 40, label: 'CNN_GRU', sub: 'ŷ₂', type: 'conv' },
      { x: 30, y: 120, w: 90, h: 40, label: 'BiGRU_MHA', sub: 'ŷ₃', type: 'attn' },
      { x: 220, y: 60, w: 100, h: 50, label: 'Promedio', sub: '(ŷ₁+ŷ₂+ŷ₃)/3', type: 'dense' },
      { x: 420, y: 60, w: 90, h: 50, label: 'Fine-tune', sub: '15 muestras', type: 'norm' },
      { x: 600, y: 60, w: 80, h: 50, label: 'Output', sub: '256', type: 'output' },
    ],
  },
  CNN_GRU_ATTN: {
    width: 980,
    nodes: [
      { x: 20, y: 50, w: 70, h: 60, label: 'Input', sub: '5 × 257', type: 'input' },
      { x: 110, y: 50, w: 70, h: 60, label: 'Conv1D', sub: '64f, k=5', type: 'conv' },
      { x: 195, y: 40, w: 56, h: 24, label: 'BN+ReLU', sub: '', type: 'norm' },
      { x: 270, y: 50, w: 76, h: 60, label: 'Conv1D', sub: '128f,k=3,d=2', type: 'conv' },
      { x: 365, y: 50, w: 76, h: 60, label: 'Conv1D', sub: '128f,k=3,d=4', type: 'conv' },
      { x: 460, y: 40, w: 56, h: 24, label: 'MaxPool', sub: '2', type: 'norm' },
      { x: 535, y: 50, w: 65, h: 60, label: 'GRU', sub: '128 u', type: 'recurrent' },
      { x: 615, y: 50, w: 65, h: 60, label: 'GRU', sub: '64 u', type: 'recurrent' },
      { x: 700, y: 50, w: 80, h: 60, label: 'T-Attn', sub: 'Bahdanau', type: 'attn' },
      { x: 800, y: 40, w: 50, h: 24, label: 'Dropout', sub: '0.30', type: 'norm' },
      { x: 870, y: 50, w: 60, h: 60, label: 'Dense', sub: '128', type: 'dense' },
      { x: 950, y: 50, w: 70, h: 60, label: 'Output', sub: 'H×256', type: 'output' },
    ],
  },
};

function ArchDiagram({ nodes, width, color }: { nodes: ArchNode[]; width: number; color: string }) {
  const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    input:     { bg: `${color}08`, border: `${color}25`, text: color },
    recurrent: { bg: `${color}14`, border: `${color}50`, text: color },
    conv:      { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
    dense:     { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', text: '#3b82f6' },
    output:    { bg: `${color}08`, border: `${color}25`, text: color },
    norm:      { bg: 'var(--surface)', border: 'var(--border)', text: 'var(--text-muted)' },
    attn:      { bg: 'rgba(29,78,216,0.1)', border: 'rgba(29,78,216,0.4)', text: '#1d4ed8' },
  };
  const H = 180;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${width + 40} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <marker id="arch-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <path d="M0,0 L7,2.5 L0,5 Z" fill="var(--text-muted)" opacity="0.4" />
        </marker>
      </defs>
      {nodes.map((n, i) => {
        const tc = TYPE_COLORS[n.type] || TYPE_COLORS.norm;
        const cx = n.x + n.w / 2;
        const cy = n.y + n.h / 2;
        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={nodes[i - 1].x + nodes[i - 1].w + 4}
                y1={nodes[i - 1].y + nodes[i - 1].h / 2}
                x2={n.x - 4} y2={cy}
                stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} markerEnd="url(#arch-arrow)"
              />
            )}
            <rect x={n.x} y={n.y} width={n.w} height={n.h}
              rx={n.type === 'norm' ? 4 : 8}
              fill={tc.bg} stroke={tc.border} strokeWidth={1} />
            <text x={cx} y={n.type === 'norm' ? cy + 1 : cy - 4} textAnchor="middle"
              fill={tc.text} fontFamily="Inter, system-ui" fontSize={n.type === 'norm' ? 8 : 10} fontWeight={600}>
              {n.label}
            </text>
            {n.sub && n.type !== 'norm' && (
              <text x={cx} y={cy + 12} textAnchor="middle"
                fill="var(--text-muted)" fontFamily="DM Mono, monospace" fontSize={8}>{n.sub}</text>
            )}
            {n.sub && n.type === 'norm' && (
              <text x={cx} y={n.y + n.h + 10} textAnchor="middle"
                fill="var(--text-muted)" fontFamily="DM Mono, monospace" fontSize={7}>{n.sub}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ================================================================
   TRADITIONAL MODEL DIAGRAM (conceptual)
   ================================================================ */
function TraditionalDiagram({ model, color, t }: { model: TraditionalModel; color: string; t: TFn }) {
  if (model === 'RF') {
    return (
      <svg
        width="100%"
        height="190"
        viewBox="0 0 520 190"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label={t(
          'Diagrama: la entrada alimenta treinta arboles en paralelo y sus salidas se promedian',
          'Diagram: the input feeds thirty parallel trees whose outputs are averaged',
        )}
      >
        {/* Entrada, a media altura. */}
        <rect x={8} y={72} width={86} height={46} rx={6} fill={`${color}10`} stroke={`${color}40`} />
        <text x={51} y={92} textAnchor="middle" fill={color} fontFamily="Inter" fontSize={10} fontWeight={600}>Input</text>
        <text x={51} y={106} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={8}>LB x 256</text>

        {/* Los arboles, en columna: asi cada linea llega a una altura propia y
            ninguna se monta sobre otra. La ultima fila resume los 26 restantes. */}
        {[0, 1, 2, 3, 4].map((i) => {
          const ty = 14 + i * 34;          // centro vertical de cada arbol
          const etiqueta = i < 4 ? `Tree ${i + 1}` : '... x26';
          return (
            <g key={i}>
              <line
                x1={94} y1={95} x2={186} y2={ty + 13}
                stroke="var(--text-muted)" strokeWidth={0.9} opacity={0.35}
              />
              <rect
                x={186} y={ty} width={104} height={26} rx={5}
                fill={`${color}08`} stroke={`${color}30`}
              />
              <text
                x={238} y={ty + 17} textAnchor="middle"
                fill={i < 4 ? color : 'var(--text-muted)'}
                fontFamily="DM Mono" fontSize={9} fontWeight={600}
              >
                {etiqueta}
              </text>
              <line
                x1={290} y1={ty + 13} x2={382} y2={95}
                stroke="var(--text-muted)" strokeWidth={0.9} opacity={0.22}
              />
            </g>
          );
        })}

        {/* Promedio y salida. */}
        <rect x={382} y={72} width={102} height={46} rx={6} fill="var(--accent-bg)" stroke="var(--accent-border)" />
        <text x={433} y={92} textAnchor="middle" fill="var(--text)" fontFamily="Inter" fontSize={10} fontWeight={600}>
          {t('Promedio', 'Average')}
        </text>
        <text x={433} y={106} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={8}>256</text>
      </svg>
    );
  }
  if (model === 'MLP') {
    const layers = [
      { x: 40, label: 'Input', sub: 'LB × 256', dots: 6 },
      { x: 180, label: '128', sub: 'ReLU', dots: 5 },
      { x: 320, label: '64', sub: 'ReLU', dots: 4 },
      { x: 460, label: 'Output', sub: '256', dots: 6 },
    ];
    return (
      <svg width="100%" height="140" viewBox="0 0 560 140" style={{ overflow: 'visible' }}>
        {layers.map((l, li) => (
          <g key={li}>
            <text x={l.x + 20} y={15} textAnchor="middle" fill={li === 0 || li === layers.length - 1 ? color : '#3b82f6'} fontFamily="Inter" fontSize={9} fontWeight={600}>{l.label}</text>
            <text x={l.x + 20} y={130} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>{l.sub}</text>
            {Array.from({length: l.dots}).map((_, di) => {
              const cy = 28 + di * (90 / (l.dots - 1));
              return (
                <g key={di}>
                  <circle cx={l.x + 20} cy={cy} r={6} fill={li === 0 || li === layers.length - 1 ? `${color}18` : 'rgba(59,130,246,0.12)'} stroke={li === 0 || li === layers.length - 1 ? `${color}40` : 'rgba(59,130,246,0.3)'} />
                  {li > 0 && Array.from({length: layers[li-1].dots}).map((_, pdi) => {
                    const py = 28 + pdi * (90 / (layers[li-1].dots - 1));
                    return <line key={pdi} x1={layers[li-1].x + 26} y1={py} x2={l.x + 14} y2={cy} stroke="var(--text-muted)" strokeWidth={0.3} opacity={0.25} />;
                  })}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    );
  }
  if (model === 'SVR_rbf') {
    return (
      <svg width="100%" height="120" viewBox="0 0 600 120" style={{ overflow: 'visible' }}>
        <rect x={20} y={35} width={80} height={50} rx={8} fill={`${color}10`} stroke={`${color}40`} />
        <text x={60} y={55} textAnchor="middle" fill={color} fontFamily="Inter" fontSize={10} fontWeight={600}>Input</text>
        <text x={60} y={69} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={8}>x ∈ ℝⁿ</text>
        <line x1={100} y1={60} x2={145} y2={60} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />
        <rect x={150} y={30} width={110} height={60} rx={8} fill="rgba(29,78,216,0.08)" stroke="rgba(29,78,216,0.3)" />
        <text x={205} y={52} textAnchor="middle" fill="#1d4ed8" fontFamily="Inter" fontSize={9} fontWeight={600}>Kernel RBF</text>
        <text x={205} y={66} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>K(x,x')=e^(-γ||x-x'||²)</text>
        <text x={205} y={80} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>→ espacio ℝ∞</text>
        <line x1={260} y1={60} x2={305} y2={60} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />
        <rect x={310} y={30} width={110} height={60} rx={8} fill={`${color}10`} stroke={`${color}40`} />
        <text x={365} y={52} textAnchor="middle" fill={color} fontFamily="Inter" fontSize={9} fontWeight={600}>Regresión ε-SVR</text>
        <text x={365} y={66} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>C=1.0, ε=0.01</text>
        <text x={365} y={80} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>Support Vectors</text>
        <line x1={420} y1={60} x2={465} y2={60} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />
        <rect x={470} y={35} width={100} height={50} rx={8} fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.3)" />
        <text x={520} y={55} textAnchor="middle" fill="#3b82f6" fontFamily="Inter" fontSize={9} fontWeight={600}>MultiOutput</text>
        <text x={520} y={69} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>256 SVRs → ŷ</text>
      </svg>
    );
  }
  // DT
  return (
    <svg width="100%" height="140" viewBox="0 0 500 140" style={{ overflow: 'visible' }}>
      {[
        { x: 200, y: 10, w: 90, h: 30, label: 'Nodo raíz', type: 'root' },
        { x: 120, y: 60, w: 70, h: 26, label: 'Split L', type: 'node' },
        { x: 300, y: 60, w: 70, h: 26, label: 'Split R', type: 'node' },
        { x: 70, y: 105, w: 60, h: 24, label: 'Hoja', type: 'leaf' },
        { x: 170, y: 105, w: 60, h: 24, label: 'Hoja', type: 'leaf' },
        { x: 260, y: 105, w: 60, h: 24, label: 'Hoja', type: 'leaf' },
        { x: 360, y: 105, w: 60, h: 24, label: 'Hoja', type: 'leaf' },
      ].map((n, i) => {
        const isLeaf = n.type === 'leaf';
        const cx = n.x + n.w / 2;
        const cy = n.y + n.h / 2;
        return (
          <g key={i}>
            {i === 1 && <line x1={245} y1={40} x2={cx} y2={n.y} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />}
            {i === 2 && <line x1={245} y1={40} x2={cx} y2={n.y} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />}
            {i === 3 && <line x1={155} y1={86} x2={cx} y2={n.y} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />}
            {i === 4 && <line x1={155} y1={86} x2={cx} y2={n.y} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />}
            {i === 5 && <line x1={335} y1={86} x2={cx} y2={n.y} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />}
            {i === 6 && <line x1={335} y1={86} x2={cx} y2={n.y} stroke="var(--text-muted)" strokeWidth={1} opacity={0.3} />}
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={isLeaf ? 4 : 8}
              fill={isLeaf ? 'rgba(59,130,246,0.08)' : `${color}10`}
              stroke={isLeaf ? 'rgba(59,130,246,0.3)' : `${color}40`} strokeWidth={1} />
            <text x={cx} y={cy + 3} textAnchor="middle"
              fill={isLeaf ? '#3b82f6' : color} fontFamily="Inter" fontSize={8} fontWeight={600}>
              {n.label}
            </text>
          </g>
        );
      })}
      <text x={245} y={135} textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Mono" fontSize={7}>max_depth=8 → hasta 256 hojas</text>
    </svg>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export function ModelosPage() {
  const [category, setCategory] = useState<Category>('deep');
  const { t } = useLang();
  const CATEGORY_META = getCategoryMeta(t);
  const models = CATEGORY_META[category].models;
  const [active, setActive] = useState<AnyModel>(models[0]);
  const { datos: filasLopo, error: errorLopo } = useTablaLopo();

  const handleCategory = (cat: Category) => {
    setCategory(cat);
    setActive(getCategoryMeta(t)[cat].models[0]);
  };

  const color = modelColor(active);
  const DESCRIPTIONS = getDescriptions(t);
  const HYPERPARAMS = getHyperparams(t);
  const desc = DESCRIPTIONS[active];
  const trainCfg = getTrainByCat(t)[category];

  const archNodes = category === 'deep'
    ? DEEP_ARCHS[active as DeepModel]
    : category === 'lopo'
    ? LOPO_ARCHS[active as LopoModel]
    : null;

  return (
    <PageWrapper accentColor={`${color}05`}>
      <p className="eyebrow" style={{ marginBottom: '8px' }}>{t('Modelos utilizados en el proyecto', 'Models used in the project')}</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xl)', color: 'var(--text)', marginBottom: '6px' }}>
        {t('Modelos', 'Models')}
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '24px' }}>
        {CATEGORY_META[category].sub}
      </p>

      {/* ── Category selector ── */}
      <div role="tablist" aria-label="Categoría de modelo" style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content' }}>
        {(['deep', 'traditional', 'lopo'] as Category[]).map(cat => (
          <Boton
            key={cat}
            onClick={() => handleCategory(cat)}
            variante="sutil"
            tamano="sm"
            activo={category === cat}
            role="tab"
            aria-selected={category === cat}
            style={{ fontFamily: 'var(--font-data)' }}
          >{CATEGORY_META[cat].label}</Boton>
        ))}
      </div>

      {/* ── Model tabs within category ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {models.map(m => (
          <Boton
            key={m}
            onClick={() => setActive(m)}
            variante="secundario"
            tamano="sm"
            aria-pressed={active === m}
            style={{
              fontFamily: 'var(--font-data)',
              // Aqui el color SI identifica: cada modelo tiene el suyo en todas las
              // graficas, y la pestana lo repite para que se reconozca de un vistazo.
              borderColor: active === m ? modelColor(m) : 'var(--border)',
              background: active === m ? modelColor(m) + '1A' : 'transparent',
              color: active === m ? modelColor(m) : 'var(--text-muted)',
            }}
          >{m === 'SVR_rbf' ? 'SVR (RBF)' : m.replace('_', ' ')}</Boton>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={active}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}>

          {/* ── Description card ── */}
          <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <ModelBadge model={badgeName(active)} />
              <div>
                <p style={{ fontFamily: 'var(--font-section)', fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{desc.fullName}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{desc.summary}</p>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 600 }}>
                {category === 'traditional' ? t('Mecanismo', 'Mechanism') : t('Mecanismo interno', 'Internal mechanism')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text)', lineHeight: 1.6 }}>
                {desc.mechanism}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: 600 }}>{t('Fortalezas', 'Strengths')}</p>
                {desc.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--ok)', fontSize: 'var(--fs-3xs)', marginTop: '2px', flexShrink: 0 }}>+</span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.4 }}>{s}</p>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: 600 }}>{t('Compromisos', 'Tradeoffs')}</p>
                {desc.tradeoffs.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--warn)', fontSize: 'var(--fs-3xs)', marginTop: '2px', flexShrink: 0 }}>~</span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.4 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: `${color}08`, borderRadius: '8px', padding: '12px', border: `1px solid ${color}20` }}>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', fontWeight: 600 }}>
                {t('¿Por qué para ECG?', 'Why for ECG?')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text)', lineHeight: 1.6 }}>
                {desc.ecgRationale}
              </p>
            </div>
          </div>

          {/* ── Architecture / structure diagram ── */}
          <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
            <p style={{ fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '16px' }}>
              {category === 'traditional' ? t('Diagrama conceptual', 'Conceptual diagram') : t('Diagrama de arquitectura', 'Architecture diagram')}
            </p>
            <div style={{ overflowX: 'auto', padding: '8px 0' }}>
              {archNodes
                ? <ArchDiagram nodes={archNodes.nodes} width={archNodes.width} color={color} />
                : <TraditionalDiagram model={active as TraditionalModel} color={color} t={t} />
              }
            </div>
          </div>

          {/* ── Hyperparams + Training config ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <p style={{ fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '16px' }}>
                {t('Hiperparámetros', 'Hyperparameters')}, {active === 'SVR_rbf' ? 'SVR (RBF)' : active.replace('_', ' ')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {HYPERPARAMS[active].map(({ label, value }, i) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < HYPERPARAMS[active].length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-xs)', color, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '12px' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <p style={{ fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '16px' }}>
                {t('Configuración de entrenamiento', 'Training configuration')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {trainCfg.map(({ label, value }, i) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '8px 0',
                    borderBottom: i < trainCfg.length - 1 ? '1px solid var(--border)' : 'none',
                    gap: '12px',
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Comparison table per category ── */}
          <div className="card" style={{ marginTop: '20px', padding: '16px' }}>
            <p style={{ fontFamily: 'var(--font-section)', fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '12px' }}>
              {category === 'deep' ? t('Comparación · Deep Learning (NB2)', 'Comparison · Deep Learning (NB2)')
                : category === 'traditional' ? t('Comparación · ML Tradicional (NB1)', 'Comparison · Traditional ML (NB1)')
                : t('Comparación · Cross-Patient LOPO (NB5B / NB6)', 'Comparison · Cross-Patient LOPO (NB5B / NB6)')}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {category === 'deep' && ['', t('Tipo', 'Type'), t('Compuertas', 'Gates'), 'Epochs', t('Velocidad', 'Speed'), t('Uso en proyecto', 'Project use')].map(h => (
                      <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    {category === 'traditional' && ['', t('Tipo', 'Type'), 'Framework', t('Mejor R² Exp A', 'Best R² Exp A'), t('Mejor R² Exp B', 'Best R² Exp B'), t('Observación', 'Observation')].map(h => (
                      <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    {category === 'lopo' && ['', t('Cohorte', 'Cohort'), 'n', 'R² (media ± s)', 'IC 95 %', 'RMSE', 'MAE', 'R² FT', t('Latencia', 'Latency')].map(h => (
                      <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {category === 'deep' && ([
                    { m: 'LSTM' as AnyModel, col: MODEL_COLORS['LSTM'], vals: [t('Recurrente', 'Recurrent'), t('3 (forget, input, output)', '3 (forget, input, output)'), '80', t('Moderada', 'Moderate'), t('Modelo base', 'Base model')] },
                    { m: 'GRU' as AnyModel, col: MODEL_COLORS['GRU'], vals: [t('Recurrente', 'Recurrent'), '2 (reset, update)', '70', t('Rápida', 'Fast'), t('Modelo principal LOPO', 'Main LOPO model')] },
                    { m: 'CNN-GRU' as AnyModel, col: MODEL_COLORS['CNN-GRU'], vals: [t('Híbrido CNN+RNN', 'Hybrid CNN+RNN'), '2 + Conv', '60', t('Moderada', 'Moderate'), t('Señales ruidosas', 'Noisy signals')] },
                  ]).map(row => (
                    <tr key={row.m} style={{ borderBottom: '1px solid var(--border)', background: row.m === active ? `${row.col}08` : 'transparent' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 600, color: row.col }}>{row.m}</td>
                      {row.vals.map((v, vi) => <td key={vi} style={{ padding: '7px 8px', color: vi === row.vals.length - 1 ? 'var(--text)' : 'var(--text-sub)' }}>{v}</td>)}
                    </tr>
                  ))}
                  {category === 'traditional' && ([
                    { m: 'RF' as AnyModel, col: MODEL_COLORS['RF'], vals: ['Ensemble', 'scikit-learn', '0.1603 ± 0.19', '0.6264 ± 0.20', t('Mejor multi-step', 'Best multi-step')] },
                    { m: 'SVR_rbf' as AnyModel, col: MODEL_COLORS['SVR_rbf'], vals: ['Kernel SVM', 'scikit-learn', '0.1197 ± 0.20', '0.6454 ± 0.31', t('Mejor one-beat (escalar)', 'Best one-beat (scalar)')] },
                    { m: 'MLP' as AnyModel, col: MODEL_COLORS['MLP'], vals: [t('Red neuronal', 'Neural network'), 'scikit-learn', '0.0878 ± 0.19', '0.5829 ± 0.24', t('Consistente', 'Consistent')] },
                    { m: 'DT' as AnyModel, col: MODEL_COLORS['DT'], vals: [t('Árbol', 'Tree'), 'scikit-learn', '−0.1989 ± 0.28', '0.4520 ± 0.29', t('Severo overfitting', 'Severe overfitting')] },
                  ]).map(row => (
                    <tr key={row.m} style={{ borderBottom: '1px solid var(--border)', background: row.m === active ? `${row.col}08` : 'transparent' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 600, color: row.col }}>{row.m === 'SVR_rbf' ? 'SVR (RBF)' : row.m}</td>
                      {row.vals.map((v, vi) => <td key={vi} style={{ padding: '7px 8px', color: vi === row.vals.length - 1 ? 'var(--text)' : 'var(--text-sub)' }}>{v}</td>)}
                    </tr>
                  ))}
                  {category === 'lopo' && (filasLopo ?? []).map(row => {
                    const col = modelColor(row.modelo.replace(/ /g, '_') as AnyModel);
                    const dec = (x: number | null, d = 4) => (x === null || !Number.isFinite(x) ? '—' : x.toFixed(d));
                    return (
                      <tr key={row.modelo} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: col }}>{row.modelo}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{row.cohorte}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums' }}>{row.n}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {dec(row.r2)} ± {dec(row.r2Std, 2)}
                        </td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {row.ic95 ? `[${row.ic95[0].toFixed(4)}, ${row.ic95[1].toFixed(4)}]` : '—'}
                        </td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums' }}>{dec(row.rmse)}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums' }}>{dec(row.mae)}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums' }}>{dec(row.r2Ft)}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {row.latenciaMs === null ? '—' : `${row.latenciaMs.toFixed(3)} ms`}
                        </td>
                      </tr>
                    );
                  })}
                  {category === 'lopo' && !filasLopo && (
                    <tr><td colSpan={9} style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>
                      {errorLopo
                        ? t(`No se han podido leer los resultados: ${errorLopo}`, `Results could not be read: ${errorLopo}`)
                        : t('Cargando resultados…', 'Loading results…')}
                    </td></tr>
                  )}
                </tbody>
              </table>
              {category === 'lopo' && (
                <p style={{
                  margin: '10px 0 0', fontSize: 'var(--fs-2xs)', lineHeight: 1.55,
                  color: 'var(--text-muted)', maxWidth: '86ch',
                }}>
                  {t(
                    'Las dos cohortes no son comparables entre sí. Los cuatro primeros modelos se evaluaron sobre los 48 pacientes de MIT-BIH (NB5B); CNN GRU ATTN, sobre los 123 de MIT-BIH e INCART (NB6). INCART rinde significativamente peor, Mann-Whitney, p < 0.0001, ver Cohorte, de modo que su R² mayor no se obtuvo en condiciones más fáciles, sino sobre una población más difícil. La latencia ausente no es cero: no se registró para los conjuntos ni para CNN GRU ATTN.',
                    'The two cohorts are not comparable. The first four models were evaluated on the 48 MIT-BIH patients (NB5B); CNN GRU ATTN on the 123 patients of MIT-BIH and INCART (NB6). INCART performs significantly worse, Mann-Whitney, p < 0.0001, see Cohort, so its higher R² was not obtained under easier conditions but on a harder population. A missing latency is not zero: it was not recorded for the ensembles nor for CNN GRU ATTN.',
                  )}
                  <span style={{ display: 'block', marginTop: '5px', fontFamily: 'var(--font-data)' }}>
                    Fuente: /data/nb5b/tabla_resumen_v2.csv · /data/nb5/tabla_resumen.csv · /data/nb5/resultados_lopo.csv
                  </span>
                </p>
              )}
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </PageWrapper>
  );
}
