import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useScrollReveal } from './hooks/useScrollReveal';
import { Navigation } from './components/layout/Navigation';
import { KPIBar } from './components/layout/KPIBar';
import { HeroSection } from './components/layout/HeroSection';
import { Footer } from './components/layout/Footer';
const ChatInterface = lazy(() => import('./components/chat/ChatInterface').then(m => ({ default: m.ChatInterface })));
import { TopicCard } from './components/academy/TopicCard';
const TopicDetail = lazy(() => import('./components/academy/TopicDetail').then(m => ({ default: m.TopicDetail })));
import { Glossary } from './components/academy/Glossary';
import { Badges } from './components/academy/Badges';
import { ProductComparison } from './components/academy/ProductComparison';
const TrustCenter = lazy(() => import('./components/trust/TrustCenter').then(m => ({ default: m.TrustCenter })));
import { TOPICS } from './data/topics';
import { CommandPalette } from './components/CommandPalette';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mentor');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('fm-completed-topics');
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [sessionStart] = useState(() => Date.now());
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Po navigaci z Command palette: když uživatel kouká na hero (je nahoře),
  // sjeď plynule dolů na obsah, ať vidí to, co vyhledal — ne pořád hero.
  // Když už je níž v obsahu, nech ho být (neškubej s ním).
  const scrollToContentIfAtHero = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.scrollY < window.innerHeight * 0.9) {
      requestAnimationFrame(() =>
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    }
  }, []);

  // Znalostní skóre = % zvládnutých témat (originál počítá z dokončených modulů)
  const knowledgeScore = Math.min(
    100,
    Math.round((completedTopics.size / TOPICS.length) * 100)
  );

  const handleTopicComplete = useCallback((id: string) => {
    setCompletedTopics(prev => new Set(prev).add(id));
  }, []);

  const handleMessageSent = useCallback(() => {
    setConversationCount(c => c + 1);
  }, []);

  // z detailu tématu rovnou do Mentora s předvyplněným dotazem (kontextový chat)
  const handleAskMentor = useCallback((topicTitle: string) => {
    setChatPrompt(`Vysvětli mi prosím téma „${topicTitle}" co nejjednodušeji.`);
    setSelectedTopic(null);
    setActiveTab('mentor');
  }, []);

  // Scroll-reveal: prvky s .reveal se při vstupu do viewportu plynule "rozbalí".
  useScrollReveal([activeTab, selectedTopic]);

  // Web se vždy otevře nahoře na hero (prohlížeč jinak občas obnoví starou scroll pozici)
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  // globální Cmd/Ctrl+K → přepni rychlé hledání (Command palette)
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

  // pamatuj dokončená témata → znalostní skóre přežije refresh i návrat
  useEffect(() => {
    try { localStorage.setItem('fm-completed-topics', JSON.stringify([...completedTopics])); } catch { /* ignore */ }
  }, [completedTopics]);

  return (
    <>
      <HeroSection />
      <div className="hero-spacer" aria-hidden="true" />
      <div className="page-content">
        <div className="container">
        <div className="spacer-lg" />

        <KPIBar
          conversationCount={conversationCount}
          sessionStart={sessionStart}
          knowledgeScore={knowledgeScore}
          modelName="Online"
        />

        <div className="spacer-xl" />

        <div className="reveal" ref={contentRef} style={{ scrollMarginTop: 'var(--space-xl)' }}>
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} onOpenCommand={() => setCmdkOpen(true)} />
        </div>

        <main style={{ padding: 'var(--space-lg) 0 var(--space-2xl)', minHeight: '60vh' }}>
          <Suspense fallback={<div style={{ minHeight: '40vh' }} aria-hidden="true" />}>
          {/* ── MENTOR TAB ── */}
          {activeTab === 'mentor' && (
            <div role="tabpanel" id="panel-mentor" aria-labelledby="tab-mentor">
              <div className="spacer-md" />
              <div className="reveal">
                <ChatInterface onMessageSent={handleMessageSent} initialPrompt={chatPrompt} />
              </div>
            </div>
          )}

          {/* ── TÉMATA TAB ── */}
          {activeTab === 'temata' && (
            <div role="tabpanel" id="panel-temata" aria-labelledby="tab-temata">
              <div className="spacer-md" />
              {selectedTopic ? (
                <TopicDetail
                  topicId={selectedTopic}
                  onBack={() => setSelectedTopic(null)}
                  onComplete={handleTopicComplete}
                  onAskMentor={handleAskMentor}
                />
              ) : (
                <>
                  <div className="section-head reveal">
                    <span className="eyebrow">Vzdělávací moduly</span>
                    <p className="section-header">Témata</p>
                    <p className="section-desc">
                      Vyberte si téma. U každého najdete teorii, názornou ukázku na grafu
                      i kalkulačku — vše přehledně na jednom místě.
                    </p>
                  </div>
                  <div className="reveal"><Badges completed={completedTopics.size} /></div>
                  <div className="topics-grid">
                    {TOPICS.map((topic, i) => (
                      <div className="reveal" style={{ ['--reveal-i' as string]: i }} key={topic.id}>
                        <TopicCard
                          topic={topic}
                          onClick={setSelectedTopic}
                          completed={completedTopics.has(topic.id)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Slovníček pojmů pod tématy */}
                  <div style={{ height: 'var(--section-gap)' }} />
                  <div className="reveal"><Glossary /></div>

                  <div style={{ height: 'var(--section-gap)' }} />
                  <div className="reveal"><ProductComparison /></div>

                  {/* Newsletter skrytý — vrátíme, až bude reálný sběr e-mailů */}
                </>
              )}
            </div>
          )}

          {/* ── PŘESNOST & DŮVĚRA TAB ── */}
          {activeTab === 'presnost' && (
            <div role="tabpanel" id="panel-presnost" aria-labelledby="tab-presnost">
              <div className="spacer-md" />
              <TrustCenter />
            </div>
          )}
          </Suspense>
        </main>
        </div>
        <Footer />
      </div>
      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onSelectTab={tab => { setActiveTab(tab); scrollToContentIfAtHero(); }}
        onOpenTopic={id => { setActiveTab('temata'); setSelectedTopic(id); scrollToContentIfAtHero(); }}
        onAskMentor={prompt => { setChatPrompt(prompt); setSelectedTopic(null); setActiveTab('mentor'); scrollToContentIfAtHero(); }}
      />
    </>
  );
};

export default App;
