import { useECGStore } from '@/store/useECGStore';

export type Lang = 'es' | 'en';
export type TFn = (es: string, en: string) => string;

/**
 * Lightweight i18n hook — returns current language, setter, and a `t(es, en)` helper.
 */
export function useLang() {
  const lang = useECGStore(s => s.lang) as Lang;
  const setLang = useECGStore(s => s.setLang);
  const t: TFn = (es, en) => (lang === 'en' ? en : es);
  return { lang, setLang, t };
}
