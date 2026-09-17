/**
 * Barra lateral.
 *
 * Lo que se corrigió respecto de la versión anterior, y por qué:
 *
 * 1. **Los colores eran fijos y suponían tema oscuro.** El fondo del hover era
 *    `rgba(255,255,255,0.04)` y el acento `rgba(6,182,212,…)`. Un blanco al 4 %
 *    sobre fondo blanco no se ve: en tema claro el hover no existía. Además ese
 *    cian no estaba en el sistema de tokens, así que la barra era la única pieza
 *    del tablero con su propia paleta. Ahora todo sale de los tokens.
 *
 * 2. **Los estados vivían en JavaScript.** Había ocho `onMouseEnter`/`onMouseLeave`
 *    que reescribían estilos a mano. Ahora están en CSS (`.barra-lateral-*`), que
 *    además da `:focus-visible` para quien navega con teclado, cosa que antes no
 *    existía.
 *
 * 3. **El logotipo era un PNG con sombra cian.** Ahora se usa el SVG de marca
 *    `logo-mono.svg`, cuyo relleno es `currentColor`, pintado por máscara CSS: un
 *    solo archivo que se adapta al tema y escala sin pérdida a cualquier tamaño.
 *
 * 4. **Los resplandores no encajaban.** El punto activo con `box-shadow` difuso y
 *    la pestaña circular brillante venían de otro lenguaje visual. La página
 *    activa se marca ahora con una franja de 2 px a la izquierda, la misma
 *    convención que usan los avisos del resto del tablero.
 */
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Brain, Zap,
  BookOpen, BookText, Sun, Moon,
  ChevronLeft, ChevronRight, FlaskConical, Search, Globe, Users } from 'lucide-react';
import { useECGStore } from '@/store/useECGStore';
import { useLang } from '@/i18n';
import type { TFn } from '@/i18n';

const getRoutes = (t: TFn) => [
  { path: '/',              label: 'Home',                          icon: Home },
  { path: '/modelos',       label: t('Modelos', 'Models'),          icon: Brain },
  { path: '/experimentos',  label: t('Experimentos', 'Experiments'),icon: FlaskConical },
  { path: '/explorador',    label: t('Explorador', 'Explorer'),     icon: Search },
  { path: '/lopo',          label: t('Predicción LOPO', 'LOPO Prediction'), icon: Zap },
  { path: '/cohorte',       label: t('Cohorte y método', 'Cohort & method'), icon: Users },
  { path: '/manual',        label: t('Manual', 'User Guide'),       icon: BookOpen },
  { path: '/glosario',      label: t('Glosario', 'Glossary'),       icon: BookText },
];

/** Ruta del logotipo de marca. La variante `mono` hereda el color del texto. */
const LOGO = '/brand/svg/logo-mono.svg';

export function Navbar({ isMobile }: { isMobile?: boolean }) {
  const location = useLocation();
  const theme = useECGStore((s) => s.theme);
  const toggleTheme = useECGStore((s) => s.toggleTheme);
  const isSidebarOpen = useECGStore((s) => s.isSidebarOpen);
  const toggleSidebar = useECGStore((s) => s.toggleSidebar);
  const { t, lang, setLang } = useLang();
  const routes = getRoutes(t);

  /** Desplegada en móvil y cuando el usuario la abre; si no, solo iconos. */
  const amplia = Boolean(isMobile) || isSidebarOpen;
  const width = isMobile ? '280px' : isSidebarOpen ? '224px' : '68px';
  const offset = isMobile && !isSidebarOpen ? '-320px' : '0';
  // El trazado del logotipo mide 480 × 408: la altura es el 85 % del ancho.
  const logoAncho = amplia ? 92 : 38;
  const logoAlto = Math.round(logoAncho * 408 / 480);

  return (
    <>
      {isMobile && isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
          }}
        />
      )}

      <nav
        aria-label={t('Navegación principal', 'Main navigation')}
        style={{
          width,
          minWidth: width,
          transition: 'width 0.24s ease, transform 0.24s ease',
          transform: `translateX(${offset})`,
          background: 'var(--surface)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
          position: 'fixed',
          top: '16px',
          left: '16px',
          height: 'calc(100vh - 32px)',
          borderRadius: 'var(--radius-lg)',
          zIndex: 100,
          // La barra NO recorta ni se desplaza: eso lo hace la lista de páginas.
          //
          // Antes aquí ponía `overflowY: auto` con `overflowX: visible`, y esa
          // pareja no existe: cuando un eje es `visible` y el otro no, el CSS
          // obliga a que el `visible` compute a `auto`. El resultado medido eran
          // 11 px de desplazamiento horizontal en las tres rutas, plegada y
          // desplegada. Los 11 px son exactamente lo que sobresale la pestaña de
          // plegar, que vive en `right: -11px`.
          //
          // Con `visible` en los dos ejes la pestaña deja de recortarse y no hay
          // nada que desplazar. El desplazamiento vertical, que sí hace falta
          // cuando la ventana es baja, se traslada a la lista de páginas.
          overflow: 'visible',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Pestaña para plegar y desplegar. Antes era un círculo cian con halo;
            ahora es una pastilla de la misma superficie y borde que la barra. */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="barra-lateral-boton"
            aria-label={isSidebarOpen
              ? t('Plegar la barra lateral', 'Collapse sidebar')
              : t('Desplegar la barra lateral', 'Expand sidebar')}
            aria-expanded={isSidebarOpen}
            style={{
              position: 'absolute',
              right: '-11px',
              top: '46px',
              width: '22px',
              height: '34px',
              padding: 0,
              background: 'var(--surface)',
              zIndex: 101,
            }}
          >
            <span style={{ display: 'flex' }}>
              {isSidebarOpen
                ? <ChevronLeft size={13} strokeWidth={2.25} aria-hidden />
                : <ChevronRight size={13} strokeWidth={2.25} aria-hidden />}
            </span>
          </button>
        )}

        {/* Marca */}
        <div
          style={{
            padding: amplia ? '0 18px 18px' : '0 8px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: amplia ? '10px' : '0',
            position: 'relative',
          }}
        >
          <span
            className="barra-lateral-logo"
            role="img"
            aria-label={t('Logotipo de ECG Forecasting', 'ECG Forecasting logo')}
            style={{
              width: logoAncho,
              height: logoAlto,
              // El acento del tablero, no un cian suelto. Al ser máscara, este
              // color es el que pinta el trazado entero.
              color: 'var(--accent)',
            }}
          />

          <div
            style={{
              opacity: amplia ? 1 : 0,
              maxHeight: amplia ? '52px' : 0,
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, max-height 0.24s ease',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                color: 'var(--text)',
                lineHeight: 1.2,
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              ECG FORECASTING
            </p>
            <p
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 'var(--fs-3xs)',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
                margin: '3px 0 0',
              }}
            >
              CESMAG · 2025
            </p>
          </div>

          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="barra-lateral-boton"
              aria-label={t('Cerrar la barra lateral', 'Close sidebar')}
              style={{ position: 'absolute', top: 0, right: '14px', width: '26px', height: '26px', padding: 0 }}
            >
              <span style={{ display: 'flex' }}>
                <ChevronLeft size={14} strokeWidth={2.25} aria-hidden />
              </span>
            </button>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: amplia ? '0 18px 14px' : '0 12px 14px' }} />

        {/* Páginas.
            Aquí es donde se desplaza, y solo en vertical. `minHeight: 0` no es
            decorativo: sin él, un hijo de una caja flexible no se encoge por
            debajo de su contenido y el desplazamiento nunca llega a activarse. */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          padding: '0 10px',
        }}>
          {routes.map(({ path, label, icon: Icon }) => {
            const activa = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

            return (
              <NavLink
                key={path}
                to={path}
                className="barra-lateral-enlace"
                data-activo={activa ? 'si' : 'no'}
                aria-current={activa ? 'page' : undefined}
                onClick={() => { if (isMobile) toggleSidebar(); }}
                title={!amplia ? label : undefined}
                style={{
                  padding: amplia ? '9px 13px' : '10px 0',
                  justifyContent: amplia ? 'flex-start' : 'center',
                }}
              >
                <Icon
                  size={17}
                  color={activa ? 'var(--accent)' : 'currentColor'}
                  strokeWidth={activa ? 2.25 : 1.9}
                  aria-hidden
                  style={{ flexShrink: 0 }}
                />
                {amplia && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Pie: base de datos, tema e idioma */}
        <div
          style={{
            padding: amplia ? '14px 18px 0' : '14px 0 0',
            borderTop: '1px solid var(--border)',
            marginTop: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: amplia ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: amplia ? 'space-between' : 'center',
              gap: amplia ? '8px' : '10px',
              flexWrap: 'wrap',
            }}
          >
            {amplia && (
              <span
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 'var(--fs-3xs)',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                }}
              >
                MIT-BIH · INCART
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: amplia ? 'row' : 'column', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={toggleTheme}
                className="barra-lateral-boton"
                aria-label={theme === 'dark'
                  ? t('Cambiar a tema claro', 'Switch to light theme')
                  : t('Cambiar a tema oscuro', 'Switch to dark theme')}
                style={{ width: '30px', height: '28px', padding: 0 }}
              >
                <span style={{ display: 'flex' }}>
                  {theme === 'dark' ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
                </span>
              </button>

              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                className="barra-lateral-boton"
                aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
                style={{ height: '28px', padding: '0 8px' }}
              >
                <span style={{ display: 'flex' }}>
                  <Globe size={12} aria-hidden />
                </span>
                <span>{lang === 'es' ? 'EN' : 'ES'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
