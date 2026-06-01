import { useEffect } from 'react';

/**
 * Scroll-reveal: prvky s class `.reveal` se při vstupu do viewportu označí `.is-visible`
 * (CSS pak animuje opacity/transform + stagger přes --reveal-i).
 *
 * MutationObserver navíc sleduje DOM — lazy-načtené komponenty (chat, témata, trust)
 * přidají své `.reveal` prvky až po prvním renderu, takže je doobservujeme, jakmile
 * se objeví. Bez toho zůstaly skryté, dokud uživatel nepřepnul tab.
 */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
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
      document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)').forEach(el => io.observe(el));
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
