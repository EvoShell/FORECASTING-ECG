import { useEffect, useState } from 'react';

/**
 * Filas de la tabla comparativa LOPO, leidas de los archivos de resultados.
 *
 * Esta tabla estaba escrita a mano en el JSX y mezclaba en las mismas columnas dos
 * cohortes distintas: los cuatro modelos de NB5B, evaluados sobre 48 pacientes de
 * MIT-BIH, y CNN_GRU_ATTN, evaluado sobre los 123 de MIT-BIH mas INCART. Sin una
 * columna que lo dijera, la tabla sugeria que 0.6734 supera a 0.5400 en igualdad de
 * condiciones, cuando la propia pagina Cohorte demuestra que INCART rinde
 * significativamente peor. Aqui cada fila declara su n y su cohorte.
 */
export interface FilaLopo {
  modelo: string;
  n: number;
  cohorte: string;
  r2: number;
  r2Std: number;
  ic95: [number, number] | null;
  rmse: number | null;
  mae: number | null;
  r2Ft: number | null;
  latenciaMs: number | null;
  fuente: string;
}

const N_MITBIH = 48;
const N_TOTAL = 123;

async function texto(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = await r.text();
  // Un servidor de desarrollo devuelve index.html ante una ruta inexistente; sin
  // esta comprobacion el CSV se parsearia como basura y la tabla saldria vacia.
  if (t.trimStart().startsWith('<')) throw new Error(`${url}: se recibio HTML, no CSV`);
  return t;
}

function filas(csv: string): Record<string, string>[] {
  const [cab, ...resto] = csv.trim().split(/\r?\n/);
  const cols = cab.split(',');
  return resto.filter(Boolean).map((l) => {
    const c = l.split(',');
    return Object.fromEntries(cols.map((k, i) => [k.trim(), (c[i] ?? '').trim()]));
  });
}

const num = (v: string | undefined): number | null => {
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : null;
};

export function useTablaLopo() {
  const [datos, setDatos] = useState<FilaLopo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [v2, attn, lopo, recalc] = await Promise.all([
          texto('/data/nb5b/tabla_resumen_v2.csv').then(filas),
          texto('/data/nb5/tabla_resumen.csv').then(filas),
          // El resumen de NB5 no trae MAE; se promedia sobre los 123 pliegues.
          texto('/data/nb5/resultados_lopo.csv').then(filas),
          fetch('/data/nb7/nb6_recalculo.json').then((r) => r.json() as Promise<{
            tabla_XXVIII_horizonte?: { media?: { R2_ft?: number } };
          }>),
        ]);
        if (!vivo) return;

        // tabla_resumen_v2 esta en formato largo: una fila por (Modelo, Metrica).
        const buscar = (m: string, met: string) =>
          v2.find((r) => r.Modelo === m && r['Métrica'] === met);

        const deNB5B = (base: string, etiqueta: string): FilaLopo | null => {
          const r2 = buscar(base, 'R2');
          if (!r2) return null;
          const ft = buscar(`${base}_FT`, 'R2');
          const lat = buscar(base, 'Latencia_ms');
          const latN = num(lat?.Media);
          return {
            modelo: etiqueta,
            n: num(r2.N) ?? N_MITBIH,
            cohorte: 'MIT-BIH',
            r2: num(r2.Media) ?? NaN,
            r2Std: num(r2.Std) ?? NaN,
            ic95: [num(r2.IC95_inf) ?? NaN, num(r2.IC95_sup) ?? NaN],
            rmse: num(buscar(base, 'RMSE')?.Media),
            mae: num(buscar(base, 'MAE')?.Media),
            r2Ft: num(ft?.Media),
            // La latencia del Ensemble se registro como 0.0: es la suma de sus
            // miembros, no una medida. Se muestra como ausente, no como cero.
            latenciaMs: latN && latN > 0 ? latN : null,
            fuente: '/data/nb5b/tabla_resumen_v2.csv',
          };
        };

        const pliegues = lopo.filter((r) => r.Modelo === 'CNN_GRU_ATTN');
        const maes = pliegues.map((r) => num(r.MAE_total)).filter((x): x is number => x !== null);
        const maeAttn = maes.length ? maes.reduce((s, x) => s + x, 0) / maes.length : null;

        const a = attn[0];
        const filaAttn: FilaLopo | null = a
          ? {
              modelo: 'CNN GRU ATTN',
              n: num(a.N_pacientes) ?? N_TOTAL,
              cohorte: 'MIT-BIH + INCART',
              r2: num(a.R2_total_mean) ?? NaN,
              r2Std: num(a.R2_total_std) ?? NaN,
              ic95: null,
              rmse: num(a.RMSE_total_mean),
              mae: maeAttn,
              r2Ft: recalc?.tabla_XXVIII_horizonte?.media?.R2_ft ?? null,
              latenciaMs: null,
              fuente: '/data/nb5/tabla_resumen.csv',
            }
          : null;

        const lista = [
          deNB5B('GRU_base', 'GRU base'),
          deNB5B('CNN_GRU', 'CNN GRU'),
          deNB5B('BiGRU_MHA', 'BiGRU MHA'),
          deNB5B('Ensemble', 'Ensemble'),
          filaAttn,
        ].filter((x): x is FilaLopo => x !== null);

        setDatos(lista);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido');
      }
    })();
    return () => { vivo = false; };
  }, []);

  return { datos, error };
}
