/**
 * Hook genérico para cargar y parsear archivos CSV
 */

import { useState, useEffect, useCallback } from 'react';

interface UseCSVOptions {
  header?: boolean;
  delimiter?: string;
  dynamicTyping?: boolean;
}

interface UseCSVReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para cargar un archivo CSV y parsearlo a un array de objetos
 */
export function useCSV<T extends Record<string, unknown>>(
  url: string,
  options: UseCSVOptions = {}
): UseCSVReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { header = true, delimiter = ',' } = options;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();

      // Si el archivo no existe, el SPA devuelve index.html con codigo 200.
      // Sin esta comprobacion, parseCSV fabricaria filas de basura sin avisar.
      const inicio = csvText.slice(0, 400).toLowerCase();
      if (inicio.includes('<!doctype html') || inicio.includes('<html')) {
        throw new Error(`El archivo ${url} no existe: el servidor devolvio la pagina de la aplicacion.`);
      }

      const parsed = parseCSV<T>(csvText, { header, delimiter });

      setData(parsed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`Error loading CSV from ${url}:`, err);
    } finally {
      setLoading(false);
    }
  }, [url, header, delimiter, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { data, loading, error, refetch };
}

/**
 * Función para parsear texto CSV manualmente
 * (Alternativa simple sin dependencias)
 */
export function parseCSV<T extends Record<string, unknown>>(
  csvText: string,
  options: UseCSVOptions = {}
): T[] {
  const { header = true, delimiter = ',' } = options;
  const lines = csvText.trim().split('\n');

  if (lines.length === 0) return [];

  let headers: string[];

  if (header) {
    headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
    lines.shift();
  } else {
    const firstLineLength = lines[0].split(delimiter).length;
    headers = Array.from({ length: firstLineLength }, (_, i) => `col${i}`);
  }

  const result: T[] = lines
    .map((line) => {
      const values = parseCSVLine(line, delimiter);
      const obj: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim().replace(/^"|"$/g, '') ?? '';
        obj[header] = parseValue(value);
      });

      return obj as T;
    })
    .filter((row) => Object.values(row).some((v) => v !== null && v !== undefined && v !== ''));

  return result;
}

/**
 * Parsea una línea CSV manejando comillas
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Convierte un string a un valor apropiado (number, boolean, null)
 */
function parseValue(value: string): unknown {
  if (value === '' || value.toLowerCase() === 'nan') return null;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'null') return null;

  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }

  return value;
}

/**
 * Hook para cargar múltiples CSVs en paralelo
 */
export function useMultiCSV(
  urls: string[],
  options: UseCSVOptions = {}
): { results: Record<string, unknown[]>; loading: boolean; errors: Record<string, string> } {
  const [results, setResults] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setErrors({});

      const promises = urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const text = await response.text();
          const key = getFileName(url);
          return { url, key, data: parseCSV(text, options) };
        } catch (err) {
          return {
            url,
            key: getFileName(url),
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      });

      const settled = await Promise.all(promises);
      if (cancelled) return;

      const newResults: Record<string, unknown[]> = {};
      const newErrors: Record<string, string> = {};

      settled.forEach((result) => {
        if ('error' in result) {
          const key = result.url ?? result.key ?? 'unknown';
          if (result.error) {
            newErrors[key] = result.error;
          }
        } else {
          newResults[result.key] = result.data;
        }
      });

      setResults(newResults);
      setErrors(newErrors);
      setLoading(false);
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [urls.join(','), options]);

  return { results, loading, errors };
}

function getFileName(url: string): string {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.replace('.csv', '');
}
