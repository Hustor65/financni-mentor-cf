import { useEffect } from 'react';

/**
 * Scroll-reveal: prvky s class `.reveal` se při vstupu do viewportu označí `.is-visible`
 * (CSS pak animuje opacity/transform + stagger přes --reveal-i).
 *
 * MutationObserver navíc sleduje DOM — lazy-načtené komponenty (chat, témata, trust)
 * přidají své `.reveal` prvky až po prvním renderu, takže je doobservujeme, jakmile
 * se objeví. Bez toho zůstaly skryté, dokud uživatel nepřepnul tab.
 */
export function useScrollReveal() {
  useEffect(() => {
    // Bez IntersectionObserveru (velmi staré prohlížeče) by `.reveal{opacity:0}` nechal
    // obsah natrvalo skrytý → zobraz vše rovnou (žádný scroll-reveal, ale obsah je vidět). (M38)
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll<HTMLElement>('.reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    const observeAll = () => {
      document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)').forEach(el => {
        const r = el.getBoundingClientRect();
        // už (částečně) ve viewportu → zobraz rovnou, nečekej na IO (robustnější po filtru)
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
        else io.observe(el);
      });
    };
    observeAll();
    // MutationObserver na celém <body> firoval observeAll při KAŽDÉ změně DOM
    // (streaming chatu, ECharts, lazy taby) → zbytečný CPU spike. Coalesce do
    // jednoho běhu na snímek přes requestAnimationFrame.
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        observeAll();
      });
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
    // Bez deps: hook se sám stará o nově přidané `.reveal` přes MutationObserver, takže
    // nepotřebuje re-run při změně tabu/filtru (a odpadá křehké spreadování deps). (M37)
  }, []);
}
