import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { MarketTape } from './MarketTape';
import { Icon } from '../Icon';
import type { Level } from '../../data/levels';
import { KIOSK } from '../../utils/kiosk';
import { useGlobeStatus } from '../../utils/globeStatus';

/** Co glóbus právě ukazuje: kolik burz obchoduje, případně že jde o zrychlenou ukázku. */
function GlobeCaption() {
  const s = useGlobeStatus();
  if (!s) return null;
  return (
    <p className="globe-caption">
      <i className={s.open ? 'is-open' : undefined} aria-hidden="true" />
      {s.lapse ? (
        <span>
          Burzy mají teď zavřeno, tohle je zrychlený obchodní den. V Praze je{' '}
          <strong className="num">{s.time}</strong>, obchoduje <strong className="num">{s.open} z {s.total}</strong> burz.
        </span>
      ) : (
        <span>
          Právě teď obchoduje <strong className="num">{s.open} z {s.total}</strong> světových burz.
          Zelená svítí tam, kde je otevřeno.
        </span>
      )}
    </p>
  );
}
// lazy → three.js (~900 kB) se stáhne až po prvním renderu, ne v hlavním bundlu
const HeroScene = lazy(() => import('./Scene').then(m => ({ default: m.HeroScene })));

/**
 * Hero — glóbus světových burz vpravo, vlevo nadpis a volba úrovně.
 * Volba úrovně je hlavní akce celé stránky: podle ní se poskládá Akademie,
 * Trhy i Nástroje. Dole běží pásek se skutečnými kotacemi.
 *
 * Při scrollu se celá vrstva plynule rozplyne (opacity přes rAF, přímá DOM
 * manipulace → bez re-renderů) a 3D scéna se pauzne.
 */

interface Props {
  /** false = jiná stránka než Přehled: hero zůstává připojené (glóbus se nemusí znovu stavět), jen se skryje a zastaví */
  active: boolean;
  onChoose: (level: Level) => void;
  onOpenMarket: (ticker: string) => void;
}

export const HeroSection: React.FC<Props> = ({ active, onChoose, onOpenMarket }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  // 3D scéna se pauzne, jakmile hero sjede z obrazovky (šetří CPU/GPU)
  const [sceneActive, setSceneActive] = useState(true);
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Glóbus (three.js, ~1,9 MB) nesmí brzdit první vykreslení: stáhne se, až když je
  // stránka hotová a prohlížeč má klid. V úsporném režimu dat se nestahuje vůbec.
  const lite = !KIOSK && typeof navigator !== 'undefined'
    && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const small = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 720px)').matches;
  const [sceneWanted, setSceneWanted] = useState(false);
  useEffect(() => {
    if (lite) return;
    let idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (window.requestIdleCallback) idle = window.requestIdleCallback(() => setSceneWanted(true), { timeout: 2500 });
      else timer = setTimeout(() => setSceneWanted(true), 400);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (idle) window.cancelIdleCallback?.(idle);
      clearTimeout(timer);
    };
  }, [lite]);

  useEffect(() => {
    const inner = innerRef.current;
    const copy = copyRef.current;
    if (!inner || !active) return;

    let raf = 0;
    let lastP = -1;
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const motion = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const apply = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      // Přechod do obsahu má dvě vrstvy: text odjíždí nahoru a mizí brzy (než k němu dojedou
      // karty, žádný „duch“ nadpisu pod nimi), glóbus se pomaleji zmenšuje a rozplývá až
      // za ním. Rozdílné rychlosti dávají hloubku místo prostého zešednutí.
      const p = Math.min(Math.max(window.scrollY / (vh * 0.85), 0), 1);
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;
      const sceneOut = smooth(Math.min(1, Math.max(0, (p - 0.1) / 0.9)));
      inner.style.opacity = String(1 - sceneOut);
      inner.style.transform = motion ? `translate3d(0, ${(-sceneOut * 5).toFixed(2)}vh, 0) scale(${(1 - 0.05 * sceneOut).toFixed(4)})` : '';
      if (copy) {
        const textOut = smooth(Math.min(1, p / 0.5));
        copy.style.opacity = String(1 - textOut);
        copy.style.transform = motion ? `translate3d(0, ${(-textOut * 9).toFixed(2)}vh, 0)` : '';
      }
      // pointer-events vypni až když je hero prakticky neviditelné (M27)
      inner.style.pointerEvents = p > 0.85 ? 'none' : '';
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
  }, [active]);

  return (
    <div className="hero-fs-root" data-off={active ? undefined : ''} inert={!active}>
      <div className="hero-fs-inner" ref={innerRef}>
        <div className={`hero-fs-scene${reduce ? '' : ' hero-fs-scene--enter'}${lite ? ' hero-fs-scene--lite' : ''}`}>
          {sceneWanted && (
            <Suspense fallback={null}>
              <HeroScene accentColor="#2596be" particleCount={small ? 1200 : 2400} paused={!sceneActive || !active} />
            </Suspense>
          )}
        </div>
        <div className="hero-fs-shade" aria-hidden="true" />

        <div className="hero-copy" ref={copyRef}>
          <h1 className="hero-title">Od první výplaty po první opci</h1>
          <p className="hero-lead">
            Akademie, kalkulačky, grafy skutečných trhů a AI mentor, který ti vysvětlí cokoli z toho.
            Česky, bez žargonu a bez toho, aby ti někdo něco prodával.
          </p>
          <div className="hero-paths">
            <button type="button" className="hero-path hero-path--start" onClick={() => onChoose('start')}>
              <span className="hero-path__text">
                <strong>Začínám od nuly</strong>
                <span>Rozpočet, brigáda, dluhy, první investice</span>
              </span>
              <span className="hero-path__go" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </button>
            <button type="button" className="hero-path hero-path--pro" onClick={() => onChoose('pro')}>
              <span className="hero-path__text">
                <strong>Už něco umím</strong>
                <span>Opce, oceňování akcií, čtení grafů, simulace</span>
              </span>
              <span className="hero-path__go" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
            </button>
          </div>
        </div>

        <GlobeCaption />
        <MarketTape onOpen={onOpenMarket} />
      </div>
    </div>
  );
};
