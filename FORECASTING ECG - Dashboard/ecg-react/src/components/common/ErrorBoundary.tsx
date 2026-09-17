import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { Boton } from '@/components/ui/Boton';
import { PaginaDeError } from '@/components/ui/PaginaDeError';

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

  private recargar = () => {
    window.location.reload();
  };

  render() {
    const { error, intento } = this.state;
    if (!error) return <div key={intento}>{this.props.children}</div>;

    const ambito = this.props.ambito;

    // Dos fallos que se ven igual desde aqui pero no son lo mismo, y que no
    // merecen el mismo mensaje.
    //
    // Las vistas se cargan bajo demanda: si la descarga de ese trozo de codigo
    // no llega —conexion caida, servidor que no responde, despliegue nuevo que
    // invalido el nombre del archivo— el fallo sube por aqui igual que un error
    // de dibujado. Pero decirle al usuario que «se interrumpio el dibujado»
    // cuando lo que pasa es que no hay red le manda a buscar donde no es, y
    // ademas el boton de reintentar no le va a servir: hay que recargar.
    const mensaje = `${error.name}: ${error.message}`;
    const esDeRed = /dynamically imported module|Importing a module script failed|Failed to fetch|NetworkError|ChunkLoadError/i
      .test(mensaje) || !navigator.onLine;

    if (esDeRed) {
      return (
        <PaginaDeError
          variante="sin-conexion"
          codigo="Sin señal · No se pudo cargar la vista"
          titulo="No ha llegado el codigo de esta vista"
          descripcion={
            <>
              Las vistas se descargan cuando se abren, y esta no ha llegado. Suele ser la
              conexion, aunque tambien ocurre cuando se ha publicado una version nueva
              mientras la pagina estaba abierta. Recargar resuelve los dos casos.
              {!navigator.onLine && ' El navegador informa ademas de que no hay conexion.'}
            </>
          }
          acciones={
            <>
              <Boton onClick={this.recargar} variante="primario" icono={<RotateCcw size={15} aria-hidden />}>
                Recargar la pagina
              </Boton>
              <Boton onClick={this.volverAlInicio} variante="sutil" icono={<Home size={15} aria-hidden />}>
                Volver al inicio
              </Boton>
            </>
          }
        />
      );
    }

    return (
      <PaginaDeError
        variante="fallo"
        codigo="Error de dibujado"
        titulo={ambito ? `No se ha podido mostrar ${ambito}` : 'No se ha podido mostrar esta vista'}
        descripcion={
          <>
            Se ha interrumpido el dibujado de la pagina. La señal llega, pero corrompida:
            el resto de la aplicacion sigue funcionando, de modo que puedes reintentar el
            dibujado o volver al inicio y entrar por otra vista.
          </>
        }
        acciones={
          <>
            <Boton onClick={this.reintentar} variante="primario" icono={<RotateCcw size={15} aria-hidden />}>
              Reintentar
            </Boton>
            <Boton onClick={this.volverAlInicio} variante="sutil" icono={<Home size={15} aria-hidden />}>
              Volver al inicio
            </Boton>
          </>
        }
        pie={import.meta.env.DEV ? (
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
        ) : null}
      />
    );
  }
}
