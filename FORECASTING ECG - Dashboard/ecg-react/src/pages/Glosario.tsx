import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Search } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { useLang } from '@/i18n';
import type { TFn } from '@/i18n';

type Category = 'Todos' | 'Clínico' | 'Modelo' | 'Métrica' | 'Preprocesamiento';

interface Term {
  term: string;
  category: Exclude<Category, 'Todos'>;
  definition: string;
}

const getTerms = (t: TFn): Term[] => [
  // ── Clínicos ──────────────────────────────────────────
  { term: t('Arritmia', 'Arrhythmia'), category: 'Clínico', definition: t('Trastorno del ritmo o conducción eléctrica del corazón que altera la frecuencia normal. MIT-BIH incluye 15+ tipos anotados por cardiólogos.', 'Heart rhythm or electrical conduction disorder that alters normal frequency. MIT-BIH includes 15+ types annotated by cardiologists.') },
  { term: 'APC', category: 'Clínico', definition: t('Atrial Premature Contraction (contracción auricular prematura): latido prematuro originado en las aurículas; símbolo "A" en anotaciones MIT-BIH.', 'Atrial Premature Contraction: premature beat originating in the atria; symbol "A" in MIT-BIH annotations.') },
  { term: t('Bradicardia', 'Bradycardia'), category: 'Clínico', definition: t('Ritmo cardíaco anormalmente lento, generalmente menos de 60 latidos por minuto.', 'Abnormally slow heart rate, generally less than 60 beats per minute.') },
  { term: t('Complejo QRS', 'QRS Complex'), category: 'Clínico', definition: t('Deflexión en el ECG que representa la despolarización ventricular. En MIT-BIH se usa como punto de referencia para la segmentación por latido.', 'ECG deflection representing ventricular depolarization. In MIT-BIH it is used as reference point for per-beat segmentation.') },
  { term: t('Despolarización', 'Depolarization'), category: 'Clínico', definition: t('Cambio en el potencial eléctrico de la membrana celular cardíaca que desencadena la contracción muscular del corazón.', 'Change in the electrical potential of the cardiac cell membrane that triggers heart muscle contraction.') },
  { term: 'ECG', category: 'Clínico', definition: t('Electrocardiograma: registro gráfico de la actividad eléctrica del corazón a lo largo del tiempo, muestreado a 360 Hz en MIT-BIH.', 'Electrocardiogram: graphical recording of the heart\'s electrical activity over time, sampled at 360 Hz in MIT-BIH.') },
  { term: t('Fibrilación auricular', 'Atrial Fibrillation'), category: 'Clínico', definition: t('Arritmia caracterizada por actividad eléctrica auricular rápida, irregular y descoordinada; símbolo "f" en anotaciones.', 'Arrhythmia characterized by rapid, irregular, and uncoordinated atrial electrical activity; symbol "f" in annotations.') },
  { term: 'LBBB', category: 'Clínico', definition: t('Left Bundle Branch Block (bloqueo de rama izquierda): alteración de la conducción intraventricular que ensancha el QRS. No es una arritmia en sentido estricto, el ritmo puede seguir siendo sinusal, aunque MIT-BIH lo etiqueta como tipo de latido. Símbolo "L".', 'Left Bundle Branch Block: an intraventricular conduction disturbance that widens the QRS. Not an arrhythmia in the strict sense, the rhythm may still be sinus, although MIT-BIH labels it as a beat type. Symbol "L".') },
  { term: t('Latido', 'Beat'), category: 'Clínico', definition: t('Unidad morfológica del ECG usada en Exp B: segmento de 256 muestras centrado en el pico R, que contiene P-QRS-T.', 'ECG morphological unit used in Exp B: 256-sample segment centered on the R-peak, containing P-QRS-T.') },
  { term: 'MIT-BIH', category: 'Clínico', definition: t('MIT-BIH Arrhythmia Database: 48 registros de ECG de ~30 min a 360 Hz con anotaciones experto, disponible en PhysioNet. Base de datos de este proyecto.', 'MIT-BIH Arrhythmia Database: 48 ECG records of ~30 min at 360 Hz with expert annotations, available on PhysioNet. Database used in this project.') },
  { term: t('Onda P', 'P Wave'), category: 'Clínico', definition: t('Deflexión del ECG que representa la despolarización auricular, precediendo al complejo QRS en ritmo sinusal normal.', 'ECG deflection representing atrial depolarization, preceding the QRS complex in normal sinus rhythm.') },
  { term: t('Onda T', 'T Wave'), category: 'Clínico', definition: t('Deflexión que representa la repolarización ventricular; su morfología cambia en isquemia y arritmias.', 'Deflection representing ventricular repolarization; its morphology changes in ischemia and arrhythmias.') },
  { term: 'PhysioNet', category: 'Clínico', definition: t('Repositorio público de señales fisiológicas del MIT. Fuente oficial de la base de datos MIT-BIH usada en este proyecto.', 'Public repository of physiological signals from MIT. Official source of the MIT-BIH database used in this project.') },
  { term: 'PVC', category: 'Clínico', definition: t('Premature Ventricular Contraction (contracción ventricular prematura): latido anormal originado en los ventrículos; símbolo "V" en MIT-BIH.', 'Premature Ventricular Contraction: abnormal beat originating in the ventricles; symbol "V" in MIT-BIH.') },
  { term: 'RBBB', category: 'Clínico', definition: t('Right Bundle Branch Block (bloqueo de rama derecha): alteración de la conducción intraventricular que ensancha el QRS por activación retardada del ventrículo derecho. No es una arritmia en sentido estricto, el ritmo puede seguir siendo sinusal, aunque MIT-BIH lo etiqueta como tipo de latido. Símbolo "R".', 'Right Bundle Branch Block: an intraventricular conduction disturbance that widens the QRS through delayed right ventricular activation. Not an arrhythmia in the strict sense, the rhythm may still be sinus, although MIT-BIH labels it as a beat type. Symbol "R".') },
  { term: t('Segmento ST', 'ST Segment'), category: 'Clínico', definition: t('Porción del ECG entre el final del QRS y el inicio de la onda T; su alteración puede indicar isquemia miocárdica.', 'Portion of the ECG between the end of QRS and the beginning of the T wave; its alteration may indicate myocardial ischemia.') },
  { term: t('Taquicardia ventricular', 'Ventricular Tachycardia'), category: 'Clínico', definition: t('Arritmia con frecuencia ventricular superior a 100 lpm originada en los ventrículos; puede ser potencialmente mortal.', 'Arrhythmia with ventricular rate above 100 bpm originating in the ventricles; can be potentially fatal.') },

  { term: t('Baseline Wander', 'Baseline Wander'), category: 'Clínico', definition: t('Oscilación lenta de la línea base del ECG causada por respiración o movimiento del electrodo. Se corrige con filtros de mediana o detrend lineal.', 'Slow oscillation of the ECG baseline caused by breathing or electrode movement. Corrected with median filters or linear detrend.') },
  { term: 'HRV', category: 'Clínico', definition: t('Heart Rate Variability (Variabilidad de la Frecuencia Cardíaca): variación fisiológica en los intervalos RR entre latidos consecutivos. Refleja actividad del sistema nervioso autónomo.', 'Heart Rate Variability: physiological variation in RR intervals between consecutive beats. Reflects autonomic nervous system activity.') },
  { term: 'INCART', category: 'Clínico', definition: t('St. Petersburg INCART Database: 75 registros de ECG de 12 derivaciones a 257 Hz. Usada junto a MIT-BIH para validación cross-patient en NB6 (123 pacientes en total).', 'St. Petersburg INCART Database: 75 12-lead ECG records at 257 Hz. Used alongside MIT-BIH for cross-patient validation in NB6 (123 total patients).') },
  { term: t('Intervalo RR', 'RR Interval'), category: 'Clínico', definition: t('Tiempo entre dos picos R consecutivos del ECG, medido en segundos. Refleja la frecuencia cardíaca instantánea. En NB6 se normaliza con z-score global (μ=0.776s, σ=0.231s) y se añade como feature 257.', 'Time between two consecutive R-peaks of the ECG, measured in seconds. Reflects instantaneous heart rate. In NB6 it is globally z-score normalized (μ=0.776s, σ=0.231s) and added as feature 257.') },
  { term: t('Onda U', 'U Wave'), category: 'Clínico', definition: t('Deflexión pequeña y positiva que puede aparecer después de la onda T. Su origen es debatido; se asocia con repolarización tardía de fibras de Purkinje.', 'Small positive deflection that may appear after the T wave. Its origin is debated; associated with late repolarization of Purkinje fibers.') },

  { term: 'AAMI', category: 'Clínico', definition: t('Agrupación de la Association for the Advancement of Medical Instrumentation que reduce las quince etiquetas de MIT-BIH a cinco clases: N (normal), SVEB (supraventricular ectópico), VEB (ventricular ectópico), F (fusión) y Q (no clasificable o marcapasos). Es la agrupación con la que el experimento 8 mide el error por clase.', 'Association for the Advancement of Medical Instrumentation grouping that reduces the fifteen MIT-BIH labels to five classes: N (normal), SVEB (supraventricular ectopic), VEB (ventricular ectopic), F (fusion) and Q (unclassifiable or paced). It is the grouping experiment 8 uses to measure per-class error.') },
  { term: t('Latido ectópico', 'Ectopic beat'), category: 'Clínico', definition: t('Latido que no nace del nodo sinusal. Agrupa SVEB, VEB y F en la clasificación AAMI. En la cohorte del experimento 8 son el 12.22 % de los 316 740 latidos, y su error de predicción medio es 3.16 veces el de un latido normal.', 'Beat not originating in the sinus node. Groups SVEB, VEB and F in the AAMI classification. In the experiment 8 cohort they are 12.22 % of the 316,740 beats, and their mean prediction error is 3.16 times that of a normal beat.') },
  // ── Modelos IA ─────────────────────────────────────────
  { term: 'BiGRU', category: 'Modelo', definition: t('GRU Bidireccional: procesa la secuencia en ambas direcciones (pasado y futuro), capturando contexto completo. Usado en NB5B (LOPO).', 'Bidirectional GRU: processes the sequence in both directions (past and future), capturing full context. Used in NB5B (LOPO).') },
  { term: 'CNN-GRU', category: 'Modelo', definition: t('Arquitectura híbrida NB2: capas convolucionales 1D extraen patrones locales del ECG, seguidas de GRU que captura la dinámica temporal. R²=0.6536 Exp B.', 'Hybrid NB2 architecture: 1D convolutional layers extract local ECG patterns, followed by GRU capturing temporal dynamics. R²=0.6536 Exp B.') },
  { term: 'CNN-LSTM', category: 'Modelo', definition: t('Arquitectura híbrida NB2: combina CNN 1D para extracción de características morfológicas con LSTM para modelado temporal. R²=0.6559 Exp B.', 'Hybrid NB2 architecture: combines 1D CNN for morphological feature extraction with LSTM for temporal modeling. R²=0.6559 Exp B.') },
  { term: 'DT', category: 'Modelo', definition: t('Decision Tree (árbol de decisión): modelo de ML tradicional (NB1) que aprende reglas de separación jerárquicas. R²=0.4520 Exp B.', 'Decision Tree: traditional ML model (NB1) that learns hierarchical splitting rules. R²=0.4520 Exp B.') },
  { term: 'Dropout', category: 'Modelo', definition: t('Técnica de regularización que desactiva aleatoriamente neuronas durante el entrenamiento para reducir el sobreajuste.', 'Regularization technique that randomly deactivates neurons during training to reduce overfitting.') },
  { term: 'Early stopping', category: 'Modelo', definition: t('Técnica que detiene el entrenamiento cuando la métrica de validación deja de mejorar, evitando sobreajuste y reduciendo tiempo de cómputo.', 'Technique that stops training when the validation metric stops improving, preventing overfitting and reducing computation time.') },
  { term: 'Epoch', category: 'Modelo', definition: t('Un paso completo de entrenamiento sobre el conjunto de datos durante el ajuste de un modelo de Deep Learning.', 'One complete training pass over the dataset during Deep Learning model fitting.') },
  { term: 'Forecasting', category: 'Modelo', definition: t('Predicción de valores futuros de una serie temporal. En este proyecto: predicción del siguiente latido ECG a partir del historial de la señal.', 'Prediction of future values in a time series. In this project: predicting the next ECG beat from the signal history.') },
  { term: 'GRU', category: 'Modelo', definition: t('Gated Recurrent Unit: variante simplificada del LSTM con menos parámetros, eficiente para series temporales. Mejor modelo DL del proyecto: R²=0.6592 en Exp B.', 'Gated Recurrent Unit: simplified LSTM variant with fewer parameters, efficient for time series. Best DL model in the project: R²=0.6592 in Exp B.') },
  { term: t('Hiperparámetro', 'Hyperparameter'), category: 'Modelo', definition: t('Parámetro de configuración del modelo (tasa de aprendizaje, unidades, capas, lookback) fijado antes del entrenamiento mediante búsqueda.', 'Model configuration parameter (learning rate, units, layers, lookback) set before training through search.') },
  { term: 'LOPO', category: 'Modelo', definition: t('Leave-One-Patient-Out: protocolo de validación cruzada donde se entrena con todos los pacientes menos uno y se evalúa en el excluido. Evalúa generalización cross-patient.', 'Leave-One-Patient-Out: cross-validation protocol where training uses all patients except one, evaluated on the excluded. Assesses cross-patient generalization.') },
  { term: 'LSTM', category: 'Modelo', definition: t('Long Short-Term Memory: red recurrente con celdas de memoria y compuertas de olvido, diseñada para dependencias a largo plazo. R²=0.6592 en Exp B (empata con GRU).', 'Long Short-Term Memory: recurrent network with memory cells and forget gates, designed for long-term dependencies. R²=0.6592 in Exp B (ties with GRU).') },
  { term: 'MHA', category: 'Modelo', definition: t('Multi-Head Attention: mecanismo de atención paralela usado en Transformers y BiGRU+MHA de NB5B para ponderar importancia de cada paso temporal.', 'Multi-Head Attention: parallel attention mechanism used in Transformers and NB5B BiGRU+MHA to weight the importance of each time step.') },
  { term: 'MLP', category: 'Modelo', definition: t('Multi-Layer Perceptron: red neuronal feedforward densa (NB1). R²=0.5829 en Exp B; segundo mejor modelo tradicional.', 'Multi-Layer Perceptron: dense feedforward neural network (NB1). R²=0.5829 in Exp B; second-best traditional model.') },
  { term: 'NB1', category: 'Modelo', definition: t('Notebook 1: experimentos con modelos tradicionales de ML (RF, SVR, MLP, DT, Persistencia) sobre ventanas temporales.', 'Notebook 1: experiments with traditional ML models (RF, SVR, MLP, DT, Persistence) on temporal windows.') },
  { term: 'NB2', category: 'Modelo', definition: t('Notebook 2: experimentos con Deep Learning (LSTM, GRU, CNN-LSTM, CNN-GRU) con entrenamiento por paciente.', 'Notebook 2: experiments with Deep Learning (LSTM, GRU, CNN-LSTM, CNN-GRU) with per-patient training.') },
  { term: 'NB4B', category: 'Modelo', definition: t('Notebook 4B: modelo global entrenado sobre segmentos de 60 s de todos los pacientes. Evaluado en Exp A/C sin especialización por paciente.', 'Notebook 4B: global model trained on 60 s segments from all patients. Evaluated in Exp A/C without per-patient specialization.') },
  { term: 'NB5B', category: 'Modelo', definition: t('Notebook 5B: validación LOPO con arquitecturas avanzadas (GRU base, CNN-GRU, BiGRU+MHA). Mide capacidad de generalización cross-patient.', 'Notebook 5B: LOPO validation with advanced architectures (base GRU, CNN-GRU, BiGRU+MHA). Measures cross-patient generalization capability.') },
  { term: 'Overfitting', category: 'Modelo', definition: t('Sobreajuste: el modelo memoriza los datos de entrenamiento y falla en generalizar. Se mide con el gap R²_train − R²_test.', 'Overfitting: the model memorizes training data and fails to generalize. Measured by the R²_train − R²_test gap.') },
  { term: t('Persistencia', 'Persistence'), category: 'Modelo', definition: t('Modelo de línea base que predice el valor actual repitiendo el último valor observado. Se usa como referencia mínima a superar.', 'Baseline model that predicts the current value by repeating the last observed value. Used as a minimum reference to surpass.') },
  { term: 'RF', category: 'Modelo', definition: t('Random Forest: ensamble de árboles de decisión (NB1). Mejor modelo tradicional del proyecto: R²=0.6264 en Exp B, predice las 256 muestras completas del latido.', 'Random Forest: decision tree ensemble (NB1). Best traditional model in the project: R²=0.6264 in Exp B, predicts the full 256 samples of the beat.') },
  { term: 'RNN', category: 'Modelo', definition: t('Red Neuronal Recurrente: tipo de red con conexiones hacia atrás, ideal para procesar secuencias. LSTM y GRU son variantes avanzadas de RNN.', 'Recurrent Neural Network: network type with backward connections, ideal for processing sequences. LSTM and GRU are advanced RNN variants.') },
  { term: 'SVR', category: 'Modelo', definition: t('Support Vector Regression con kernel RBF (NB1). Predice una muestra a la vez (multi-step 1-a-1). R²=0.6454 en Exp B; mayor R² pero menos útil que RF.', 'Support Vector Regression with RBF kernel (NB1). Predicts one sample at a time (multi-step 1-by-1). R²=0.6454 in Exp B; higher R² but less useful than RF.') },
  { term: 'Transfer learning', category: 'Modelo', definition: t('Técnica donde un modelo entrenado en un paciente se reutiliza total o parcialmente para otro. Evaluado en Exp B (transferencia cruzada) de NB3.', 'Technique where a model trained on one patient is fully or partially reused for another. Evaluated in Exp B (cross-transfer) of NB3.') },

  { term: 'CNN_GRU_ATTN', category: 'Modelo', definition: t('Arquitectura NB6 para predicción multi-step cross-patient: capas Conv1D + GRU + Multi-Head Attention. Predice 3 latidos futuros (horizon=3) con feat_dim=257. R²=0.6734 sobre 123 pacientes (LOPO).', 'NB6 architecture for multi-step cross-patient prediction: Conv1D + GRU + Multi-Head Attention layers. Predicts 3 future beats (horizon=3) with feat_dim=257. R²=0.6734 over 123 patients (LOPO).') },
  { term: t('Cross-patient', 'Cross-patient'), category: 'Modelo', definition: t('Validación donde el modelo se evalúa en pacientes no vistos durante entrenamiento (LOPO). Mide la capacidad de generalización real del modelo a nuevos sujetos.', 'Validation where the model is evaluated on patients unseen during training (LOPO). Measures the model\'s real generalization ability to new subjects.') },
  { term: t('Multi-Step Forecasting', 'Multi-Step Forecasting'), category: 'Modelo', definition: t('Predicción de múltiples pasos futuros en una sola inferencia. En NB6: horizon=3 predice los próximos 3 latidos simultáneamente (768 muestras).', 'Prediction of multiple future steps in a single inference. In NB6: horizon=3 predicts the next 3 beats simultaneously (768 samples).') },
  { term: 'NB6', category: 'Modelo', definition: t('Notebook 6 (06_Cross_patient_MultiStep): modelo CNN_GRU_ATTN con predicción multi-step (horizon=3) validado con LOPO sobre 123 pacientes (48 MIT-BIH + 75 INCART). Modelo desplegado en la API de producción.', 'Notebook 6 (06_Cross_patient_MultiStep): CNN_GRU_ATTN model with multi-step prediction (horizon=3) validated with LOPO over 123 patients (48 MIT-BIH + 75 INCART). Model deployed in the production API.') },
  { term: t('Overlap-Add', 'Overlap-Add'), category: 'Modelo', definition: t('Técnica de reconstrucción de señal continua a partir de latidos predichos individuales. Los latidos se solapan y promedian en las zonas de intersección para obtener una señal suave sin discontinuidades.', 'Signal reconstruction technique from individual predicted beats. Beats overlap and are averaged in intersection zones to obtain a smooth signal without discontinuities.') },

  // ── Métricas ───────────────────────────────────────────
  { term: 'DTW', category: 'Métrica', definition: t('Dynamic Time Warping: mide la similitud entre dos secuencias temporales permitiendo deformaciones elásticas en el eje del tiempo.', 'Dynamic Time Warping: measures similarity between two temporal sequences allowing elastic deformations on the time axis.') },
  { term: 'Gap R²', category: 'Métrica', definition: t('Diferencia R²_train − R²_test. Valores > 0.1 indican riesgo de sobreajuste (overfitting). Se analiza en el módulo Estadísticas.', 'R²_train − R²_test difference. Values > 0.1 indicate overfitting risk. Analyzed in the Statistics module.') },
  { term: 'MAE', category: 'Métrica', definition: t('Mean Absolute Error: promedio de los errores absolutos entre valores predichos y reales. Robusto a valores atípicos.', 'Mean Absolute Error: average of absolute errors between predicted and actual values. Robust to outliers.') },
  { term: 'MSE', category: 'Métrica', definition: t('Mean Squared Error: promedio del cuadrado de los errores de predicción. Penaliza errores grandes más que el MAE.', 'Mean Squared Error: average of squared prediction errors. Penalizes large errors more than MAE.') },
  { term: 'R²', category: 'Métrica', definition: t('Coeficiente de determinación: proporción de la varianza de la señal explicada por el modelo. R²=1.0 es perfecto; R²=0 equivale a predecir la media.', 'Coefficient of determination: proportion of signal variance explained by the model. R²=1.0 is perfect; R²=0 equals predicting the mean.') },
  { term: 'RMSE', category: 'Métrica', definition: t('Root Mean Squared Error: raíz del MSE, en las mismas unidades que la señal. Más interpretable que el MSE.', 'Root Mean Squared Error: square root of MSE, in the same units as the signal. More interpretable than MSE.') },

  { term: 'Forecast Score', category: 'Métrica', definition: t('Métrica compuesta del NB6 que combina R², DTW y Shape Correlation en un solo puntaje ponderado para evaluar la calidad general de la predicción. Valor NB6: 0.7073.', 'NB6 composite metric that combines R², DTW, and Shape Correlation into a single weighted score to evaluate overall prediction quality. NB6 value: 0.7073.') },
  { term: 'IC 95%', category: 'Métrica', definition: t('Intervalo de Confianza al 95%: rango estadístico dentro del cual se espera que el valor real caiga con un 95% de probabilidad. En NB6 R²: [0.6235, 0.7233].', '95% Confidence Interval: statistical range within which the true value is expected to fall with 95% probability. NB6 R²: [0.6235, 0.7233].') },
  { term: 'Shape Correlation', category: 'Métrica', definition: t('Correlación de Pearson entre la forma morfológica del latido predicho y el real. Mide similitud de forma independiente de la escala. Valor NB6: 0.8383.', 'Pearson correlation between the morphological shape of predicted and actual beats. Measures shape similarity regardless of scale. NB6 value: 0.8383.') },
  { term: 'Slope MSE', category: 'Métrica', definition: t('Error cuadrático medio de la derivada (pendiente) de la señal. Evalúa si el modelo preserva las transiciones rápidas del ECG (subida del QRS, bajada de la onda T).', 'Mean squared error of the signal derivative (slope). Evaluates if the model preserves fast ECG transitions (QRS upstroke, T wave descent).') },

  { term: 'AUC-PR', category: 'Métrica', definition: t('Área bajo la curva de precisión-exhaustividad. A diferencia del AUC-ROC, no se deja engañar por un desbalance fuerte de clases. Su referencia no es 0.5 sino la prevalencia: en el experimento 8 vale 0.3808 frente a una prevalencia de 0.1222, es decir 3.12 veces mejor que ordenar al azar.', 'Area under the precision-recall curve. Unlike AUC-ROC, it is not fooled by a strong class imbalance. Its reference is not 0.5 but the prevalence: in experiment 8 it is 0.3808 against a prevalence of 0.1222, that is 3.12 times better than random ranking.') },
  { term: t('Precisión', 'Precision'), category: 'Métrica', definition: t('De lo que el sistema marca como ectópico, qué proporción lo es de verdad. Conviene mirarla paciente a paciente y no promediada: hay pliegues con precisión casi nula junto a pliegues altos, y la media los tapa.', 'Of what the system flags as ectopic, what proportion really is. Worth reading per patient rather than averaged: there are folds with near-zero precision next to high ones, and the mean hides them.') },
  { term: t('Exhaustividad', 'Recall'), category: 'Métrica', definition: t('De los latidos ectópicos que hay, qué proporción encuentra el sistema. Sube a costa de la precisión y al revés: por eso se informan juntas y no por separado.', 'Of the ectopic beats present, what proportion the system finds. It rises at the expense of precision and vice versa: hence they are reported together, not separately.') },
  { term: t('Prevalencia', 'Prevalence'), category: 'Métrica', definition: t('Proporción de casos positivos en la población evaluada. Es la línea base contra la que hay que comparar cualquier detector: un AUC-PR igual a la prevalencia significa que el detector no aporta nada.', 'Proportion of positive cases in the evaluated population. It is the baseline any detector must be compared against: an AUC-PR equal to the prevalence means the detector adds nothing.') },
  { term: 'Wilcoxon', category: 'Métrica', definition: t('Prueba de los rangos con signo para muestras emparejadas. Se usa cuando el mismo paciente se evalúa con dos configuraciones y no se quiere suponer normalidad. En el experimento 7 da p = 1.0000 para la arquitectura final: la búsqueda no encontró nada mejor que lo que ya había.', 'Signed-rank test for paired samples. Used when the same patient is evaluated under two configurations and normality is not assumed. In experiment 7 it gives p = 1.0000 for the final architecture: the search found nothing better than what was already there.') },
  { term: 'Mann-Whitney', category: 'Métrica', definition: t('Prueba no paramétrica para dos muestras independientes. Se usa para contrastar MIT-BIH frente a INCART, que son pacientes distintos y no emparejables.', 'Non-parametric test for two independent samples. Used to contrast MIT-BIH against INCART, which are different, non-pairable patients.') },
  { term: t('Búsqueda de hiperparámetros', 'Hyperparameter search'), category: 'Métrica', definition: t('Prueba sistemática de configuraciones para ver si alguna mejora al modelo. Su resultado útil no es siempre encontrar una mejor: cuando ninguna lo hace, queda demostrado que el resultado publicado no dependía de una configuración afortunada.', 'Systematic trial of configurations to see whether any improves the model. Its useful outcome is not always finding a better one: when none does, it is established that the published result did not depend on a lucky configuration.') },
  // ── Preprocesamiento ───────────────────────────────────
  { term: 'Exp A', category: 'Preprocesamiento', definition: t('Experimento A: segmentación de señal en ventanas temporales fijas (lookback + horizonte). El modelo predice el siguiente segmento de señal.', 'Experiment A: signal segmentation into fixed temporal windows (lookback + horizon). The model predicts the next signal segment.') },
  { term: 'Exp B', category: 'Preprocesamiento', definition: t('Experimento B: segmentación latido a latido. El modelo predice las 256 muestras del siguiente latido. Obtiene mejores métricas que Exp A en todos los modelos.', 'Experiment B: beat-by-beat segmentation. The model predicts the 256 samples of the next beat. Achieves better metrics than Exp A across all models.') },
  { term: 'F_MED', category: 'Preprocesamiento', definition: t('Filtro de mediana. Obtuvo el mejor R² en las fases NB1, NB2 y NB4B, pero el NB7 midió que atenúa el pico R un 76.5 % de media (hasta un 95.5 % en el peor paciente): no preserva la morfología del QRS, la destruye. Su ventaja en R² es un artefacto de aplanamiento, y por eso el modelo final (NB6) no lo incluye.', 'Median filter. It obtained the best R² in phases NB1, NB2 and NB4B, but NB7 measured that it attenuates the R peak by 76.5 % on average (up to 95.5 % in the worst patient): it does not preserve QRS morphology, it destroys it. Its R² advantage is a flattening artifact, which is why the final model (NB6) excludes it.') },
  { term: 'F_NOTCH', category: 'Preprocesamiento', definition: t('Filtro Notch (rechaza-banda a 60 Hz): elimina interferencia de red eléctrica de la señal ECG.', 'Notch Filter (band-reject at 60 Hz): removes power line interference from the ECG signal.') },
  { term: t('Filtro pasa-banda', 'Band-pass Filter'), category: 'Preprocesamiento', definition: t('Filtro que permite frecuencias dentro de un rango (ej. 0.5–40 Hz para ECG), eliminando ruido fuera de la banda cardíaca.', 'Filter that allows frequencies within a range (e.g., 0.5–40 Hz for ECG), removing noise outside the cardiac band.') },
  { term: 'GAF', category: 'Preprocesamiento', definition: t('Gramian Angular Field: codificación de series temporales en imágenes 2D para usarse con CNNs de visión.', 'Gramian Angular Field: encoding of time series into 2D images for use with vision CNNs.') },
  { term: t('Horizonte', 'Horizon'), category: 'Preprocesamiento', definition: t('Número de muestras futuras que el modelo predice. En Exp B = 256 muestras (un latido completo).', 'Number of future samples the model predicts. In Exp B = 256 samples (one complete beat).') },
  { term: 'Lookback', category: 'Preprocesamiento', definition: t('Número de muestras pasadas que el modelo usa como contexto para predecir. Hiperparámetro optimizado en NB1 y NB2.', 'Number of past samples the model uses as context for prediction. Hyperparameter optimized in NB1 and NB2.') },
  { term: t('Normalización Z-score', 'Z-score Normalization'), category: 'Preprocesamiento', definition: t('Transformación que centra la señal en media 0 y desviación estándar 1 por registro de paciente, facilitando el entrenamiento.', 'Transformation that centers the signal at mean 0 and standard deviation 1 per patient record, facilitating training.') },
  { term: t('Pico R', 'R-peak'), category: 'Preprocesamiento', definition: t('Punto de máxima amplitud del complejo QRS. Se usa como referencia para centrar los segmentos de latido en Exp B.', 'Maximum amplitude point of the QRS complex. Used as reference for centering beat segments in Exp B.') },
  { term: 'Detrend', category: 'Preprocesamiento', definition: t('Eliminación de tendencia lineal de la señal. En NB6: scipy.signal.detrend(type="linear") remueve la deriva lenta de la línea base antes de la normalización z-score.', 'Removal of linear trend from the signal. In NB6: scipy.signal.detrend(type="linear") removes slow baseline drift before z-score normalization.') },
  { term: 'Exp C', category: 'Preprocesamiento', definition: t('Experimento C: evaluación cross-patient con modelo global (NB4B/NB5B). El modelo se entrena con datos de múltiples pacientes y se evalúa en pacientes no vistos.', 'Experiment C: cross-patient evaluation with global model (NB4B/NB5B). The model is trained with data from multiple patients and evaluated on unseen patients.') },
  { term: 'F_NB6', category: 'Preprocesamiento', definition: t('Pipeline de filtrado del NB6: (1) Notch 60 Hz Q=30, (2) Butterworth pasa-banda 0.5–40 Hz, (3) Detrend lineal, (4) Z-score global. SIN filtro de mediana. Optimizado para CNN_GRU_ATTN.', 'NB6 filter pipeline: (1) Notch 60 Hz Q=30, (2) Butterworth bandpass 0.5–40 Hz, (3) Linear detrend, (4) Global z-score. NO median filter. Optimized for CNN_GRU_ATTN.') },
  { term: 'F_N+PB+MED', category: 'Preprocesamiento', definition: t('Pipeline de filtrado NB4B: Notch 60 Hz + Pasa-Banda (0.5–40 Hz) + Filtro de Mediana. Pipeline más completo que combina tres etapas de limpieza.', 'NB4B filter pipeline: Notch 60 Hz + Band-Pass (0.5–40 Hz) + Median Filter. Most complete pipeline combining three cleaning stages.') },
  { term: 'Filtfilt', category: 'Preprocesamiento', definition: t('Filtrado bidireccional de fase cero: aplica el filtro en dirección forward y luego backward, eliminando el desplazamiento de fase del filtrado convencional.', 'Zero-phase bidirectional filtering: applies the filter in forward then backward direction, eliminating the phase shift of conventional filtering.') },
  { term: t('Ventana deslizante', 'Sliding Window'), category: 'Preprocesamiento', definition: t('Técnica de segmentación que extrae sub-secuencias de longitud fija (lookback + horizonte) con un paso de desplazamiento para aumentar datos de entrenamiento.', 'Segmentation technique that extracts fixed-length sub-sequences (lookback + horizon) with a sliding step to augment training data.') },
];

const CATEGORY_COLORS: Record<Exclude<Category, 'Todos'>, { bg: string; text: string; border: string }> = {
  Clínico:         { bg: 'rgba(239,68,68,0.08)',   text: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  Modelo:          { bg: 'rgba(29,78,216,0.08)', text: '#1d4ed8', border: 'rgba(29,78,216,0.2)' },
  Métrica:         { bg: 'rgba(59,130,246,0.08)',  text: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
  Preprocesamiento:{ bg: 'rgba(56,189,248,0.08)',  text: '#38bdf8', border: 'rgba(56,189,248,0.2)' },
};

export function GlosarioPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('Todos');
  const { t } = useLang();
  const TERMS = getTerms(t);

  const catLabel = (c: Category) => {
    const map: Record<Category, string> = {
      'Todos': t('Todos', 'All'),
      'Clínico': t('Clínico', 'Clinical'),
      'Modelo': t('Modelo', 'Model'),
      'Métrica': t('Métrica', 'Metric'),
      'Preprocesamiento': t('Preprocesamiento', 'Preprocessing'),
    };
    return map[c];
  };

  const filtered = useMemo(() => {
    return TERMS.filter(t => {
      const matchQ = t.term.toLowerCase().includes(query.toLowerCase()) ||
                     t.definition.toLowerCase().includes(query.toLowerCase());
      const matchC = category === 'Todos' || t.category === category;
      return matchQ && matchC;
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [query, category, TERMS]);

  // Group by first letter
  const grouped = filtered.reduce<Record<string, Term[]>>((acc, t) => {
    const letter = t.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {});

  const CATEGORIES: Category[] = ['Todos', 'Clínico', 'Modelo', 'Métrica', 'Preprocesamiento'];

  return (
    <PageWrapper accentColor="rgba(59,130,246,0.04)">
      <p className="eyebrow" style={{ marginBottom: '8px' }}>{t('Referencia técnica', 'Technical Reference')}</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xl)', color: 'var(--text)', marginBottom: '24px' }}>
        {t('Glosario', 'Glossary')}
      </h1>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-sub)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
          <input
            type="text"
            aria-label={t('Buscar término', 'Search term')}
            placeholder={t('Buscar término...', 'Search term...')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--fs-sm)',
              outline: 'none',
              backdropFilter: 'var(--glass-blur)',
              boxShadow: 'var(--glass-shadow)',
              transition: 'all 0.2s ease',
            }}
            className="focus:border-[var(--signal)] focus:ring-1 focus:ring-[var(--signal)]"
          />
        </div>
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px',
          backdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--glass-shadow)',
        }}>
          {CATEGORIES.map(c => (
            <Boton
              key={c}
              onClick={() => setCategory(c)}
              variante="sutil"
              tamano="sm"
              activo={category === c}
              role="tab"
              aria-selected={category === c}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {catLabel(c)}
            </Boton>
          ))}
        </div>
      </div>

      {/* Term count */}
      <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-sub)', marginBottom: '20px' }}>
        {filtered.length} {t('término', 'term')}{filtered.length !== 1 ? 's' : ''} {t('encontrado', 'found')}{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Alphabetical navigation */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '28px',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          background: 'var(--glass-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px',
          backdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--glass-shadow)',
        }}>
          {Object.keys(grouped).map(letter => (
            <Boton
              key={letter}
              onClick={() => {
                document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              variante="sutil"
              tamano="sm"
              aria-label={`Ir a la letra ${letter}`}
              style={{
                width: 32, minWidth: 32, padding: 0,
                fontFamily: 'var(--font-display)', fontSize: 'var(--fs-sm)',
              }}
            >
              {letter}
            </Boton>
          ))}
        </div>
      )}

      {/* Alphabetical list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {Object.entries(grouped).map(([letter, terms]) => (
          <div key={letter} id={`letter-${letter}`} style={{ scrollMarginTop: '100px' }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-lg)',
              color: 'var(--signal)', marginBottom: '14px', borderBottom: '1px solid var(--border)',
              paddingBottom: '4px', display: 'inline-block', minWidth: '40px'
            }}>{letter}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {terms.map(t => {
                const colors = CATEGORY_COLORS[t.category];
                return (
                  <div
                    key={t.term}
                    className="card hover:scale-[1.005] hover:border-[var(--signal)]"
                    style={{
                      padding: '16px 20px',
                      borderLeft: `4px solid ${colors.text}`,
                      background: 'var(--glass-bg)',
                      borderTop: '1px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      backdropFilter: 'var(--glass-blur)',
                      boxShadow: 'var(--glass-shadow)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{t.term}</p>
                      <span style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        fontFamily: 'var(--font-display)', fontSize: 'var(--fs-3xs)', fontWeight: 600,
                        color: colors.text, letterSpacing: '0.5px',
                      }}>{catLabel(t.category)}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', lineHeight: 1.65 }}>{t.definition}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Credits */}
      <div style={{
        marginTop: '48px',
        textAlign: 'center',
        padding: '28px',
        background: 'var(--glass-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        backdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--glass-shadow)',
      }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
          {t('Créditos y fuentes', 'Credits and Sources')}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['MIT-BIH Arrhythmia Database', 'INCART Database', 'PhysioNet', 'TensorFlow / Keras', 'FastAPI', 'React 19', 'Vite', 'Docker', 'Universidad CESMAG'].map(s => (
            <span key={s} style={{
              padding: '6px 12px', borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.05)', border: '1px solid var(--border)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
