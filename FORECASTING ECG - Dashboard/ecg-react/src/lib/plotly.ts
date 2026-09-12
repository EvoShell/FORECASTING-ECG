/**
 * Paquete de Plotly a medida.
 *
 * Antes se importaba `plotly.min.js`, el bundle completo: 4 604 KB, el 83 % de todo
 * el JavaScript de la aplicación y casi cinco veces el resto junto. Este proyecto usa
 * exactamente siete tipos de traza, así que se registran solo esos.
 *
 * Los siete, con dónde se usan:
 *   scatter       líneas y puntos, en casi todas las vistas
 *   bar           comparativas por modelo y por filtro
 *   box           dispersión de R² por paciente
 *   violin        distribuciones
 *   histogram     reparto de residuos
 *   heatmap       matrices de filtro por horizonte
 *   scatterpolar  el radar de Experimentos
 *
 * Si alguna vista deja de dibujarse, lo más probable es que use un tipo que no está
 * registrado aquí: añádelo a la lista y vuelve a construir.
 */
import Plotly from 'plotly.js/lib/core';
import scatter from 'plotly.js/lib/scatter';
import bar from 'plotly.js/lib/bar';
import box from 'plotly.js/lib/box';
import violin from 'plotly.js/lib/violin';
import histogram from 'plotly.js/lib/histogram';
import heatmap from 'plotly.js/lib/heatmap';
import scatterpolar from 'plotly.js/lib/scatterpolar';

Plotly.register([scatter, bar, box, violin, histogram, heatmap, scatterpolar]);

export interface PlotlyApi {
  newPlot: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => Promise<unknown>;
  react: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => Promise<unknown>;
  purge: (el: HTMLElement) => void;
}

export default Plotly as PlotlyApi;
