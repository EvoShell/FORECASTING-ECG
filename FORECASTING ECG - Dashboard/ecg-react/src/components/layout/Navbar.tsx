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

export function Navbar({ isMobile }: { isMobile?: boolean }) {
  const location = useLocation();
  const theme = useECGStore((s) => s.theme);
  const toggleTheme = useECGStore((s) => s.toggleTheme);
  const isSidebarOpen = useECGStore((s) => s.isSidebarOpen);
  const toggleSidebar = useECGStore((s) => s.toggleSidebar);
  const { t, lang, setLang } = useLang();
  const routes = getRoutes(t);
  
  // Floating width calculation
  const width = isMobile ? '280px' : isSidebarOpen ? '220px' : '72px';
  // Offscreen placement on mobile if sidebar is closed
  const offset = isMobile && !isSidebarOpen ? '-320px' : '0';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            background: 'rgba(3, 7, 18, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <nav
        style={{
          width,
          minWidth: width,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateX(${offset})`,
          background: 'var(--surface)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          position: 'fixed',
          top: '16px',
          left: '16px',
          height: 'calc(100vh - 32px)',
          borderRadius: 'var(--radius-lg)',
          zIndex: 100,
          overflowY: 'auto',
          overflowX: 'visible',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Sidebar collapse/expand tab — centered on right edge */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{
              position: 'absolute',
              right: '-15px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '30px',
              height: '30px',
              background: 'var(--signal)',
              border: '3px solid var(--bg)',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              zIndex: 101,
              transition: 'background 0.2s, box-shadow 0.2s, border-color 0.3s',
              boxShadow: '0 2px 8px rgba(6,182,212,0.35)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--prediction)';
              el.style.boxShadow = '0 2px 14px rgba(6,182,212,0.55)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--signal)';
              el.style.boxShadow = '0 2px 8px rgba(6,182,212,0.35)';
            }}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={14} strokeWidth={2.5} color="#fff" />
            ) : (
              <ChevronRight size={14} strokeWidth={2.5} color="#fff" />
            )}
          </button>
        )}

        {/* Header / Brand */}
        <div style={{ 
          padding: isMobile || isSidebarOpen ? '0 20px 20px' : '0 8px 20px', 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', 
          gap: '0',
          position: 'relative',
        }}>
          {/* Logo + Title block */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile || isSidebarOpen ? '10px' : '6px',
            width: '100%',
          }}>
            <img loading="lazy" decoding="async"
              src="/img/logoECGF.png"
              alt="ECG Forecasting"
              style={{
                width: isMobile || isSidebarOpen ? '72px' : '40px',
                height: isMobile || isSidebarOpen ? '72px' : '40px',
                flexShrink: 0,
                borderRadius: '12px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(6,182,212,0.25))',
                transition: 'width 0.3s, height 0.3s',
              }}
            />
            <div style={{ 
              opacity: isMobile || isSidebarOpen ? 1 : 0, 
              maxHeight: isMobile || isSidebarOpen ? '50px' : '0',
              overflow: 'hidden',
              transition: 'opacity 0.25s, max-height 0.3s',
              textAlign: 'center',
            }}>
              <p style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.15,
                letterSpacing: '1.2px', margin: 0,
              }}>ECG FORECASTING</p>
              <p style={{
                fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)',
                color: 'var(--text-sub)', letterSpacing: '1.5px',
                marginTop: '3px',
              }}>CESMAG · 2025</p>
            </div>
          </div>

          {/* Mobile close button */}
          {isMobile && (
            <button 
              onClick={toggleSidebar}
              aria-label="Close sidebar"
              style={{
                position: 'absolute',
                top: '4px',
                right: '16px',
                width: '28px',
                height: '28px',
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-sub)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.1)';
                (e.currentTarget as HTMLElement).style.color = 'var(--prediction)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--elevated)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-sub)';
              }}
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ 
          height: '1px', 
          background: 'var(--border)', 
          margin: isMobile || isSidebarOpen ? '0 20px 16px' : '0 12px 16px' 
        }} />

        {/* Nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px' }}>
          {routes.map(({ path, label, icon: Icon }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => { if(isMobile) toggleSidebar(); }}
                title={!isMobile && !isSidebarOpen ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: isMobile || isSidebarOpen ? '10px 16px' : '12px',
                  justifyContent: isMobile || isSidebarOpen ? 'flex-start' : 'center',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text)' : 'var(--text-sub)',
                  background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(6, 182, 212, 0.25)' : '1px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.1)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-sub)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }
                }}
              >
                <Icon
                  size={isMobile || isSidebarOpen ? 16 : 18}
                  color={isActive ? 'var(--prediction)' : 'currentColor'}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ flexShrink: 0 }}
                />
                
                <span style={{ 
                  opacity: isMobile || isSidebarOpen ? 1 : 0, 
                  width: isMobile || isSidebarOpen ? 'auto' : 0,
                  display: isMobile || isSidebarOpen ? 'block' : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.2s',
                }}>
                  {label}
                </span>

                {isActive && (isMobile || isSidebarOpen) && (
                  <div style={{
                    marginLeft: 'auto',
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    background: 'var(--prediction)',
                    boxShadow: '0 0 8px var(--prediction)',
                  }} />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: isMobile || isSidebarOpen ? '16px 20px 0' : '16px 0 0', 
          borderTop: '1px solid var(--border)', 
          marginTop: '16px' 
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile || isSidebarOpen ? 'row' : 'column',
            alignItems: 'center', 
            justifyContent: isMobile || isSidebarOpen ? 'space-between' : 'center',
            gap: isMobile || isSidebarOpen ? '8px' : '12px',
            flexWrap: 'wrap',
          }}>
            {(isMobile || isSidebarOpen) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)',
                color: 'var(--text-sub)', letterSpacing: '1px',
              }}>
                <div className="pulse-indicator" style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--signal)',
                }} />
                MIT-BIH
              </div>
            )}
            
            <div style={{
              display: 'flex',
              flexDirection: isMobile || isSidebarOpen ? 'row' : 'column',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={toggleTheme}
                title={t(`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`, `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', cursor: 'pointer',
                  color: 'var(--text-sub)', padding: '8px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(6, 182, 212, 0.1)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6, 182, 212, 0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-sub)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', cursor: 'pointer',
                  color: 'var(--text-sub)', padding: '6px 9px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '4px',
                  borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                  fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(6, 182, 212, 0.1)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6, 182, 212, 0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-sub)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <Globe size={12} />
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
