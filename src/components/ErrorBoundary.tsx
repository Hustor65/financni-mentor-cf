import { Component } from 'react';
import type { ReactNode } from 'react';
import { KIOSK } from '../utils/kiosk';

/**
 * Záchranná síť: když se nepodaří načíst část webu (typicky výpadek sítě při
 * stahování stránky, která ještě není uložená), neskončí návštěvník na bílé
 * obrazovce. Na stánku se web po chvíli načte znovu sám.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  private timer: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Část webu se nepodařilo zobrazit', error);
    if (KIOSK) this.timer = setTimeout(() => window.location.reload(), 5000);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page-fail sh-fail" role="alert">
        <h1 className="page-title">Tahle část se nenačetla</h1>
        <p className="page-lead">
          Nejspíš vypadlo připojení. Zkus stránku načíst znovu{KIOSK ? ', za pár vteřin to udělám sám.' : '.'}
        </p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>Načíst znovu</button>
      </div>
    );
  }
}
