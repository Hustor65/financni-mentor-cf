import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, lazy, Suspense, useTransition } from 'react';
import { TopBar } from './components/layout/TopBar';
import type { TabId } from './data/nav';
import { HeroSection } from './components/layout/HeroSection';
import { Footer } from './components/layout/Footer';
import { Home } from './components/home/Home';
import { Academy } from './components/academy/Academy';
import { CommandPalette } from './components/CommandPalette';
import { TOPICS } from './data/topics';
import { TOOLS } from './components/tools/registry';
import type { Level } from './data/levels';
import { AccountDialog } from './components/account/AccountDialog';
import { KioskGuard } from './components/kiosk/KioskGuard';
import { updateData, useUserData } from './utils/store';
import { initAccount, signOut } from './utils/account';
import { rotateVisitorId } from './utils/visitor';
import { KIOSK } from './utils/kiosk';
import { ErrorBoundary } from './components/ErrorBoundary';
const ChatInterface = lazy(() => import('./components/chat/ChatInterface').then(m => ({ default: m.ChatInterface })));
const TopicDetail = lazy(() => import('./components/academy/TopicDetail').then(m => ({ default: m.TopicDetail })));
const MarketScreen = lazy(() => import('./components/market/MarketScreen').then(m => ({ default: m.MarketScreen })));
const ToolsHub = lazy(() => import('./components/tools/ToolsHub').then(m => ({ default: m.ToolsHub })));
const TrustCenter = lazy(() => import('./components/trust/TrustCenter').then(m => ({ default: m.TrustCenter })));

/* ════════════════════════════════════════════════════════════
   Hash routing — #akademie · #akademie/<téma> · #trhy · #nastroje ·
   #trhy/<ticker> · #nastroje/<nástroj> · #mentor · #presnost (Přehled = čistá URL).
   Funkční Back/Forward a sdílitelné odkazy. Staré odkazy #temata/…
   se přesměrují na #akademie/….
   ════════════════════════════════════════════════════════════ */
interface Route { tab: TabId; sub: string | null }

const TICKER_RE = /^[A-Z0-9.^=-]{1,14}$/;

const TABS = new Set<TabId>(['prehled', 'akademie', 'trhy', 'nastroje', 'mentor', 'presnost']);

function parseHash(): Route {
  if (typeof window === 'undefined') return { tab: 'prehled', sub: null };
  let raw = window.location.hash.replace(/^#/, '');
  try { raw = decodeURIComponent(raw); } catch { /* rozbitý odkaz (#%…) → ber ho doslova */ }
  const [head, ...rest] = raw.split('/');
  const tab = (head === 'temata' ? 'akademie' : head) as TabId;
  if (!TABS.has(tab)) return { tab: 'prehled', sub: null };
  const sub = rest.join('/');
  // portfolio na zkoušku se přestěhovalo z Nástrojů do Trhů (staré odkazy a záložky)
  if (tab === 'nastroje' && sub === 'portfolio') return { tab: 'trhy', sub: 'portfolio' };
  if (tab === 'akademie') return { tab, sub: TOPICS.some(t => t.id === sub) ? sub : null };
  if (tab === 'nastroje') return { tab, sub: TOOLS.some(t => t.id === sub) ? sub : null };
  if (tab === 'trhy') return { tab, sub: sub === 'portfolio' || TICKER_RE.test(sub) ? sub : null };
  return { tab, sub: null };
}

const toHash = (r: Route) => (r.tab === 'prehled' ? '' : `#${r.tab}${r.sub ? `/${r.sub}` : ''}`);

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>(parseHash);
  const { level, completed } = useUserData();
  const completedTopics = useMemo(() => new Set(completed), [completed]);
  const [chatPrompt, setChatPrompt] = useState<{ text: string; send: boolean } | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // změna klíče zahodí rozdělanou konverzaci s mentorem (režim stánku)
  const [chatEpoch, setChatEpoch] = useState(0);
  const hashInit = useRef(true);

  const { tab, sub } = route;

  // Jak se na stránku přišlo: odkazem (začni nahoře), tlačítkem Zpět/Vpřed (vrať se,
  // kde návštěvník byl), nebo jen výběrem titulu v Trzích (nikam neskákej).
  // navigating = nová stránka se ještě chystá → tenký ukazatel pod lištou, ať je vidět, že klik zabral
  const [navigating, startNav] = useTransition();
  const arrival = useRef<'push' | 'pop' | 'stay'>('push');
  const scrollMemo = useRef(new Map<string, number>());

  // startTransition: dokud se nová stránka nestáhne, zůstává na obrazovce ta stará
  // (žádná prázdná plocha s poskočenou patičkou mezi stránkami)
  const go = useCallback((next: TabId, nextSub: string | null = null) => {
    arrival.current = 'push';
    startNav(() => setRoute({ tab: next, sub: nextSub }));
  }, [startNav]);

  // pamatuj si, kde návštěvník na které stránce skončil
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; scrollMemo.current.set(window.location.hash, window.scrollY); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useLayoutEffect(() => {
    if (arrival.current === 'stay') return;
    const top = arrival.current === 'pop' ? scrollMemo.current.get(toHash(route)) ?? 0 : 0;
    window.scrollTo({ top, left: 0, behavior: 'instant' });
  }, [route]);

  // ostatní stránky si stáhni předem, až bude klid → přepnutí je pak okamžité
  useEffect(() => {
    const preload = () => {
      void import('./components/academy/TopicDetail');
      void import('./components/market/MarketScreen');
      void import('./components/tools/ToolsHub');
      void import('./components/chat/ChatInterface');
      void import('./components/trust/TrustCenter');
    };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(preload, { timeout: 6000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(preload, 3000);
    return () => clearTimeout(t);
  }, []);

  const changeLevel = useCallback((next: Level) => updateData({ level: next }), []);

  const openTopic = useCallback((id: string) => {
    // téma z druhé úrovně (např. z hledání) → přepni úroveň, ať se má kam vrátit
    const topic = TOPICS.find(t => t.id === id);
    if (topic && topic.level !== level) changeLevel(topic.level);
    go('akademie', id);
  }, [go, level, changeLevel]);

  const openTool = useCallback((id: string | null) => go('nastroje', id), [go]);

  const openMarket = useCallback((ticker?: string) => go('trhy', ticker ?? null), [go]);

  const askMentor = useCallback((text: string, send = false) => {
    setChatPrompt({ text, send });
    go('mentor');
  }, [go]);

  const handleTopicComplete = useCallback((id: string) => {
    updateData(d => (d.completed.includes(id) ? {} : { completed: [...d.completed, id] }));
  }, []);

  // režim stánku: po nečinnosti odhlásit, smazat postup i konverzaci a vrátit se na úvod
  const resetForNextVisitor = useCallback(() => {
    void signOut(true);
    rotateVisitorId(); // další návštěvník stánku má vlastní limit dotazů na mentora
    setCmdkOpen(false);
    setAccountOpen(false);
    setChatPrompt(null);
    setChatEpoch(e => e + 1);
    go('prehled');
  }, [go]);

  useEffect(() => { initAccount(); }, []);

  // po předvyplnění chatu prompt vynuluj → stejný dotaz jde poslat znovu (M16/M23)
  const clearChatPrompt = useCallback(() => setChatPrompt(null), []);

  // akcent celého webu se řídí úrovní (azurová → zelená)
  useEffect(() => {
    document.documentElement.dataset.level = level;
  }, [level]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // Stav → URL hash. První zápis po načtení jen NAHRADÍ (normalizuje staré/neplatné hashe).
  useEffect(() => {
    const next = toHash(route);
    if (window.location.hash === next) { hashInit.current = false; return; }
    const url = next || window.location.pathname + window.location.search;
    if (hashInit.current) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    hashInit.current = false;
  }, [route]);

  // URL hash → stav (Back/Forward přes popstate, ruční editace hashe přes hashchange)
  useEffect(() => {
    const sync = () => {
      const next = parseHash();
      arrival.current = 'pop';
      startNav(() => setRoute(prev => (prev.tab === next.tab && prev.sub === next.sub ? prev : next)));
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, [startNav]);

  // globální Cmd/Ctrl+K → rychlé hledání
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const home = tab === 'prehled';

  return (
    <>
      <a
        className="skip-link" href="#obsah"
        onClick={e => { e.preventDefault(); document.getElementById('obsah')?.focus(); }}
      >
        Přeskočit na obsah
      </a>
      <TopBar
        active={tab}
        onNavigate={go}
        level={level}
        onLevelChange={changeLevel}
        onOpenCommand={() => setCmdkOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <div className="nav-progress" data-on={navigating || undefined} aria-hidden="true" />

      <HeroSection
        active={home}
        onChoose={l => { changeLevel(l); go('akademie'); }}
        onOpenMarket={openMarket}
      />
      {home && <div className="hero-spacer" aria-hidden="true" />}

      <div className={`page-content${home ? '' : ' page-content--inner'}`}>
        <main id="obsah" className="container page-main" tabIndex={-1}>
          <ErrorBoundary>
          <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-hidden="true" />}>
          {/* klíč = stránka → každý příchod krátce prolne (.route); v Trzích se při změně titulu nemění */}
          <div key={tab === 'trhy' ? tab : `${tab}/${sub ?? ''}`} className="route">
            {home && (
              <Home
                level={level}
                completed={completedTopics}
                onNavigate={go}
                onOpenTopic={openTopic}
                onOpenTool={openTool}
                onOpenMarket={openMarket}
                onAskMentor={q => askMentor(q, true)}
                onOpenAccount={() => setAccountOpen(true)}
              />
            )}

            {tab === 'akademie' && (sub ? (
              <TopicDetail
                topicId={sub}
                onBack={() => go('akademie')}
                onComplete={handleTopicComplete}
                onAskMentor={title => askMentor(`Vysvětli mi prosím téma „${title}“ co nejjednodušeji.`)}
                onOpenMarket={() => openMarket()}
              />
            ) : (
              <Academy level={level} onLevelChange={changeLevel} completed={completedTopics} onOpenTopic={openTopic} />
            ))}

            {tab === 'trhy' && (
              <MarketScreen
                level={level} initialTicker={sub ?? undefined} onAskMentor={q => askMentor(q)}
                onPick={t => { arrival.current = 'stay'; setRoute({ tab: 'trhy', sub: t }); }}
              />
            )}

            {tab === 'nastroje' && (
              <ToolsHub level={level} toolId={sub} onOpenTool={openTool} onOpenTopic={openTopic} />
            )}

            {tab === 'mentor' && (
              <>
                <header className="page-head">
                  <h1 className="page-title">AI mentor</h1>
                  <p className="page-lead">
                    Zeptej se na cokoli kolem peněz a investování. Umí si dohledat aktuální ceny,
                    nakreslit graf a vysvětlit věc znovu a jednodušeji.
                  </p>
                </header>
                <Suspense fallback={<div className="panel" style={{ minHeight: '50vh' }} role="status"><span className="sr-only">Načítám mentora…</span></div>}>
                  <ChatInterface
                    key={chatEpoch}
                    level={level}
                    initialPrompt={chatPrompt?.text ?? null}
                    autoSend={chatPrompt?.send}
                    onPromptConsumed={clearChatPrompt}
                  />
                </Suspense>
              </>
            )}

            {tab === 'presnost' && <TrustCenter />}
          </div>
          </Suspense>
          </ErrorBoundary>
        </main>
        <Footer onNavigate={go} />
      </div>

      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onSelectTab={t => go(t as TabId)}
        onOpenTopic={openTopic}
        onOpenTool={openTool}
        onOpenMarket={openMarket}
        onAskMentor={prompt => askMentor(prompt)}
      />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
      {KIOSK && <KioskGuard onReset={resetForNextVisitor} />}
    </>
  );
};

export default App;
