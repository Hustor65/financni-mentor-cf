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
  { id: 'rozpocet', title: 'Rozpočet a první peníze', icon: 'coins', summary: 'Kam s penězi z brigády a jak mít přehled o výdajích. Nejlepší start.', status: 'live' },
  { id: 'slozene-uroceni', title: 'Složené úročení', icon: 'trending-up', summary: 'Jak peníze rostou exponenciálně a proč začít brzy.', status: 'live' },
  { id: 'akcie-etf', title: 'Akcie, ETF a dluhopisy', icon: 'bar-chart-3', summary: 'Stavební kameny portfolia a jak se liší.', status: 'live' },
  { id: 'inflace', title: 'Inflace', icon: 'trending-down', summary: 'Proč hotovost „pod polštářem“ reálně ztrácí.', status: 'live' },
  { id: 'riziko', title: 'Riziko a diverzifikace', icon: 'shield-check', summary: 'Proč vyšší výnos vždy znamená i vyšší riziko.', status: 'live' },
  { id: 'dane-dip', title: 'Daně a DIP', icon: 'scale', summary: 'Kdy z investic neplatíš daň a jak funguje DIP.', status: 'live' },
  { id: 'duchod', title: 'Důchod', icon: 'hourglass', summary: 'Proč na něj myslet už teď — a proč ti teď stačí míň než komukoli staršímu.', status: 'live' },
];

// Téma „Rozpočet a první peníze" — vstupní téma pro studenty (rozpočet, rezerva, brigáda).
export const ROZPOCET_QUIZ: QuizQuestion[] = [
  { q: 'Co říká jednoduché pravidlo 50/30/20?', options: ['50 % spoření, 30 % potřeby, 20 % zábava', '50 % potřeby, 30 % chtění, 20 % spoření', '50 % daně, 30 % nájem, 20 % jídlo'], correct: 1, explain: 'Příjem si rozdělíš na 50 % nutné výdaje, 30 % zábavu a chtění a 20 % dáš stranou na spoření.' },
  { q: 'K čemu je nouzová rezerva?', options: ['Na dovolenou', 'Na nečekané výdaje, ideálně na 3–6 měsíců', 'Na nákup akcií'], correct: 1, explain: 'Rezerva tě podrží, když přijde nečekaný výdaj nebo výpadek příjmu. Měj ji dřív, než začneš investovat.' },
  { q: 'Jaký je rozumný první krok s penězi z brigády?', options: ['Hned všechno vrazit do krypta', 'Rychle to utratit, ať z toho něco mám', 'Zjistit, kolik mi zbývá, a část pravidelně odkládat'], correct: 2, explain: 'Než peníze někam pošleš, vyplatí se vědět, kolik ti měsíčně přijde a odejde — a část pravidelně dávat stranou.' },
];

export const INFLATION_QUIZ: QuizQuestion[] = [
  { q: 'Co dělá inflace s hotovostí „pod polštářem“?', options: ['Zhodnocuje ji', 'Snižuje její reálnou hodnotu', 'Nemá na ni vliv'], correct: 1, explain: 'Inflace snižuje kupní sílu — za stejnou částku si po letech koupíš míň.' },
  { q: 'Jaký je dlouhodobý inflační cíl ČNB?', options: ['0 %', '2 %', '10 %'], correct: 1, explain: 'Česká národní banka (ČNB) dlouhodobě usiluje o inflaci kolem 2 % ročně.' },
  { q: 'Jak se dá inflaci dlouhodobě bránit?', options: ['Nechat peníze ležet na běžném účtu', 'Investovat tak, aby výnos překonal inflaci', 'Vybrat všechno v hotovosti'], correct: 1, explain: 'Smyslem investování je udržet a navýšit reálnou hodnotu peněz — růst aspoň stejně rychle jako ceny.' },
];

export const PENSION_QUIZ: QuizQuestion[] = [
  { q: 'Z čeho se skládá státní starobní důchod?', options: ['Jen ze základní výměry', 'Ze základní a procentní výměry', 'Jen z procentní výměry'], correct: 1, explain: 'Důchod = základní výměra (stejná pro všechny) + procentní výměra (podle výdělků a odpracovaných let).' },
  { q: 'Jakou část mzdy zhruba nahradí státní důchod u průměrné mzdy?', options: ['Přibližně 45 %', 'Přibližně 90 %', '100 %'], correct: 0, explain: 'U průměrné mzdy je náhradový poměr kolem 45 % — zbytek je dobré si zajistit vlastním spořením.' },
  { q: 'Proč se vyplatí myslet na důchod už jako student?', options: ['Aby člověk nemusel pracovat', 'Protože čím dřív začneš, tím víc za tebe odpracuje složené úročení', 'Nevyplatí se, je to zbytečné'], correct: 1, explain: 'Čas je tvoje největší výhoda — malé částky odkládané brzy narostou díky složenému úročení víc než velké částky pozdě.' },
];
