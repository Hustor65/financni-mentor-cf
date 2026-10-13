/** Hlavní sekce webu — sdílí je horní lišta, spodní lišta na telefonu i patička. */
export type TabId = 'prehled' | 'akademie' | 'trhy' | 'nastroje' | 'mentor' | 'presnost';

export const NAV: { id: TabId; label: string; icon: string }[] = [
  { id: 'prehled', label: 'Přehled', icon: 'home' },
  { id: 'akademie', label: 'Akademie', icon: 'graduation-cap' },
  { id: 'trhy', label: 'Trhy', icon: 'candlestick' },
  { id: 'nastroje', label: 'Nástroje', icon: 'calculator' },
  { id: 'mentor', label: 'Mentor', icon: 'message-circle' },
  { id: 'presnost', label: 'Přesnost', icon: 'shield-check' },
];
