import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';

/**
 * Barrera de error de toda la aplicacion.
 *
 * Antes solo existian dos barreras (la pagina LOPO entera y la pestana NB5), de modo
 * que un fallo de render en cualquier otra pagina dejaba la ventana en blanco, sin
 * barra lateral y sin forma de volver salvo recargar. Aqui se captura, se explica en
 * castellano y se ofrecen las dos salidas que el usuario necesita: reintentar el
 * render o volver al inicio.
 *
 * El detalle tecnico solo se despliega en desarrollo. En la version publicada no se
 * muestra ninguna traza: delante de un tribunal, una pila de llamadas no informa.
 */

interface Props {
  children: ReactNode;
  /** Nombre de la vista, para que el mensaje diga que ha fallado. */
  ambito?: string;
}

interface State {
  error: Error | null;
  /** Cambia en cada reintento para forzar el remontado del subarbol. */
  intento: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, intento: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola para depurar; no se muestra en la interfaz.
    console.error('[ErrorBoundary]', this.props.ambito ?? 'app', error, info.componentStack);
    // En desarrollo se manda tambien al servidor, que lo escribe en
    // `errores-render.log`. La consola del navegador no se puede leer desde la
    // linea de ordenes, y sin el mensaje exacto no hay forma de arreglar nada.
    if (import.meta.env.DEV) {
      void fetch('/__error', {
        method: 'POST',
        body: `${this.props.ambito ?? 'app'}
${error.name}: ${error.message}
${error.stack ?? ''}
--- arbol ---${info.componentStack ?? ''}`,
      }).catch(() => { /* si el servidor no responde, no hay nada que hacer */ });
    }
  }

  private reintentar = () => {
    // Incrementar el intento cambia la `key` del subarbol: React lo desmonta y lo
    // vuelve a montar de cero. Limpiar `error` sin remontar reproducia el mismo
    // fallo en el render siguiente, que era el defecto del boton anterior.
    this.setState((s) => ({ error: null, intento: s.intento + 1 }));
  };

  private volverAlInicio = () => {
    window.location.href = '/';
  };

  render() {
    const { error, intento } = this.state;
    if (!error) return <div key={intento}>{this.props.children}</div>;

    const ambito = this.props.ambito;

    return (
      <div
        role="alert"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: '16px',
          padding: '32px', textAlign: 'center',
        }}
      >
        <AlertTriangle size={36} style={{ color: 'var(--warn)' }} aria-hidden />

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)',
          color: 'var(--text)', margin: 0,
        }}>
          {ambito ? `No se ha podido mostrar ${ambito}` : 'No se ha podido mostrar esta vista'}
        </h1>

        <p style={{ color: 'var(--text-sub)', maxWidth: '52ch', margin: 0, lineHeight: 1.6 }}>
          Se ha interrumpido el dibujado de la pagina. El resto de la aplicacion sigue
          funcionando: puedes reintentar, o volver al inicio y entrar por otra vista.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Boton onClick={this.reintentar} variante="primario" icono={<RotateCcw size={15} aria-hidden />}>
            Reintentar
          </Boton>
          <Boton onClick={this.volverAlInicio} variante="sutil" icono={<Home size={15} aria-hidden />}>
            Volver al inicio
          </Boton>
        </div>

        {import.meta.env.DEV && (
          <details style={{ marginTop: '8px', maxWidth: '80ch', textAlign: 'left' }}>
            <summary style={{
              cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-data)',
            }}>
              Detalle tecnico (solo en desarrollo)
            </summary>
            <pre style={{
              marginTop: '8px', padding: '12px', overflow: 'auto', maxHeight: '30vh',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
              fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)',
              whiteSpace: 'pre-wrap',
            }}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
