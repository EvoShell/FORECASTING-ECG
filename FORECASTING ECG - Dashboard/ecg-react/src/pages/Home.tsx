import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Database, Zap, FlaskConical, Brain, BarChart2, Activity, GitCompare, Search, Info } from 'lucide-react';
import { PageWrapper, containerVariants, itemVariants } from '@/components/layout/PageWrapper';
import { useECGStore } from '@/store/useECGStore';
import { useLang } from '@/i18n';
import { MetricStat, MetricGrid } from '@/components/metrics/MetricStat';
import { useReferenciaNB6, FUENTE_LOPO } from '@/hooks/useReferenciaNB6';
import SoftAurora from '@/components/ui/SoftAurora';
import { PapelECG } from '@/components/ui/PapelECG';
import ShinyText from '@/components/ui/ShinyText';
import { FindingCard } from '@/components/ui/FindingCard';

// ECG hero animation data — realistic beat-to-beat variability
function generateLiveECG(points = 600) {
  const data: number[] = [];
  const fs = 100; // samples per "second" in our virtual timeline
  let t = 0;

  // Generate individual beats with random variation
  while (data.length < points) {
    // Heart Rate Variability: RR interval varies 0.75–1.05s (57–80 BPM)
    const rrInterval = 0.82 + (Math.random() - 0.5) * 0.26;
    const beatSamples = Math.round(rrInterval * fs);

    // Per-beat morphological variation
    const pAmp = 0.12 + Math.random() * 0.08;         // P-wave: 0.12–0.20
    const rAmp = 0.85 + Math.random() * 0.45;         // R-peak: 0.85–1.30
    const qAmp = -(0.06 + Math.random() * 0.06);      // Q-wave: -0.06 to -0.12
    const sAmp = -(0.10 + Math.random() * 0.10);      // S-wave: -0.10 to -0.20
    const tAmp = 0.18 + Math.random() * 0.18;         // T-wave: 0.18–0.36
    const pWidth = 0.018 + Math.random() * 0.008;     // P width variation
    const tWidth = 0.035 + Math.random() * 0.015;     // T width variation
    const qrsShift = (Math.random() - 0.5) * 0.01;    // slight QRS timing jitter
    const tShift = (Math.random() - 0.5) * 0.03;      // T-wave timing jitter

    // Occasional premature beat (~8% chance): taller R, shorter RR
    const isPVC = Math.random() < 0.08;
    const rFinal = isPVC ? rAmp * 1.4 : rAmp;
    const tFinal = isPVC ? tAmp * 0.5 : tAmp;

    for (let s = 0; s < beatSamples; s++) {
      const cycle = s / beatSamples; // 0..1 within this beat

      const p = pAmp * Math.exp(-Math.pow((cycle - 0.10) / pWidth, 2));
      const q = qAmp * Math.exp(-Math.pow((cycle - (0.18 + qrsShift)) / 0.006, 2));
      const r = rFinal * Math.exp(-Math.pow((cycle - (0.20 + qrsShift)) / 0.008, 2));
      const sv = sAmp * Math.exp(-Math.pow((cycle - (0.22 + qrsShift)) / 0.006, 2));
      const tw = tFinal * Math.exp(-Math.pow((cycle - (0.36 + tShift)) / tWidth, 2));

      // Subtle baseline wander + noise
      const wander = 0.02 * Math.sin(2 * Math.PI * t * 0.15);
      const noise = (Math.random() - 0.5) * 0.012;

      data.push(p + q + r + sv + tw + wander + noise);
      t += 1 / fs;
    }
  }

  return data.slice(0, points);
}

function ECGHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const theme = useECGStore((s) => s.theme);

  const stateRef = useRef({
    buffer: new Float32Array(0),
    written: new Uint8Array(0),
    cursor: 0,
    sampleAccum: 0,
    beatQueue: [] as number[],
    lastBPM: 72,
    initialized: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const st = stateRef.current;

    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      const newBuf = new Float32Array(canvas.width);
      const newWritten = new Uint8Array(canvas.width);
      if (st.buffer.length > 0) {
        const copyLen = Math.min(st.buffer.length, newBuf.length);
        for (let i = 0; i < copyLen; i++) { newBuf[i] = st.buffer[i % st.buffer.length]; newWritten[i] = st.written[i % st.written.length]; }
      }
      st.buffer = newBuf;
      st.written = newWritten;
      if (!st.initialized) { st.cursor = 0; st.initialized = true; }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function generateBeat(): number[] {
      const fs = 360;
      const bpm = st.lastBPM + (Math.random() - 0.5) * 12;
      st.lastBPM = Math.max(58, Math.min(90, bpm));
      const N = Math.round((60 / st.lastBPM) * fs);
      const pA = 0.10 + Math.random() * 0.08;
      const rA = 0.80 + Math.random() * 0.50;
      const qA = -(0.05 + Math.random() * 0.07);
      const sA = -(0.08 + Math.random() * 0.12);
      const tA = 0.15 + Math.random() * 0.20;
      const uA = Math.random() < 0.3 ? 0.03 + Math.random() * 0.04 : 0;
      const pW = 0.020 + Math.random() * 0.008;
      const tW = 0.032 + Math.random() * 0.018;
      const qJ = (Math.random() - 0.5) * 0.008;
      const tJ = (Math.random() - 0.5) * 0.025;
      const isPVC = Math.random() < 0.06;
      const rF = isPVC ? rA * 1.5 : rA;
      const tF = isPVC ? -tA * 0.6 : tA;
      const qW = isPVC ? 0.012 : 0.008;
      const out: number[] = [];
      for (let i = 0; i < N; i++) {
        const c = i / N;
        const pc = (c - 0.10) / pW; const qc = (c - (0.175 + qJ)) / 0.006;
        const rc = (c - (0.195 + qJ)) / qW; const sc = (c - (0.215 + qJ)) / 0.007;
        const tc = (c - (0.35 + tJ)) / tW; const uc = (c - (0.48 + tJ)) / 0.025;
        out.push(
          pA * Math.exp(-(pc * pc)) +
          qA * Math.exp(-(qc * qc)) +
          rF * Math.exp(-(rc * rc)) +
          sA * Math.exp(-(sc * sc)) +
          tF * Math.exp(-(tc * tc)) +
          uA * Math.exp(-(uc * uc)) +
          0.015 * Math.sin(2 * Math.PI * (i / fs) * 0.18) +
          (Math.random() - 0.5) * 0.008
        );
      }
      return out;
    }

    const SPEED = 2.0;        // pixels per frame (~120 px/sec at 60fps)
    const SAMPLES_PER_PX = 3; // compress 3 ECG samples into 1 pixel — fits ~3x more beats
    const ERASER_W = 30;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#040813' : '#ffffff';
    let lastT = 0;

    const draw = (time: number) => {
      if (!lastT) lastT = time;
      const dt = Math.min(time - lastT, 50);
      lastT = time;
      const { width: W, height: H } = canvas;
      if (W === 0 || H === 0) { animRef.current = requestAnimationFrame(draw); return; }
      const buf = st.buffer;
      const midY = H * 0.5;
      const amp = H / 3.2;

      st.sampleAccum += SPEED * (dt / 16.67);
      const steps = Math.floor(st.sampleAccum);
      st.sampleAccum -= steps;
      for (let s = 0; s < steps; s++) {
        // Consume SAMPLES_PER_PX samples, keep the peak (max abs) for this pixel
        let best = 0;
        for (let k = 0; k < SAMPLES_PER_PX; k++) {
          if (st.beatQueue.length === 0) st.beatQueue = generateBeat();
          const v = st.beatQueue.shift()!;
          if (Math.abs(v) > Math.abs(best)) best = v;
        }
        buf[st.cursor] = best;
        st.written[st.cursor] = 1;
        st.cursor++;
        // When cursor reaches the end, wipe everything and restart
        if (st.cursor >= W) {
          st.cursor = 0;
          st.buffer.fill(0);
          st.written.fill(0);
          st.beatQueue = [];
          break;
        }
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // Grid (ECG graph paper style)
      ctx.lineWidth = 0.5;
      
      // Draw minor grid lines (small squares)
      ctx.strokeStyle = isDark ? 'rgba(6, 182, 212, 0.04)' : 'rgba(8, 145, 178, 0.04)';
      const stepMinor = 15;
      for (let x = 0; x < W; x += stepMinor) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += stepMinor) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      
      // Draw major grid lines (large squares - every 5 minor squares)
      ctx.strokeStyle = isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(8, 145, 178, 0.12)';
      ctx.lineWidth = 1.0;
      const stepMajor = stepMinor * 5;
      for (let x = 0; x < W; x += stepMajor) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += stepMajor) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Signal trace with age-based fade and intense glow
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = isDark ? 'rgba(34, 211, 238, 0.8)' : 'rgba(8, 145, 178, 0.6)';
      ctx.shadowBlur = isDark ? 8 : 4;

      const trailStart = (st.cursor + ERASER_W) % W;
      let prevAlpha = -1;
      let drawing = false;
      for (let i = 0; i < W; i++) {
        const x = (trailStart + i) % W;
        const dist = (st.cursor - x + W) % W;
        if ((dist < ERASER_W && dist > 0) || !st.written[x]) {
          if (drawing) { ctx.stroke(); drawing = false; }
          continue;
        }
        const alpha = Math.max(0.10, 1 - (dist / W) * 0.8);
        const y = midY - buf[x] * amp;
        const aRound = Math.round(alpha * 20) / 20;
        if (aRound !== prevAlpha) {
          if (drawing) ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = isDark 
            ? `rgba(34, 211, 238, ${aRound})` 
            : `rgba(8, 145, 178, ${aRound})`;
          ctx.moveTo(x, y);
          prevAlpha = aRound;
          drawing = true;
        } else if (!drawing) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (drawing) ctx.stroke();

      // Eraser gradient
      ctx.shadowBlur = 0;
      const eS = st.cursor;
      const eE = (eS + ERASER_W) % W;
      if (eE > eS) {
        const eg = ctx.createLinearGradient(eS, 0, eE, 0);
        eg.addColorStop(0, 'transparent');
        eg.addColorStop(1, bgColor);
        ctx.fillStyle = eg;
        ctx.fillRect(eS, 0, ERASER_W, H);
      }

      // Glowing cursor dot
      const cX = (st.cursor - 1 + W) % W;
      const cY = midY - buf[cX] * amp;
      const glow = ctx.createRadialGradient(cX, cY, 0, cX, cY, 12);
      glow.addColorStop(0, isDark ? 'rgba(34, 211, 238, 0.8)' : 'rgba(8, 145, 178, 0.6)');
      glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cX - 12, cY - 12, 24, 24);
      ctx.beginPath();
      ctx.arc(cX, cY, 4, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#22d3ee' : '#0891b2';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cX, cY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resizeCanvas); };
  }, [theme]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Defined animation constants for semantic clarity and to satisfy strict typing
const containerAnim = containerVariants;
const itemAnim = itemVariants;

export function HomePage() {
  const navigate = useNavigate();
  // Las cifras del bloque de resultado se leen del archivo, no van escritas a mano.
  const referencia = useReferenciaNB6();
  const R = referencia.base;
  const porBase = referencia.porBase['MIT-BIH'] && referencia.porBase['INCART']
    ? {
        mitbih: referencia.porBase['MIT-BIH'].media,
        incart: referencia.porBase['INCART'].media,
      }
    : null;
  const theme = useECGStore((s) => s.theme);
  const { t, lang } = useLang();

  return (
    <PageWrapper accentColor="rgba(59,130,246,0.04)">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginBottom: '24px',
        paddingTop: '32px',
        paddingBottom: '0px',
      }}>

        {/* Top: text */}
        <motion.div variants={containerAnim} initial="initial" animate="animate" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Background animated SoftAurora isolated to title */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100vw',
            height: '100%',
            zIndex: -1,
            opacity: theme === 'dark' ? 0.75 : 0.45,
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse closest-side at center, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse closest-side at center, black 0%, transparent 100%)',
          }}>
            <SoftAurora
              speed={theme === 'dark' ? 0.4 : 0.25}
              scale={1.4}
              brightness={theme === 'dark' ? 0.8 : 0.4}
              color1={theme === 'dark' ? '#06b6d4' : '#0891b2'}
              color2={theme === 'dark' ? '#1d4ed8' : '#3b82f6'}
              enableMouseInteraction={false}
            />
          </div>

          <motion.p variants={itemAnim} className="eyebrow" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <img loading="lazy" decoding="async"
              src="/img/logoUniv.png"
              alt={t('Universidad CESMAG', 'CESMAG University')}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{ width: '52px', height: '52px', objectFit: 'contain', flexShrink: 0 }}
            />
          {t('Universidad CESMAG · Ingeniería de Sistemas · Trabajo de grado · 2025 – 2026', 'CESMAG University · Systems Engineering · Undergraduate thesis · 2025 – 2026')}
        </motion.p>
          <motion.h1 variants={itemAnim} style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 3.8vw, 3rem)',
            color: 'var(--text)',
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
            marginBottom: '40px',
            maxWidth: '1200px',
            textAlign: 'center',
          }}>
            {/* Línea 1: Predicción de [arritmias cardíacas] a partir de */}
            <ShinyText
              text={t('Predicción de ', 'Prediction of ')}
              speed={4}
              color={theme === 'dark' ? 'var(--text)' : '#1e293b'}
              shineColor={theme === 'dark' ? 'white' : '#636976ff'}
            />
            <ShinyText
              text={t('arritmias cardíacas', 'cardiac arrhythmias')}
              speed={4}
              color={theme === 'dark' ? 'var(--signal)' : '#2563eb'}
              shineColor={theme === 'dark' ? '#ffffff' : '#60a5fa'}
              className={theme === 'dark' ? "drop-shadow-[0_0_24px_rgba(59,130,246,0.3)]" : "drop-shadow-sm font-black"}
            />
            <ShinyText
              text={t(' a partir de', ' from')}
              speed={4}
              color={theme === 'dark' ? 'var(--text)' : '#1e293b'}
              shineColor={theme === 'dark' ? 'white' : '#636976ff'}
            />
            <br />
            {/* Línea 2 */}
            <ShinyText
              text={t('señales de electrocardiograma utilizando modelos de', 'electrocardiogram signals using')}
              speed={4}
              color={theme === 'dark' ? 'var(--text)' : '#1e293b'}
              shineColor={theme === 'dark' ? 'white' : '#636976ff'}
            />
            <br />
            {/* Línea 3: forecasting basados en [redes neuronales recurrentes] */}
            <ShinyText
              text={t('forecasting basados en ', 'forecasting models based on ')}
              speed={4}
              color={theme === 'dark' ? 'var(--text)' : '#1e293b'}
              shineColor={theme === 'dark' ? 'white' : '#636976ff'}
            />
            <ShinyText
              text={t('redes neuronales recurrentes', 'recurrent neural networks')}
              speed={4}
              color={theme === 'dark' ? 'var(--signal)' : '#2563eb'}
              shineColor={theme === 'dark' ? '#ffffff' : '#60a5fa'}
              className={theme === 'dark' ? "drop-shadow-[0_0_24px_rgba(59,130,246,0.3)]" : "drop-shadow-sm font-black"}
            />
          </motion.h1>

        </motion.div>

        {/* Bottom: ECG canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, delay: 0.3 } }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            height: '200px',
            width: '100%',
            position: 'relative',
            borderRadius: '28px',
            marginBottom: '0px',
          }}
        >
          <div style={{
            position: 'absolute', top: '12px', left: '16px',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)',
            color: 'var(--text-muted)', letterSpacing: '2px',
            zIndex: 2,
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--signal)', boxShadow: '0 0 6px var(--signal)' }} />
            {t('TRAZADO SINTÉTICO · ANIMACIÓN DECORATIVA', 'SYNTHETIC TRACE · DECORATIVE ANIMATION')}
          </div>
          <ECGHeroCanvas />
        </motion.div>
      </div>

      {/* ── 5. Equipo de Investigación ────────────────────────────── */}
      <motion.section
        variants={containerAnim}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        style={{ marginBottom: '64px' }}
      >
        <motion.p variants={itemAnim} className="eyebrow" style={{ marginBottom: '20px' }}>{t('Equipo de Investigación', 'Research Team')}</motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {[
            {
              img: '/img/DarwinBurbano.JPG',
              name: 'Darwin David Burbano Guerrero',
              role: t('Investigador', 'Researcher'),
              detail: t('Preprocesamiento de señales ECG, evaluación de pipelines de filtrado y métricas de desempeño.', 'ECG signal preprocessing, filtering pipeline evaluation and performance metrics.'),
              accent: 'rgba(59,130,246,0.15)',
              border: 'rgba(59,130,246,0.3)',
            },
            {
              img: '/img/HectorMora.JPG',
              name: 'Mg. Héctor Andrés Mora Paz',
              role: t('Asesor de la Investigación', 'Research Advisor'),
              detail: t('Dirección académica, revisión metodológica y validación de resultados.', 'Academic direction, methodological review and results validation.'),
              accent: 'rgba(251,191,36,0.12)',
              border: 'rgba(251,191,36,0.35)',
            },
            {
              img: '/img/DarioGomez.JPG',
              name: 'Darío Esteban Gómez Ordóñez',
              role: t('Investigador', 'Researcher'),
              detail: t('Diseño de experimentos, implementación de modelos de Deep Learning y análisis de resultados.', 'Experiment design, Deep Learning model implementation and results analysis.'),
              accent: 'rgba(59,130,246,0.15)',
              border: 'rgba(59,130,246,0.3)',
            },
          ].map(member => (
            <motion.div key={member.name} variants={itemAnim} className="card" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              padding: '28px 20px 22px',
                  // El fondo va detras, asi que la tarjeta pasa a ser su marco de
                  // referencia y le recorta lo que sobresalga por las esquinas.
                  position: 'relative', overflow: 'hidden',
            }}>
                  <PapelECG />
                  {/* El contenido va en su propia capa: sin `position` no se eleva
                      sobre el fondo, que al estar posicionado se pinta despues y le
                      cruzaba las lineas por encima a la fotografia. */}
                  <div style={{
                    position: 'relative', zIndex: 1, width: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}>
              {/* Los originales son de 480 x 480: a 150 px siguen sobremuestreados mas de
                  tres veces, asi que se ven nitidos tambien en pantalla de alta densidad.
                  Se cargan con prioridad alta porque son contenido de la portada, no
                  decoracion: `loading="lazy"` las dejaba en blanco al abrir. */}
              <img decoding="async" fetchPriority="high"
                src={member.img}
                alt={member.name}
                width={480}
                height={480}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                style={{
                  width: '150px', height: '150px', borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'center 15%',
                  border: `3px solid ${member.border}`,
                  boxShadow: `0 8px 16px rgba(0,0,0,0.15), 0 0 0 1px ${member.border}`,
                  marginBottom: '18px', flexShrink: 0,
                  background: 'var(--surface)',
                }}
              />
              <p style={{ fontFamily: 'var(--font-section)', fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '4px' }}>
                {member.name}
              </p>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                {member.role}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                {member.detail}
              </p>
                  </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── 1. Visión General — 3 tarjetas estructuradas ───────────── */}
      <motion.section
        variants={containerAnim}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        style={{ marginBottom: '64px' }}
      >
        <motion.p variants={itemAnim} className="eyebrow" style={{ marginBottom: '8px' }}>{t('Visión General', 'Overview')}</motion.p>
        <motion.p variants={itemAnim} style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--fs-base)', color: 'var(--text-sub)',
          lineHeight: 1.7, maxWidth: '900px', marginBottom: '24px',
        }}>
          {t('Predicción prospectiva de señales ECG combinando Machine Learning clásico y Deep Learning, evaluada sobre 123 pacientes (MIT-BIH + INCART) bajo la metodología CRISP-DM, con validación intra-paciente y cross-patient (LOPO).', 'Prospective ECG signal prediction combining classical Machine Learning and Deep Learning, evaluated on 123 patients (MIT-BIH + INCART) under the CRISP-DM methodology, with intra-patient and cross-patient (LOPO) validation.')}
        </motion.p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Card: Enfoques Experimentales */}
          <motion.div variants={itemAnim} className="card" style={{
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlaskConical size={20} color="var(--signal)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
                {t('Enfoques Experimentales', 'Experimental Approaches')}
              </span>
            </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            padding: '12px', borderRadius: 'var(--radius-sm)',
            background: theme === 'dark' ? 'rgba(59,130,246,0.06)' : 'rgba(37,99,235,0.05)',
            border: theme === 'dark' ? '1px solid rgba(59,130,246,0.18)' : '1px solid rgba(37,99,235,0.15)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-xs)', color: 'var(--signal)', marginBottom: '4px' }}>Exp A</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              {t('Ventanas de tiempo', 'Time windows')}<br />{t('5 s entrada → 1, 3, 5 s predicción', '5 s input → 1, 3, 5 s prediction')}
            </p>
          </div>
          <div style={{
            padding: '12px', borderRadius: 'var(--radius-sm)',
            background: theme === 'dark' ? 'rgba(96,165,250,0.06)' : 'rgba(59,130,246,0.05)',
            border: theme === 'dark' ? '1px solid rgba(96,165,250,0.18)' : '1px solid rgba(59,130,246,0.15)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-xs)', color: 'var(--prediction)', marginBottom: '4px' }}>Exp B</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              {t('Latido a latido', 'Beat-to-beat')}<br />{t('N = 3, 5, 10 → 256 muestras', 'N = 3, 5, 10 → 256 samples')}
            </p>
          </div>
          <div style={{
            padding: '12px', borderRadius: 'var(--radius-sm)',
            background: theme === 'dark' ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.05)',
            border: theme === 'dark' ? '1px solid rgba(16,185,129,0.18)' : '1px solid rgba(16,185,129,0.15)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-xs)', color: 'var(--text)', marginBottom: '4px' }}>LOPO</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              {t('Cross-patient', 'Cross-patient')}<br />{t('122 entrenan → 1 evalúa', '122 train → 1 evaluates')}
            </p>
          </div>
          <div style={{
            padding: '12px', borderRadius: 'var(--radius-sm)',
            background: theme === 'dark' ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.05)',
            border: theme === 'dark' ? '1px solid rgba(139,92,246,0.18)' : '1px solid rgba(139,92,246,0.15)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-xs)', color: 'var(--text)', marginBottom: '4px' }}>{t('Multi-step', 'Multi-step')}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              {t('3 latidos', '3 beats')}<br />{t('H=3 con atención temporal', 'H=3 with temporal attention')}
            </p>
          </div>
        </div>
          </motion.div>

          {/* Card: Modelos Implementados */}
          <motion.div variants={itemAnim} className="card" style={{
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain size={20} color="var(--signal)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
                {t('Modelos Implementados', 'Implemented Models')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '6px' }}>{t('ML Clásico', 'Classical ML')}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['LinReg', 'DT', 'RF', 'SVR', 'MLP', 'ARIMA'].map(m => (
                    <span key={m} style={{
                      padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-2xs)',
                      fontFamily: 'var(--font-data)', color: 'var(--text-sub)',
                      background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                      border: '1px solid var(--border)',
                    }}>{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '6px' }}>Deep Learning</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['LSTM', 'GRU', 'CNN-LSTM', 'CNN-GRU', 'CNN-GRU-ATTN'].map(m => (
                    <span key={m} style={{
                      padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-2xs)',
                      fontFamily: 'var(--font-data)',
                      color: theme === 'dark' ? 'rgba(96,165,250,0.9)' : '#2563eb',
                      background: theme === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.06)',
                      border: theme === 'dark' ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(37,99,235,0.2)',
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card: Evaluación */}
          <motion.div variants={itemAnim} className="card" style={{
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={20} color="var(--signal)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
                {t('Evaluación', 'Evaluation')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: 'var(--radius-sm)', background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>123</p>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)' }}>{t('pacientes', 'patients')}</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: 'var(--radius-sm)', background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>6</p>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)' }}>{t('notebooks', 'notebooks')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['R²', 'RMSE', 'MAE', 'DTW', 'Shape Corr', 'Forecast Score'].map(m => (
                  <code key={m} style={{
                    padding: '3px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-xs)',
                    fontFamily: 'var(--font-data)', color: 'var(--prediction)',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                  }}>{m}</code>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 2. Metodología — Pipeline visual ──────────────────────── */}
      <motion.section
        variants={containerAnim}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        style={{ marginBottom: '64px' }}
      >
      <motion.p variants={itemAnim} className="eyebrow" style={{ marginBottom: '20px' }}>{t('Metodología CRISP-DM', 'CRISP-DM Methodology')}</motion.p>
      <motion.div variants={itemAnim} style={{
        display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap', justifyContent: 'center',
      }}>
      {[
        { id: 'negocio', label: t('Comprensión', 'Business'), sub: t('del Negocio', 'Understanding'), icon: Search, detail: t('Predicción de morfología ECG', 'ECG morphology prediction') },
        { id: 'datos', label: t('Comprensión', 'Data'), sub: t('de los Datos', 'Understanding'), icon: Database, detail: 'MIT-BIH + INCART' },
        { id: 'preparacion', label: t('Preparación', 'Data'), sub: t('de los Datos', 'Preparation'), icon: Zap, detail: t('7 pipelines · R-peak', '7 pipelines · R-peak') },
        { id: 'modelado', label: t('Modelado', 'Modeling'), sub: 'ML + DL + LOPO', icon: Brain, detail: t('11 modelos · 8 experimentos', '11 models · 8 experiments') },
        { id: 'evaluacion', label: t('Evaluación', 'Evaluation'), sub: 'R² · RMSE · DTW', icon: BarChart2, detail: t('IC95 · Wilcoxon', 'IC95 · Wilcoxon') },
        { id: 'despliegue', label: t('Despliegue', 'Deployment'), sub: t('Dashboard', 'Dashboard'), icon: Activity, detail: 'FastAPI + React' },
      ].map((step, i, arr) => (
        // La clave era `step.label`, y en español dos fases se llaman «Comprensión»:
        // React avisaba de claves duplicadas en cada carga de la portada.
        <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            padding: '16px 18px', minWidth: '130px', maxWidth: '160px',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '6px' }}>{String(i + 1).padStart(2, '0')}</div>
            <step.icon size={22} color="var(--signal)" style={{ marginBottom: '8px' }} />
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-xs)', color: 'var(--text)', marginBottom: '2px' }}>{step.label}</p>
            <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>{step.sub}</p>
            <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--prediction)', marginTop: '4px', lineHeight: 1.3 }}>{step.detail}</p>
          </div>
              {i < arr.length - 1 && (
                <ArrowRight size={16} color="var(--text-muted)" style={{ margin: '0 6px', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* ── 3. Resultados Destacados — FindingCards ───────────────── */}
      <motion.section
        variants={containerAnim}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        style={{ marginBottom: '64px' }}
      >
      <motion.p variants={itemAnim} className="eyebrow" style={{ marginBottom: '20px' }}>{t('Resultados Destacados', 'Key Findings')}</motion.p>
<motion.div variants={itemAnim} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <FindingCard
            number={1}
            n={1008}
            notebook="NB1"
            fuente="/data/nb1/resumen_ExpA.csv + resumen_ExpB.csv"
            title={t('Exp B supera 4× a Exp A (NB1)', 'Exp B outperforms Exp A by 4× (NB1)')}
            description={lang === 'en' ? <>The beat-to-beat reformulation raised the best R² from <strong>0.1603</strong> (RF, Exp A) to <strong>0.6454</strong> (SVR, Exp B), a 4× improvement. 4 of 5 models significantly beat Persistence (Wilcoxon p&lt;0.05).</> : <>La reformulación latido-a-latido elevó el R² máximo de <strong>0.1603</strong> (RF, Exp A) a <strong>0.6454</strong> (SVR, Exp B), mejora de 4×. 4 de 5 modelos superan significativamente a Persistencia (Wilcoxon p&lt;0.05).</>}
            significance="high"
          />
          <FindingCard
            number={2}
            n={432}
            notebook="NB2"
            fuente="/data/nb2/resumen_Exp B.csv"
            title={t('GRU/LSTM: techo DL intra-paciente (NB2)', 'GRU/LSTM: DL intra-patient ceiling (NB2)')}
            description={lang === 'en' ? <>Both achieve <strong>R² = 0.6592</strong> in Exp B, marginally outperforming SVR (+2%). The 4 DL architectures converge within a 0.6% R² band, suggesting the task ceiling is constrained by the intra-patient paradigm.</> : <>Ambos alcanzan <strong>R² = 0.6592</strong> en Exp B, superando marginalmente a SVR (+2%). Las 4 arquitecturas DL convergen en una banda de 0.6% R², sugiriendo que el techo de la tarea está limitado por el paradigma intra-paciente.</>}
            significance="high"
          />
          <FindingCard
            number={3}
            n={50}
            notebook="NB3"
            fuente="/data/nb3/expB_transferencia_cruzada.csv"
            title={t('Intra-paciente colapsa al transferir (NB3)', 'Intra-patient collapses on transfer (NB3)')}
            description={lang === 'en' ? <>Applying an NB2 model to a different patient causes an average R² drop of <strong>−0.98</strong>; 66% of transfers yield negative R². Cross-patient models do not suffer that collapse: NB4B stays positive in 10/10 patients and NB5B in 9/10 (patient 201 sits at −0.04, two orders of magnitude above the transfer drop). Both beat the transferred model in <strong>10/10</strong>.</> : <>Aplicar un modelo NB2 a otro paciente causa una caída media de R² de <strong>−0.98</strong>; el 66% de las transferencias producen R² negativo. Los modelos cross-patient no sufren ese colapso: NB4B queda positivo en 10/10 pacientes y NB5B en 9/10 (el 201 se queda en −0.04, dos órdenes de magnitud por encima de la caída por transferencia). Ambos superan al modelo transferido en <strong>10/10</strong>.</>}
            significance="high"
          />
          <FindingCard
            number={4}
            n={144}
            notebook="NB4B"
            fuente="/data/nb4b/resumen_nb4b.csv"
            title={t('Multi-sujeto: RF y GRU empatan con F_MED (NB4B)', 'Multi-subject: RF and GRU tie with F_MED (NB4B)')}
            description={lang === 'en' ? <>In the pooled paradigm and with the same filter (F_MED), RF reaches <strong>R² = 0.7295</strong> and GRU <strong>0.7237</strong>: a tie. Averaged over the three filters GRU leads (0.4363 vs 0.4304). CNN-LSTM and CNN-GRU lag behind (R² &lt; 0.27), indicating convolution degrades in this setup.</> : <>En el paradigma agrupado y con el mismo filtro (F_MED), RF alcanza <strong>R² = 0.7295</strong> y GRU <strong>0.7237</strong>: empate técnico. Promediando los tres filtros, GRU queda por delante (0.4363 frente a 0.4304). CNN-LSTM y CNN-GRU quedan rezagados (R² &lt; 0.27), indicando que la convolución degrada en este esquema.</>}
            significance="medium"
          />
          <FindingCard
            number={5}
            n={48}
            notebook="NB5B"
            fuente="/data/nb5b/tabla_resumen_v2.csv"
            title={t('LOPO: Ensemble_FT R² = 0.5484, 95.8 % útiles (NB5B)', 'LOPO: Ensemble_FT R² = 0.5484, 95.8 % usable (NB5B)')}
            description={lang === 'en' ? <>The LOPO Ensemble_FT achieves <strong>R² = 0.5484</strong> across 48 patients. <strong>46/48</strong> patients obtain R² &gt; 0 (95.8 % coverage); 200 and 203 stay negative. Fine-tuning with 15 beats improves BiGRU_MHA by +4.15%, while GRU/CNN-GRU gain marginally.</> : <>El Ensemble_FT LOPO alcanza <strong>R² = 0.5484</strong> en 48 pacientes. <strong>46/48</strong> pacientes obtienen R² &gt; 0 (95.8 % de cobertura); 200 y 203 siguen negativos. El fine-tuning con 15 latidos mejora BiGRU_MHA en +4.15%, mientras GRU/CNN-GRU ganan marginalmente.</>}
            significance="medium"
          />
          <FindingCard
            number={6}
            n={123}
            notebook="NB6"
            fuente="/data/nb5/tabla_resumen.csv"
            title={t('CNN-GRU-ATTN LOPO: R² = 0.67 supera techo intra (NB6)', 'CNN-GRU-ATTN LOPO: R² = 0.67 beats intra ceiling (NB6)')}
            description={lang === 'en' ? <>The LOPO model achieves <strong>R² = 0.6734</strong> without ever seeing the test patient, surpassing the intra-patient ceiling (0.6592). Train-test gap of only <strong>0.0956</strong>, the lowest in the project. Fine-tuning with 30 beats further improves per-patient metrics.</> : <>El modelo LOPO alcanza <strong>R² = 0.6734</strong> sin haber visto jamás al paciente de prueba, superando el techo intra-paciente (0.6592). Gap train-test de solo <strong>0.0956</strong>, el más bajo del proyecto. El fine-tuning con 30 latidos mejora las métricas por paciente.</>}
            significance="high"
          />
          <FindingCard
            number={7}
            n={123}
            notebook="NB6"
            fuente="/data/nb7/nb6_recalculo.json + nb6_tabla_por_dataset.csv"
            title={t('Multi-step: degradación contenida −3.35 % (NB6)', 'Multi-step: contained degradation −3.35 % (NB6)')}
            description={lang === 'en' ? <>Predicting 3 beats ahead, R² drops only <strong>−3.35 %</strong> (t+1 = 0.6833 → t+3 = 0.6604), thanks to the residual design <em>last_beat + delta</em>. INCART is harder (R² = 0.5990) than MIT-BIH (R² = 0.7896), a gap significant under Mann-Whitney (p = 0.000040); <strong>42.3 %</strong> of the 123 patients reach R² ≥ 0.80.</> : <>Prediciendo 3 latidos adelante, el R² cae solo <strong>−3.35 %</strong> (t+1 = 0.6833 → t+3 = 0.6604), gracias al diseño residual <em>last_beat + delta</em>. INCART es más difícil (R² = 0.5990) que MIT-BIH (R² = 0.7896), una brecha significativa según Mann-Whitney (p = 0.000040); el <strong>42.3 %</strong> de los 123 pacientes alcanza R² ≥ 0.80.</>}
            significance="high"
          />
          <FindingCard
            number={8}
            n={123}
            notebook="NB6"
            fuente="/data/nb5/tabla_resumen.csv"
            title={t('Shape Corr = 0.8383: morfología preservada (NB6)', 'Shape Corr = 0.8383: morphology preserved (NB6)')}
            description={lang === 'en' ? <>Despite the composite R², morphological correlation remains at <strong>0.8383</strong> and Forecast Score at <strong>0.7073</strong>, confirming that the CNN-GRU-ATTN captures the P-QRS-T wave structure essential for clinical interpretation. Slope MSE = 0.0223 shows R-peak transitions are captured with high precision.</> : <>A pesar del R² compuesto, la correlación morfológica se mantiene en <strong>0.8383</strong> y el Forecast Score en <strong>0.7073</strong>, confirmando que el CNN-GRU-ATTN captura la estructura de ondas P-QRS-T esencial para interpretación clínica. Slope MSE = 0.0223 muestra que las transiciones del pico R se capturan con alta precisión.</>}
            significance="medium"
          />
          <FindingCard
            number={9}
            n={10}
            notebook="NB7"
            fuente="/data/nb7/hp_dl_resumen.json"
            title={t('La búsqueda de hiperparámetros no mejoró al modelo final (NB7)', 'Hyperparameter search did not improve the final model (NB7)')}
            description={lang === 'en' ? <>Twenty configurations per architecture over 10 LOPO folds. For CNN-GRU-ATTN the best configuration gains <strong>+0.0027</strong> R² (0.6438 → 0.6466, 0.42 % relative) and wins in <strong>5 of 10</strong> patients: Wilcoxon W = 27.0, <strong>p = 1.0000</strong>. Read the other way round, which is how it should be read: the published R² does not depend on a lucky configuration. The GRU does improve significantly (+0.0490, p = 0.00195), but three caveats keep it from replacing the final model, see Experiment 7.</> : <>Veinte configuraciones por arquitectura sobre 10 pliegues LOPO. Para CNN-GRU-ATTN la mejor configuración gana <strong>+0.0027</strong> de R² (0.6438 → 0.6466, 0.42 % relativo) y vence en <strong>5 de 10</strong> pacientes: Wilcoxon W = 27.0, <strong>p = 1.0000</strong>. Leído al revés, que es como hay que leerlo: el R² publicado no depende de una configuración afortunada. El GRU sí mejora de forma significativa (+0.0490, p = 0.00195), pero tres salvedades impiden que sustituya al modelo final, ver Experimento 7.</>}
            significance="high"
          />
          <FindingCard
            number={10}
            n={50}
            notebook="NB8"
            fuente="/data/nb8/p4_resumen.json + p3_contraste.json"
            title={t('El residuo sí detecta latidos ectópicos: 3.12× sobre la prevalencia (NB8)', 'The residual does detect ectopic beats: 3.12× over prevalence (NB8)')}
            description={lang === 'en' ? <>Over <strong>316 740</strong> beats from 50 patients, of which <strong>38 712</strong> are ectopic (12.22 % prevalence), ranking by prediction error gives <strong>AUC-PR = 0.3808</strong>: <strong>3.12×</strong> the prevalence a random ranking would achieve. The per-class error backs it: the mean MSE of ectopic beats is <strong>3.16×</strong> that of normal ones. It is a signal, not a clinical detector, per-patient precision varies widely.</> : <>Sobre <strong>316 740</strong> latidos de 50 pacientes, de los que <strong>38 712</strong> son ectópicos (prevalencia del 12.22 %), ordenar por el error de predicción da <strong>AUC-PR = 0.3808</strong>: <strong>3.12×</strong> la prevalencia que lograría un orden al azar. El error por clase lo respalda: el MSE medio de los latidos ectópicos es <strong>3.16×</strong> el de los normales. Es una señal, no un detector clínico, la precisión por paciente varía mucho.</>}
            significance="high"
          />
        </motion.div>
      </motion.section>

      {/* ── 4. El resultado y su alcance ─────────────────────────── */}
      <motion.section
        variants={containerAnim}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        style={{ marginBottom: '48px' }}
      >
        <motion.p variants={itemAnim} className="eyebrow" style={{ marginBottom: '20px' }}>
          {t('El resultado y su alcance', 'The result and its scope')}
        </motion.p>

        <motion.div variants={itemAnim} className="card" style={{ padding: '24px 26px' }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', lineHeight: 1.7,
            color: 'var(--text-sub)', maxWidth: '88ch', marginBottom: '18px',
          }}>
            {t(
              'Un modelo CNN-GRU-ATTN predice la forma de onda de los tres latidos siguientes a partir de los cinco anteriores, evaluado dejando un paciente fuera sobre los 123 de MIT-BIH e INCART. La comparación pertinente no es con los modelos intra-paciente, que ven al mismo sujeto en entrenamiento y en prueba, sino con la quinta fase, único antecedente bajo idéntico protocolo.',
              'A CNN-GRU-ATTN model predicts the waveform of the next three beats from the previous five, evaluated leave-one-patient-out over the 123 patients of MIT-BIH and INCART. The pertinent comparison is not with the intra-patient models, which see the same subject in training and test, but with the fifth phase, the only antecedent under an identical protocol.',
            )}
          </p>

          <MetricGrid minimo={186}>
            <MetricStat
              fase="NB6"
              etiqueta={t('R² medio · modelo base', 'Mean R² · base model')}
              valor={R ? R.r2.toFixed(4) : null}
              dispersion={R ? R.r2Std.toFixed(4) : undefined}
              ic95={R?.ic95 ? [R.ic95[0].toFixed(4), R.ic95[1].toFixed(4)] : undefined}
              n={R?.n}
              fuente={FUENTE_LOPO}
            />
            <MetricStat
              fase="NB6"
              etiqueta={t('Frente a la quinta fase', 'Against the fifth phase')}
              valor={R ? `+${(R.r2 - 0.5484).toFixed(4)}` : null}
              referencia={R
                ? `+${(100 * (R.r2 - 0.5484) / 0.5484).toFixed(1)} % · ${t('quinta fase', 'fifth phase')} 0.5484`
                : undefined}
              nota={referencia.calibrado
                ? t(
                    `con el modelo calibrado la mejora es +${(referencia.calibrado.r2 - 0.5484).toFixed(4)}`,
                    `with the calibrated model the improvement is +${(referencia.calibrado.r2 - 0.5484).toFixed(4)}`,
                  )
                : undefined}
              n={R?.n}
              fuente={FUENTE_LOPO}
            />
            <MetricStat
              fase="NB6"
              etiqueta={t('Pacientes con R² ≥ 0.80', 'Patients with R² ≥ 0.80')}
              valor={R ? `${R.distribucion.ge080} / ${R.n}` : null}
              nota={R
                ? t(
                    `la media esconde la dispersión: ${R.distribucion.negativos} pliegues quedan en negativo`,
                    `the mean hides the spread: ${R.distribucion.negativos} folds remain negative`,
                  )
                : undefined}
              n={R?.n}
              fuente={FUENTE_LOPO}
            />
            <MetricStat
              fase="NB6"
              etiqueta={t('Brecha entre bases', 'Between-database gap')}
              valor={porBase ? (porBase.mitbih - porBase.incart).toFixed(4) : null}
              referencia={porBase
                ? `MIT-BIH ${porBase.mitbih.toFixed(4)} · INCART ${porBase.incart.toFixed(4)}`
                : undefined}
              n={R?.n}
              fuente={FUENTE_LOPO}
            />
          </MetricGrid>

        </motion.div>
      </motion.section>


      {/* ── 6. Base de datos ────────────────────────────────────── */}
      <motion.section
        variants={containerAnim}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        style={{ marginBottom: '48px' }}
      >
        <motion.div variants={itemAnim}>
          <p className="eyebrow" style={{ marginBottom: '16px' }}>{t('Bases de Datos', 'Databases')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <Database size={22} color="var(--signal)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '4px' }}>MIT-BIH Arrhythmia Database</p>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  {t('48 registros · 360 Hz · ~30 min · derivación MLII · 5 clases de arritmia · PhysioNet', '48 records · 360 Hz · ~30 min · MLII lead · 5 arrhythmia classes · PhysioNet')}
                </p>
              </div>
            </div>
            <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <Database size={22} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--text)', marginBottom: '4px' }}>INCART 2.0 {t('(auxiliar)', '(auxiliary)')}</p>
                <p style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--fs-2xs)', color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  {t('75 registros · 257 Hz · Holter 24h · derivación MLII · validación cross-database', '75 records · 257 Hz · 24h Holter · MLII lead · cross-database validation')}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[t('MIT-BIH', 'MIT-BIH'), 'INCART 2.0', 'PhysioNet', t('Open Data', 'Open Data'), t('5 clases de arritmia', '5 arrhythmia classes'), 'Canal MLII', t('2 bases de datos', '2 databases'), `123 ${t('pacientes', 'patients')}`].map(chip => (
              <span key={chip} style={{
                padding: '4px 10px',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-data)',
                fontSize: 'var(--fs-3xs)',
                color: 'var(--text-sub)',
              }}>{chip}</span>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{
          textAlign: 'center', padding: '24px 0 8px', marginTop: '16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <p style={{
          fontFamily: 'var(--font-data)', fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)',
          lineHeight: 1.7, letterSpacing: '0.3px',
        }}>
          Universidad CESMAG · {t('Ingeniería de Sistemas', 'Systems Engineering')} · 2025–2026<br />
          Darwin D. Burbano Guerrero &amp; Darío E. Gómez Ordóñez · {t('Asesor', 'Advisor')}: Mg. Héctor A. Mora Paz<br />
          {t('Datos', 'Data')}: MIT-BIH Arrhythmia Database (PhysioNet)
        </p>
      </motion.footer>
    </PageWrapper>
  );
}
