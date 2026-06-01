import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
// lazy → three.js (~900 kB) se stáhne až po prvním renderu, ne v hlavním bundlu
const HeroScene = lazy(() => import('./Scene').then(m => ({ default: m.HeroScene })));

/**
 * Cosmic Hero — 1:1 port původního fullscreen hera (hero_3d_component).
 *  - 3D koule z částic + torus prstenec + hvězdy
 *  - overlay: badge, titulek, typewriter podtitulek, CTA, rohové popisky, SCROLL hint
 *  - PLYNULÝ scroll-fade: při scrollu dolů se celé hero hladce rozplyne (opacity +
 *    jemný posun/zoom) přes requestAnimationFrame s přímou DOM manipulací → bez
 *    re-renderů a bez zasekávání. Pozadí hera ladí s pozadím stránky = bezešvý přechod.
 */

const TITLE_HEAD = 'Váš Finanční AI';
const TITLE_ACCENT = 'Mentor';
const SUBTITLE =
  'Průvodce světem dlouhodobých investic bez rizikových zkratek. Vzdělání místo spekulací.';
const CTA = 'Začít prozkoumávat';

function useTypewriter(text: string, speed = 32, startDelay = 520) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [typedRaw, setTypedRaw] = useState('');
  // typed i done jsou ODVOZENÉ ze stavu → žádný synchronní setState v efektu (čistý lint).
  // reduced-motion: rovnou celý text, bez animace.
  const typed = reduce ? text : typedRaw;
  const done = reduce ? true : typedRaw.length >= text.length;
  useEffect(() => {
    if (reduce || !text) return;
    let i = 0;
    let next: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      i += 1;
      setTypedRaw(text.slice(0, i));
      if (i >= text.length) return;
      const jitter = speed + (Math.random() * 26 - 13);
      next = setTimeout(tick, Math.max(12, jitter));
    };
    const start = setTimeout(tick, startDelay);
    return () => {
      clearTimeout(start);
      if (next) clearTimeout(next);
    };
  }, [text, speed, startDelay, reduce]);
  return { typed, done };
}

export const HeroSection: React.FC = () => {
  // 1) napíše se titulek, 2) teprve po něm navazuje podtitulek
  const TITLE_FULL = TITLE_HEAD + TITLE_ACCENT;
  const { typed: titleTyped, done: titleDone } = useTypewriter(TITLE_FULL, 58, 260);
  const { typed, done } = useTypewriter(titleDone ? SUBTITLE : '', 32, 120);
  const headShown = titleTyped.slice(0, TITLE_HEAD.length);
  const accentShown = titleTyped.length > TITLE_HEAD.length ? titleTyped.slice(TITLE_HEAD.length) : '';
  const innerRef = useRef<HTMLDivElement>(null);
  // 3D scéna se pauzne, jakmile hero sjede z obrazovky (šetří CPU/GPU)
  const [sceneActive, setSceneActive] = useState(true);

  // Plynulý scroll-fade celé hero vrstvy
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    let raf = 0;
    let lastP = -1;

    const apply = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      // hero mizí RYCHLE — celé zhasne během ~40 % obrazovky scrollu, ať neprosvítá
      // přes obsah/chat (hero je fixed v pozadí, obsah najíždí v popředí).
      const p = Math.min(Math.max(window.scrollY / (vh * 0.4), 0), 1);
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;
      const eased = Math.pow(1 - p, 1.5);
      inner.style.opacity = String(eased);
      inner.style.transform = 'translate3d(0, 0, 0)';
      // hned jak hero začne mizet, pusť kliky na obsah v popředí
      inner.style.pointerEvents = p > 0.25 ? 'none' : '';
      // pauza 3D scény, když je hero prakticky mimo obrazovku (setState jen při změně)
      setSceneActive(prev => (prev === p < 0.99 ? prev : p < 0.99));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollDown = () => {
    // scroll přesně pod hero → scroll-snap docvakne na začátek appky (funguje v každém tabu)
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <div className="hero-fs-root">
      {/* vrstva, kterou plynule fadeujeme při scrollu */}
      <div className="hero-fs-inner" ref={innerRef}>
        {/* 3D scéna */}
        <div className="hero-fs-scene">
          <Suspense fallback={null}>
            <HeroScene accentColor="#2596be" particleCount={2400} paused={!sceneActive} />
          </Suspense>
        </div>

        {/* dekorativní vrstvy */}
        <div className="hero-fs-grid" aria-hidden="true" />
        <div className="hero-fs-vignette" aria-hidden="true" />

        {/* obsah */}
        <div className="hero-fs-content">
          <h1 className="hero-fs-title" aria-label={`${TITLE_HEAD} ${TITLE_ACCENT}`}>
            <span aria-hidden="true">
              {headShown}
              {!titleDone && !accentShown && <span className="hero-fs-caret" aria-hidden="true" />}
            </span>
            <br />
            <span className="accent" aria-hidden="true">
              {accentShown}
              {!titleDone && !!accentShown && <span className="hero-fs-caret" aria-hidden="true" />}
            </span>
          </h1>
          <p className="hero-fs-subtitle" aria-label={SUBTITLE}>
            <span aria-hidden="true">{typed}</span>
            {!done && titleDone && <span className="hero-fs-caret" aria-hidden="true" />}
          </p>
          <button className="hero-fs-cta" onClick={scrollDown} aria-label="Začít prozkoumávat">
            {CTA}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>
        </div>

        {/* scroll hint */}
        <div className="hero-fs-scroll-cue" onClick={scrollDown}>
          <span className="cue-text">scroll</span>
          <div className="cue-track" />
        </div>
      </div>
    </div>
  );
};
