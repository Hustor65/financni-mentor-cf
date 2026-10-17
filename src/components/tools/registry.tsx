import type { ReactNode } from 'react';
import type { Level } from '../../data/levels';
import { CompoundInterestCalc } from '../calculators/CompoundInterestCalc';
import { GoalCalc } from '../calculators/GoalCalc';
import { PensionCalc } from '../calculators/PensionCalc';
import { TaxCalc } from '../calculators/TaxCalc';
import { InflationTool, RiskProfile } from '../academy/TopicTools';
import { BudgetSim } from '../academy/BudgetSim';
import { ScamCheck } from '../academy/ScamCheck';
import { DebtCheck } from '../academy/DebtCheck';
import { OptionsLab } from '../lab/OptionsLab';
import { MonteCarloSim } from '../lab/MonteCarloSim';
import { DcfCalc } from '../lab/DcfCalc';
import { GuessGame } from '../lab/GuessGame';

export interface Tool {
  id: string;
  level: Level;
  icon: string;
  name: string;
  /** co nástroj spočítá — jedna věta */
  lead: string;
  /** téma v Akademii, kde je k nástroji teorie */
  topic?: string;
  render: () => ReactNode;
}

export const TOOLS: Tool[] = [
  { id: 'odhadni-graf', level: 'start', icon: 'zap', name: 'Odhadni graf', lead: 'Deset skutečných grafů useknutých v půlce. Půjde cena dál nahoru, nebo dolů?', topic: 'riziko', render: () => <GuessGame /> },
  { id: 'slozene-uroceni', level: 'start', icon: 'trending-up', name: 'Složené úročení', lead: 'Kolik vyroste z pravidelného vkladu za 10, 20 nebo 30 let.', topic: 'slozene-uroceni', render: () => <CompoundInterestCalc /> },
  { id: 'cil', level: 'start', icon: 'target', name: 'Kolik odkládat na cíl', lead: 'Zadej částku a termín, dostaneš měsíční vklad.', topic: 'slozene-uroceni', render: () => <GoalCalc /> },
  { id: 'rozpocet', level: 'start', icon: 'coins', name: 'Zvládneš měsíc?', lead: 'Šest rozhodnutí s výplatou z brigády a jejich následky.', topic: 'rozpocet', render: () => <BudgetSim /> },
  { id: 'inflace', level: 'start', icon: 'trending-down', name: 'Co udělá inflace', lead: 'Kolik zbude z úspor, které jen leží.', topic: 'inflace', render: () => <InflationTool /> },
  { id: 'podvod', level: 'start', icon: 'alert-triangle', name: 'Poznáš podvod?', lead: 'Šest skutečných situací. Scam, nebo v pořádku?', topic: 'scamy', render: () => <ScamCheck /> },
  { id: 'dluh', level: 'start', icon: 'dollar-sign', name: 'Vyplatí se ten dluh?', lead: 'Kdy si půjčit dává smysl a kdy je to past.', topic: 'dluhy', render: () => <DebtCheck /> },
  { id: 'rizikovy-profil', level: 'start', icon: 'shield-check', name: 'Rizikový profil', lead: 'Kolik kolísání sneseš a co z toho plyne.', topic: 'riziko', render: () => <RiskProfile /> },
  { id: 'dane', level: 'start', icon: 'scale', name: 'Daň z investic a DIP', lead: 'Časový test, limit 100 000 Kč a úspora přes DIP.', topic: 'dane-dip', render: () => <TaxCalc /> },
  { id: 'duchod', level: 'start', icon: 'hourglass', name: 'Odhad státního důchodu', lead: 'Kolik zhruba dostaneš podle pravidel roku 2026.', topic: 'duchod', render: () => <PensionCalc /> },
  { id: 'opce', level: 'pro', icon: 'git-branch', name: 'Opční laboratoř', lead: 'Výplatní diagram sedmi strategií, cena podle Black–Scholese a řecká písmena.', topic: 'opce', render: () => <OptionsLab /> },
  { id: 'monte-carlo', level: 'pro', icon: 'activity', name: 'Monte Carlo simulace', lead: '800 možných průběhů tvého portfolia a šance, že dosáhneš cíle.', topic: 'riziko-v-cislech', render: () => <MonteCarloSim /> },
  { id: 'dcf', level: 'pro', icon: 'calculator', name: 'Ocenění akcie (DCF)', lead: 'Vnitřní hodnota z budoucích cash flow a její citlivost na předpoklady.', topic: 'oceneni-akcii', render: () => <DcfCalc /> },
];
