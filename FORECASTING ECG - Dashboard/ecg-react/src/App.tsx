import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { lazy, Suspense } from 'react';
import { useECGStore } from '@/store/useECGStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useEffect } from 'react';
import { Menu } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Boton } from '@/components/ui/Boton';

const HomePage = lazy(() => import('@/pages/Home').then(m => ({ default: m.HomePage })));
const ModelosPage = lazy(() => import('@/pages/Modelos').then(m => ({ default: m.ModelosPage })));
const ExperimentosPage = lazy(() => import('@/pages/Experimentos').then(m => ({ default: m.ExperimentosPage })));
const LopoPage = lazy(() => import('@/pages/Lopo').then(m => ({ default: m.LopoPage })));
const ManualPage = lazy(() => import('@/pages/Manual').then(m => ({ default: m.ManualPage })));
const GlosarioPage = lazy(() => import('@/pages/Glosario').then(m => ({ default: m.GlosarioPage })));
const ExploradorPage = lazy(() => import('@/pages/Explorador').then(m => ({ default: m.ExploradorPage })));
const CohortePage = lazy(() => import('@/pages/Cohorte').then(m => ({ default: m.CohortePage })));

/** Nombre legible de cada vista, para el mensaje de la barrera de error. */
const ROTULOS: Record<string, string> = {
  '/': 'la portada',
  '/modelos': 'la pagina de Modelos',
  '/experimentos': 'la pagina de Experimentos',
  '/lopo': 'la validacion LOPO',
  '/manual': 'el manual',
  '/glosario': 'el glosario',
  '/explorador': 'el explorador de datos',
  '/cohorte': 'la caracterizacion de la cohorte',
};

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
      Cargando...
    </div>
  );
}

/** Ruta inexistente. Antes no habia ninguna y la pagina se quedaba en blanco. */
function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: '14px', padding: '32px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-xs)', letterSpacing: '2px', color: 'var(--text-muted)' }}>
        ERROR 404
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', color: 'var(--text)', margin: 0 }}>
        Esta pagina no existe
      </h1>
      <p style={{ color: 'var(--text-sub)', maxWidth: '46ch', margin: 0 }}>
        No hay ninguna vista en <code style={{ fontFamily: 'var(--font-data)' }}>{location.pathname}</code>.
        Usa el menu lateral o vuelve al inicio.
      </p>
      <Boton onClick={() => navigate('/')} variante="primario" style={{ marginTop: 8 }}>
        Volver al inicio
      </Boton>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      {/* La barrera va dentro del enrutador y lleva la ruta como `key`: al navegar a
          otra vista se remonta limpia, de modo que un fallo en una pagina no deja
          atrapado al usuario en la pantalla de error. */}
      <ErrorBoundary key={location.pathname} ambito={ROTULOS[location.pathname]}>
        <Suspense fallback={<PageFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/modelos" element={<ModelosPage />} />
            <Route path="/experimentos" element={<ExperimentosPage />} />
            <Route path="/lopo" element={<LopoPage />} />
            <Route path="/manual" element={<ManualPage />} />
            <Route path="/glosario" element={<GlosarioPage />} />
            <Route path="/explorador" element={<ExploradorPage />} />
            <Route path="/cohorte" element={<CohortePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AnimatePresence>
  );
}

export default function App() {
  const theme = useECGStore((s) => s.theme);
  const isSidebarOpen = useECGStore((s) => s.isSidebarOpen);
  const toggleSidebar = useECGStore((s) => s.toggleSidebar);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      toggleSidebar();
    }
  }, [isMobile]);

  // Adjust margin to match the floating sidebar spacing
  const marginLeft = isMobile ? '0' : isSidebarOpen ? '252px' : '104px';

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
        <Navbar isMobile={isMobile} />

        <main style={{
          marginLeft,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          flex: 1,
          minHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          width: isMobile ? '100%' : `calc(100% - ${marginLeft})`,
          padding: isMobile ? '0' : '16px 16px 16px 0',
        }}>
          {isMobile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'var(--surface)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              zIndex: 90,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img loading="lazy" decoding="async" src="/img/logoECGF.png" alt="ECG Forecasting" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-xs)', color: 'var(--text)', letterSpacing: '0.5px' }}>ECG FORECASTING</span>
              </div>
              <button
                onClick={toggleSidebar}
                style={{ background: 'transparent', border: 'none', color: 'var(--text)', padding: '6px', cursor: 'pointer' }}
              >
                <Menu size={20} />
              </button>
            </div>
          )}
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
