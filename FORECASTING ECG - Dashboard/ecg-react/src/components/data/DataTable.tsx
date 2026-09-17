/**
 * Tabla de datos genérica con ordenamiento
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { useLang } from '@/i18n';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  caption?: string;
  maxHeight?: string;
  highlightBest?: boolean;
  highlightKey?: keyof T;
  highlightCondition?: (value: unknown) => boolean;
  /**
   * Filas por pagina. La tabla de datos crudos del Explorador tenia 5041 filas y
   * 45 390 celdas: 7.2 MB de arbol del documento en una sola pagina, que el
   * navegador tiene que construir, medir y pintar antes de responder a nada. Es la
   * razon de que esa vista tardara en cargar. `0` desactiva la paginacion, para
   * tablas cortas donde partirla no aporta nada.
   */
  porPagina?: number;
  /** Archivo del que salen los datos, para el pie de la tabla. */
  fuente?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  title,
  caption,
  maxHeight = '400px',
  highlightBest = false,
  highlightKey,
  highlightCondition,
  porPagina = 50,
  fuente,
}: DataTableProps<T>) {
  // El pie de paginacion estaba escrito solo en espanol.
  const { t } = useLang();

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const paginar = porPagina > 0 && sortedData.length > porPagina;
  const [pagina, setPagina] = useState(0);
  const totalPaginas = paginar ? Math.ceil(sortedData.length / porPagina) : 1;

  // Si los filtros reducen el conjunto, la pagina actual puede quedar fuera de
  // rango y la tabla se veria vacia sin explicacion.
  useEffect(() => {
    if (pagina > totalPaginas - 1) setPagina(0);
  }, [totalPaginas, pagina]);

  const desde = paginar ? pagina * porPagina : 0;
  const visibles = paginar ? sortedData.slice(desde, desde + porPagina) : sortedData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPagina(0);
  };

  const isHighlighted = (row: T): boolean => {
    if (highlightCondition && highlightKey) {
      return highlightCondition(row[highlightKey]);
    }
    return false;
  };

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    const value = row[column.key as keyof T];

    if (column.render) {
      return column.render(value, row);
    }

    if (value === null || value === undefined || value === '') {
      return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        // NaN e Infinito son resultados, no huecos: decirlo es mas honesto que
        // imprimir «NaN» crudo o, peor, un cero.
        return <span style={{ color: 'var(--text-muted)' }} title="Valor no definido">n/d</span>;
      }
      if (Math.abs(value) >= 1e6) {
        return value.toExponential(2);
      }
      if (Number.isInteger(value)) {
        return value.toString();
      }
      // Cuatro decimales fijos imprimian todo p-valor menor que 0.00005 como «0»,
      // que es justamente la afirmacion que no se puede hacer: un p-valor nunca es
      // cero, solo mas pequeno que la precision con que se calculo. Por debajo de
      // ese umbral se pasa a notacion cientifica.
      if (value !== 0 && Math.abs(value) < 1e-4) {
        return value.toExponential(2);
      }
      return value.toFixed(4);
    }

    return String(value);
  };

  return (
    <div>
      {title && (
        <h3
          style={{
            fontSize: 'var(--fs-base)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '16px',
            fontFamily: 'var(--font-display)',
          }}
        >
          {title}
        </h3>
      )}
      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          overflowX: 'auto',   /* faltaba: las tablas anchas se recortaban sin scroll */
          maxWidth: '100%',
          borderRadius: '12px',
          border: `1px solid ${'var(--border)'}`,
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-data)',
            fontSize: 'var(--fs-xs)',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--surface)',
              zIndex: 1,
            }}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                  style={{
                    padding: '12px 16px',
                    textAlign: column.align || 'left',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    borderBottom: `1px solid ${'var(--border)'}`,
                    cursor: column.sortable !== false ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.label}
                  {column.sortable !== false && sortKey === column.key && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : ''}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((row, indiceEnPagina) => {
              const rowIndex = desde + indiceEnPagina;
              return (
              <tr
                key={rowIndex}
                style={{
                  background: isHighlighted(row)
                    ? 'var(--accent-bg)'
                    : rowIndex % 2 === 0
                    ? 'transparent'
                    : 'var(--surface-2)',
                  fontWeight: isHighlighted(row) ? 600 : 400,
                }}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    style={{
                      padding: '10px 16px',
                      textAlign: column.align || 'left',
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginar && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap', marginTop: 10,
        }}>
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)',
            color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums',
          }}>
            {t(
              `Mostrando ${(desde + 1).toLocaleString('es')}–${Math.min(desde + porPagina, sortedData.length).toLocaleString('es')} de ${sortedData.length.toLocaleString('es')} filas`,
              `Showing ${(desde + 1).toLocaleString('en')}–${Math.min(desde + porPagina, sortedData.length).toLocaleString('en')} of ${sortedData.length.toLocaleString('en')} rows`,
            )}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Boton
              tamano="sm"
              variante="sutil"
              icono={<ChevronLeft size={14} aria-hidden />}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={pagina === 0}
              aria-label="Pagina anterior"
            >
              Anterior
            </Boton>
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)',
              color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums',
              minWidth: '7ch', textAlign: 'center',
            }}>
              {pagina + 1} / {totalPaginas}
            </span>
            <Boton
              tamano="sm"
              variante="sutil"
              iconoDerecha={<ChevronRight size={14} aria-hidden />}
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina >= totalPaginas - 1}
              aria-label="Pagina siguiente"
            >
              Siguiente
            </Boton>
          </div>
        </div>
      )}

      {(caption || fuente) && (
        <p
          style={{
            fontSize: 'var(--fs-2xs)',
            color: 'var(--text-muted)',
            marginTop: '8px',
            lineHeight: 1.5,
          }}
        >
          {caption && <span style={{ fontStyle: 'italic' }}>{caption}</span>}
          {caption && fuente && ' · '}
          {fuente && (
            <span style={{ fontFamily: 'var(--font-data)' }}>
              n = {sortedData.length.toLocaleString('es')} · Fuente: {fuente}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
