import { useECGStore } from '@/store/useECGStore';

/**
 * Indica si el tema activo es el oscuro.
 *
 * Antes cada componente lo deducia buscando una clase CSS en el elemento raiz, pero la
 * aplicacion fija el tema con el atributo `data-theme` (ver App.tsx). Esa comprobacion daba
 * siempre falso y, como el tema por defecto es el oscuro, se pintaba texto de tema claro
 * sobre fondo oscuro: el titulo «Hallazgos Principales» quedaba con un contraste de 1.30:1,
 * es decir, invisible, y aparecia cinco veces en la pagina de experimentos.
 *
 * Leerlo del store ademas lo hace reactivo: al cambiar de tema los componentes se repintan.
 */
export function useIsDark(): boolean {
  return useECGStore((s) => s.theme) === 'dark';
}
