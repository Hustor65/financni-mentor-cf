import { useSyncExternalStore } from 'react';

/** Co glóbus právě ukazuje — čte to popisek v hero (3D scéna se načítá zvlášť). */
export interface GlobeStatus {
  open: number;
  total: number;
  /** true = zrychlená ukázka obchodního dne (v reálu mají burzy zavřeno) */
  lapse: boolean;
  /** čas v Praze, který glóbus zobrazuje */
  time: string;
}

let status: GlobeStatus | null = null;
const listeners = new Set<() => void>();

export function setGlobeStatus(next: GlobeStatus | null) {
  if (next && status && next.open === status.open && next.lapse === status.lapse && next.time === status.time) return;
  status = next;
  listeners.forEach(fn => fn());
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useGlobeStatus = (): GlobeStatus | null => useSyncExternalStore(subscribe, () => status);
