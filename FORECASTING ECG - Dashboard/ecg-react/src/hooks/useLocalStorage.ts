/**
 * Hook para persistencia de estado en localStorage
 */

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: SetValue<T>) => void;
  removeValue: () => void;
}

/**
 * Hook para persistir estado en localStorage
 * @param key - Clave en localStorage
 * @param initialValue - Valor inicial si no existe en localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue: UseLocalStorageReturn<T>['setValue'] = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          window.dispatchEvent(new Event('local-storage'));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.dispatchEvent(new Event('local-storage'));
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" on storage event:`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key]);

  return { value: storedValue, setValue, removeValue };
}

/**
 * Claves de localStorage usadas en la aplicación
 */
export const STORAGE_KEYS = {
  THEME: 'ecg-forecast-theme',
  SIDEBAR_OPEN: 'ecg-forecast-sidebar',
  ACTIVE_EXPERIMENT: 'ecg-forecast-experiment',
  ACTIVE_MODEL: 'ecg-forecast-model',
  ACTIVE_FILTER: 'ecg-forecast-filter',
  ACTIVE_PATIENT: 'ecg-forecast-patient',
  ACTIVE_TAB: 'ecg-forecast-tab',
} as const;

/**
 * Hook específico para el tema
 */
export function useThemeLocalStorage(defaultValue: 'dark' | 'light' = 'dark') {
  return useLocalStorage(STORAGE_KEYS.THEME, defaultValue);
}

/**
 * Hook específico para el estado del sidebar
 */
export function useSidebarLocalStorage(defaultValue: boolean = true) {
  return useLocalStorage(STORAGE_KEYS.SIDEBAR_OPEN, defaultValue);
}

/**
 * Hook específico para filtros de experimentos
 */
export function useFiltersLocalStorage() {
  const experiment = useLocalStorage(STORAGE_KEYS.ACTIVE_EXPERIMENT, 'nb1');
  const model = useLocalStorage(STORAGE_KEYS.ACTIVE_MODEL, null as string | null);
  const filtro = useLocalStorage(STORAGE_KEYS.ACTIVE_FILTER, null as string | null);
  const paciente = useLocalStorage(STORAGE_KEYS.ACTIVE_PATIENT, null as string | null);
  const activeTab = useLocalStorage(STORAGE_KEYS.ACTIVE_TAB, 'A');

  const resetFilters = useCallback(() => {
    experiment.setValue('nb1');
    model.setValue(null);
    filtro.setValue(null);
    paciente.setValue(null);
    activeTab.setValue('A');
  }, [experiment, model, filtro, paciente, activeTab]);

  return {
    experiment,
    model,
    filtro,
    paciente,
    activeTab,
    resetFilters,
  };
}
