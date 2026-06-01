export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface Topic {
  id: string;
  title: string;
  icon: string;
  summary: string;
  status: 'live' | 'coming';
}

export const TOPICS: Topic[] = [
  { id: 'slozene-uroceni', title: 'Složené úročení', icon: 'trending-up', summary: 'Jak peníze rostou exponenciálně a proč začít brzy.', status: 'live' },
  { id: 'akcie-etf', title: 'Akcie, ETF & dluhopisy', icon: 'bar-chart-3', summary: 'Stavební kameny portfolia a jak se liší.', status: 'live' },
  { id: 'inflace', title: 'Inflace', icon: 'trending-down', summary: 'Proč hotovost „pod polštářem" reálně ztrácí.', status: 'live' },
  { id: 'duchod', title: 'Důchod', icon: 'hourglass', summary: 'Kolik dá stát a kolik si musíte zajistit sami.', status: 'live' },
  { id: 'dane-dip', title: 'Daně & DIP', icon: 'scale', summary: 'Kdy z investic neplatíte nic a jak na DIP.', status: 'live' },
  { id: 'riziko', title: 'Riziko & diverzifikace', icon: 'shield-check', summary: 'Proč vyšší výnos vždy znamená vyšší riziko.', status: 'live' },
];

export const INFLATION_QUIZ: QuizQuestion[] = [
  { q: 'Co dělá inflace s hotovostí „pod polštářem"?', options: ['Zhodnocuje ji', 'Snižuje její reálnou hodnotu', 'Nemá na ni vliv'], correct: 1, explain: 'Inflace snižuje kupní sílu — za stejnou částku si po letech koupíte méně.' },
  { q: 'Jaký je dlouhodobý inflační cíl ČNB?', options: ['0 %', '2 %', '10 %'], correct: 1, explain: 'ČNB dlouhodobě cíluje inflaci na 2 % ročně.' },
];

export const PENSION_QUIZ: QuizQuestion[] = [
  { q: 'Z čeho se skládá státní starobní důchod?', options: ['Jen ze základní výměry', 'Ze základní + procentní výměry', 'Jen z procentní výměry'], correct: 1, explain: 'Důchod = základní výměra (stejná pro všechny) + procentní výměra (dle výdělků a let).' },
  { q: 'Kolik zhruba nahradí stát u průměrné mzdy?', options: ['~45 %', '~90 %', '100 %'], correct: 0, explain: 'U průměrné mzdy je náhradový poměr kolem 45 % — zbytek je dobré si zajistit sám.' },
];
