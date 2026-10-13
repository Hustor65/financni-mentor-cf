/** Úroveň návštěvníka — řídí, co se mu v Akademii, Trzích a Nástrojích nabídne jako první. */
export type Level = 'start' | 'pro';

export const LEVELS: { id: Level; label: string; lead: string }[] = [
  { id: 'start', label: 'Začínám', lead: 'Rozpočet, první výplata, dluhy a základy investování. Bez žargonu.' },
  { id: 'pro', label: 'Už něco umím', lead: 'Opce, oceňování akcií, technická analýza a simulace portfolia.' },
];
