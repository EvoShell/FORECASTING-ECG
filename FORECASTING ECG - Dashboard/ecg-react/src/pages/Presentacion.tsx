/**
 * Módulo «Presentación»: la sustentación del trabajo de grado dentro del tablero.
 *
 * La presentación no es un componente de React. Vive como página estática y
 * autocontenida en `public/sustentacion/index.html` (carpeta con otro nombre que la ruta `/presentacion`, para que nginx y Vercel no sirvan el HTML suelto al recargar), que genera
 * `SUSTENTACION/presentacion/build/build_html.py`. Así ningún estilo del tablero
 * la alcanza y se ve idéntica a la que se proyecta en la sala.
 *
 * Esta vista la muestra en un marco 16:9. El botón «Iniciar presentación» pone el
 * marco en pantalla completa en el mismo clic, porque el navegador solo concede la
 * pantalla completa a un gesto del usuario. Después le pasa el foco al marco, para
 * que las flechas y el puntero inalámbrico respondan de inmediato. Con Esc se
 * vuelve al tablero.
 */
import { useEffect, useRef, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Boton } from '@/components/ui/Boton';
import { Maximize, ExternalLink } from 'lucide-react';
import { useLang } from '@/i18n';

const RUTA = '/sustentacion/index.html';

export function PresentacionPage() {
  const { t } = useLang();
  const marco = useRef<HTMLIFrameElement>(null);
  const [completa, setCompleta] = useState(false);

  useEffect(() => {
    const alCambiar = () => {
      const activa = document.fullscreenElement === marco.current;
      setCompleta(activa);
      // Al salir con Esc, el foco regresa al marco para poder seguir navegando.
      if (!activa) marco.current?.focus();
    };
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  const iniciar = async () => {
    const m = marco.current;
    if (!m) return;
    try {
      await m.requestFullscreen();
    } catch {
      // Si el navegador niega la pantalla completa, la presentación sigue en el marco.
    }
    m.focus();
    m.contentWindow?.focus();
  };

  return (
    <PageWrapper accentColor="rgba(0,255,136,0.04)">
      <p className="eyebrow" style={{ marginBottom: '8px' }}>{t('Sustentación', 'Thesis defense')}</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xl)', color: 'var(--text)', marginBottom: '12px' }}>
        {t('Presentación de la sustentación', 'Thesis defense presentation')}
      </h1>
      <p style={{ color: 'var(--text-sub)', maxWidth: '70ch', lineHeight: 1.6, marginBottom: '20px' }}>
        {t(
          'Presentación animada con los datos reales del proyecto: 25 diapositivas y 4 de respaldo. Se abre en pantalla completa; se avanza con las flechas, la barra espaciadora o el puntero inalámbrico, y se sale con Esc. La presentación está en español.',
          'Animated presentation built from the project\'s real data: 25 slides plus 4 backup slides. It opens full screen; advance with the arrow keys, the space bar or a wireless presenter, and exit with Esc. The presentation is in Spanish.',
        )}
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <Boton variante="primario" tamano="lg" icono={<Maximize size={18} />} onClick={iniciar}>
          {t('Iniciar presentación', 'Start presentation')}
        </Boton>
        <Boton variante="secundario" tamano="lg" icono={<ExternalLink size={18} />} onClick={() => window.open(RUTA, '_blank', 'noopener')}>
          {t('Abrir en otra pestaña', 'Open in a new tab')}
        </Boton>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid var(--border-strong)',
          background: '#04070c',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <iframe
          ref={marco}
          src={RUTA}
          title={t('Presentación de la sustentación', 'Thesis defense presentation')}
          allow="fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block', background: '#04070c' }}
        />
      </div>

      <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)', marginTop: '14px', lineHeight: 1.6 }} aria-live="polite">
        {completa
          ? t('En pantalla completa. Pulse Esc para volver al tablero.', 'Full screen. Press Esc to return to the dashboard.')
          : t(
              'Teclas: → o Página abajo para avanzar · ← o Página arriba para retroceder · número y Enter para ir a una diapositiva · R para las de respaldo · P para la ventana del presentador, con el cronómetro.',
              'Keys: → or Page Down to advance · ← or Page Up to go back · number and Enter to jump to a slide · R for backup slides · P for the presenter window, with the timer.',
            )}
      </p>
    </PageWrapper>
  );
}
