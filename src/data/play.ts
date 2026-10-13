import { PLAY_MAX } from '../utils/store';
import type { PlayKind } from '../utils/store';

/**
 * Herní obsah začátečnických témat: odhad před čtením („Tipni si“) a třídění
 * tvrzení do dvou hromádek. Čísla v odhadech jsou buď spočitatelná ze zadání,
 * nebo převzatá z teorie daného tématu (data/topicContent.ts) — při změně
 * teorie je potřeba upravit i tady.
 */

export interface Guess {
  q: string;
  min: number;
  max: number;
  step: number;
  answer: number;
  unit: 'Kč' | '%' | 'let' | 'krát';
  /** co výsledek znamená; ukáže se po odhalení */
  reveal: string;
}

export interface SortCard {
  text: string;
  /** 0 = levá hromádka, 1 = pravá */
  side: 0 | 1;
  why: string;
}

export interface SortSet {
  lead: string;
  sides: [string, string];
  cards: SortCard[];
}

const TRUTH: [string, string] = ['Pravda', 'Mýtus'];

export const TOPIC_GUESS: Record<string, Guess> = {
  'rozpocet': {
    q: 'Cestou do školy si každý den koupíš kávu a bagetu za 120 Kč. Kolik za ně utratíš za rok?',
    min: 5_000, max: 100_000, step: 1_000, answer: 43_800, unit: 'Kč',
    reveal: '120 Kč krát 365 dní je 43 800 Kč. Malé denní výdaje nejsou vidět, dokud si je nesečteš. Přesně k tomu je rozpočet.',
  },
  'scamy': {
    q: 'Nabídka slibuje zaručených 30 % měsíčně. Kolik by z 10 000 Kč bylo za rok, kdyby to byla pravda?',
    min: 10_000, max: 1_000_000, step: 10_000, answer: 232_981, unit: 'Kč',
    reveal: 'Vyšlo by 232 981 Kč, tedy 23krát víc za jediný rok. Takhle rychle peníze nerostou nikde, a proto je podobný slib skoro vždy podvod.',
  },
  'dane-brigada': {
    q: 'Sleva na poplatníka je 30 840 Kč ročně a daň z příjmu 15 %. Do jakého ročního výdělku ti tedy daň z příjmu vyjde na nulu?',
    min: 20_000, max: 300_000, step: 5_000, answer: 205_600, unit: 'Kč',
    reveal: '30 840 děleno 0,15 je 205 600 Kč. Do téhle částky sleva pokryje celou daň z příjmu. Proto se u brigády vyplatí podepsat prohlášení poplatníka, nebo si daň po roce vyžádat zpět. Pojistné se počítá zvlášť.',
  },
  'dluhy': {
    q: 'Půjčíš si 20 000 Kč s roční sazbou 60 % a tři roky nic nesplácíš. Kolik dlužíš?',
    min: 20_000, max: 200_000, step: 1_000, answer: 81_920, unit: 'Kč',
    reveal: 'Dluh naroste na 81 920 Kč, tedy na čtyřnásobek. Úrok se počítá i z úroků, takže složené úročení tady pracuje proti tobě. V praxi by přibyly ještě sankce za nesplácení.',
  },
  'jak-na-to': {
    q: 'Zkušební verze aplikace přešla na placenou za 249 Kč měsíčně a nikdo ji nezrušil. Kolik odejde z účtu za 5 let?',
    min: 1_000, max: 25_000, step: 500, answer: 14_940, unit: 'Kč',
    reveal: '249 Kč krát 60 měsíců je 14 940 Kč za službu, kterou nikdo nepoužívá. Stačí si jednou za čas projít správu předplatných.',
  },
  'slozene-uroceni': {
    q: 'Odkládáš 1 000 Kč měsíčně 40 let při výnosu 7 % ročně. Kolik budeš mít?',
    min: 400_000, max: 8_000_000, step: 50_000, answer: 2_624_813, unit: 'Kč',
    reveal: 'Zhruba 2,6 milionu Kč, přitom vložíš jen 480 000 Kč. Přes dva miliony jsou výnosy z výnosů. Je to modelový výpočet se stálým výnosem, skutečné trhy kolísají.',
  },
  'akcie-etf': {
    q: 'Máš 10 000 Kč v ETF, kde je 500 firem zastoupených stejným dílem. Jedna z nich zkrachuje. O kolik korun přijdeš?',
    min: 0, max: 1_000, step: 10, answer: 20, unit: 'Kč',
    reveal: 'Jen o 20 Kč, protože na každou firmu připadá pětisetina. Kdyby celých 10 000 Kč leželo v akciích té jedné firmy, bylo by pryč všechno. Skutečná ETF váží firmy podle velikosti, princip je stejný.',
  },
  'inflace': {
    q: 'Schováš 100 000 Kč v hotovosti. Inflace je 3 % ročně. Kolik zboží si za ně koupíš za 20 let, počítáno v dnešních cenách?',
    min: 0, max: 100_000, step: 1_000, answer: 55_368, unit: 'Kč',
    reveal: 'Asi za 55 000 Kč. Bankovky zůstanou stejné, ale ceny mezitím vyrostou zhruba o 80 %, takže skoro polovina kupní síly je pryč.',
  },
  'riziko': {
    q: 'Investice spadne o 50 %. O kolik procent musí vyrůst, aby byla zpátky na původní hodnotě?',
    min: 0, max: 300, step: 5, answer: 100, unit: '%',
    reveal: 'O 100 %. Ze 100 korun zbyde 50 a z 50 zpátky na 100 je dvojnásobek. Proto se velkým propadům vyplatí předcházet rozložením peněz.',
  },
  'dane-dip': {
    q: 'Jak dlouho musíš akcie nebo ETF držet, aby byl zisk z prodeje osvobozený od daně?',
    min: 0, max: 10, step: 1, answer: 3, unit: 'let',
    reveal: 'Déle než 3 roky. Říká se tomu časový test. Kdo prodá dřív a za rok prodá cenné papíry za víc než 100 000 Kč, zisk daní.',
  },
  'duchod': {
    q: 'Dva lidé odkládají 1 000 Kč měsíčně při výnosu 7 % ročně až do 65 let. Jeden začne ve 20, druhý ve 40. Kolikrát víc bude mít ten první?',
    min: 1, max: 10, step: 0.1, answer: 4.7, unit: 'krát',
    reveal: 'Asi 4,7krát víc: zhruba 3,8 milionu proti 810 tisícům Kč. Přitom vloží jen 1,8krát tolik (540 000 proti 300 000 Kč). Rozdíl dělá čas.',
  },
};

export const TOPIC_SORT: Record<string, SortSet> = {
  'rozpocet': {
    lead: 'Pravidlo 50/30/20 stojí na tom, že rozeznáš nutný výdaj od toho, co jen chceš.',
    sides: ['Potřeba', 'Chtění'],
    cards: [
      { text: 'Nájem za pokoj', side: 0, why: 'Bydlení je nutný výdaj.' },
      { text: 'Další streamovací služba', side: 1, why: 'Bez třetí služby se obejdeš. Patří mezi chtění.' },
      { text: 'Měsíční jízdenka do školy', side: 0, why: 'Do školy se dostat musíš.' },
      { text: 'Nová sluchátka, i když stará fungují', side: 1, why: 'Dokud stará slouží, je to přání, ne potřeba.' },
      { text: 'Základní nákup potravin', side: 0, why: 'Jídlo je nutný výdaj.' },
      { text: 'Rozvoz jídla třikrát týdně', side: 1, why: 'Najíst se musíš, ale rozvoz je pohodlí navíc. Stejné jídlo uvařené doma vyjde na zlomek.' },
    ],
  },
  'scamy': {
    lead: 'Podvody se liší obalem, ale varovné signály mají stejné.',
    sides: ['Varovný signál', 'V pořádku'],
    cards: [
      { text: 'Musíš se rozhodnout do hodiny, jinak nabídka propadne', side: 0, why: 'Časový tlak je typický znak podvodu. Poctivá nabídka počká.' },
      { text: 'Banka tě ve své aplikaci upozorní na novou platbu', side: 1, why: 'Oznámení přímo v oficiální aplikaci je běžné. Nebezpečné jsou odkazy v SMS a e-mailech.' },
      { text: 'Výnos je prý zaručený a bez rizika', side: 0, why: 'Vysoký výnos bez rizika neexistuje.' },
      { text: 'Máš to prý držet v tajnosti před rodiči', side: 0, why: 'Podvodník potřebuje, aby ti nikdo neporadil.' },
      { text: 'E-shop ti po objednávce pošle potvrzení a fakturu', side: 1, why: 'Potvrzení vlastní objednávky je běžná věc.' },
      { text: 'Neznámý člověk chce kód z SMS, který ti právě přišel', side: 0, why: 'Kód z SMS potvrzuje platbu nebo přihlášení. Nikdy ho nikomu neříkej.' },
    ],
  },
  'dane-brigada': {
    lead: 'Kolem brigád koluje dost polopravd. Poznáš, co platí?',
    sides: TRUTH,
    cards: [
      { text: 'Hrubá mzda je částka před odečtením daně a odvodů', side: 0, why: 'Čistá mzda je to, co po srážkách přijde na účet.' },
      { text: 'Prohlášení poplatníka můžeš mít podepsané u více zaměstnavatelů najednou', side: 1, why: 'Podepsat ho jde vždy jen u jednoho zaměstnavatele zároveň.' },
      { text: 'Sraženou daň z brigády už nikdy nedostaneš zpátky', side: 1, why: 'Při nízkém ročním příjmu ti ji finanční úřad po podání daňového přiznání vrátí.' },
      { text: 'Většina studentských brigád se dělá na DPP', side: 0, why: 'Dohoda o provedení práce je u studentů nejběžnější.' },
      { text: 'Když je domluveno 150 Kč na hodinu, přesně tolik vždy přijde na účet', side: 1, why: 'Domlouvá se hrubá mzda. Čistá může být nižší.' },
      { text: 'Výplatní pásky se vyplatí schovávat', side: 0, why: 'Budou se hodit při daňovém přiznání.' },
    ],
  },
  'dluhy': {
    lead: 'Dobrý dluh ti pomáhá získat hodnotu nebo vyšší příjem. Špatný je drahý úvěr na věci, které rychle ztrácejí cenu.',
    sides: ['Dobrý dluh', 'Špatný dluh'],
    cards: [
      { text: 'Rozumná hypotéka na vlastní bydlení', side: 0, why: 'Získáváš hodnotu, která ti zůstane.' },
      { text: 'Rychlá půjčka na dovolenou', side: 1, why: 'Drahý úvěr na spotřebu, ze které za měsíc nic nezbude.' },
      { text: 'Levná půjčka na kurz, který ti zvedne plat', side: 0, why: 'Investice do dovednosti se může vrátit ve vyšším příjmu.' },
      { text: 'Nový telefon na splátky, i když starý funguje', side: 1, why: 'Zbytná věc, která rychle ztrácí cenu, a ještě ji přeplatíš.' },
      { text: 'Kreditka, ze které splácíš jen minimum', side: 1, why: 'Na zbytek naskakuje vysoký úrok a dluh se nabaluje.' },
      { text: 'Půjčka na nářadí, se kterým si začneš vydělávat', side: 0, why: 'Věc, která přináší příjem, může půjčku zaplatit. I tak si předem spočítej RPSN.' },
    ],
  },
  'jak-na-to': {
    lead: 'Šest tvrzení z běžného života. Která platí?',
    sides: TRUTH,
    cards: [
      { text: 'Smazáním aplikace se zruší i její předplatné', side: 1, why: 'Platba běží dál. Zrušit se musí ve správě předplatných.' },
      { text: 'Kauce u podnájmu je vratná', side: 0, why: 'Dostaneš ji zpět, když byt předáš nepoškozený a bez dluhů na nájmu.' },
      { text: 'Čistá mzda je to, co ti opravdu přijde na účet', side: 0, why: 'Je to hrubá mzda po odečtení daně a pojištění.' },
      { text: 'Zkušební verze zdarma se po skončení vždy sama vypne', side: 1, why: 'Často přejde na placenou. Termín si poznač a zruš ji včas.' },
      { text: 'Studentský účet bývá zdarma', side: 0, why: 'Většinou ho navíc zařídíš online za pár minut.' },
      { text: 'Výplatní páska ukazuje jen částku, která ti přišla', side: 1, why: 'Ukazuje i to, kolik a kam se z hrubé mzdy strhlo.' },
    ],
  },
  'slozene-uroceni': {
    lead: 'Složené úročení je jednoduché, a přesto ho lidé často odhadují špatně.',
    sides: TRUTH,
    cards: [
      { text: 'Výnosy, které necháš investované, vydělávají další výnosy', side: 0, why: 'Přesně tomu se říká složené úročení.' },
      { text: 'Peníze přibývají každý rok o stejnou částku', side: 1, why: 'Rostou čím dál rychleji, protože se úročí i dřívější výnosy.' },
      { text: 'Při 8 % ročně se vklad zdvojnásobí zhruba za 9 let', side: 0, why: 'Pravidlo 72: 72 děleno 8 je 9.' },
      { text: 'Začít o deset let později skoro nic nezmění', side: 1, why: 'Nejvíc přinášejí poslední roky. Kdo začne později, o ně přijde.' },
      { text: 'Čas hraje větší roli než snaha trefit ideální okamžik nákupu', side: 0, why: 'Pravidelné investování po dlouhou dobu bývá spolehlivější než časování trhu.' },
      { text: 'U dluhu pracuje složené úročení proti tobě', side: 0, why: 'Nesplacený dluh se nabaluje stejnou matematikou.' },
    ],
  },
  'akcie-etf': {
    lead: 'Akcie a dluhopis jsou dva základní stavební kameny. Ke kterému tvrzení patří?',
    sides: ['Akcie', 'Dluhopis'],
    cards: [
      { text: 'Stáváš se spolumajitelem firmy', side: 0, why: 'Akcie je podíl ve firmě.' },
      { text: 'Půjčuješ peníze státu nebo firmě', side: 1, why: 'Dluhopis je půjčka, za kterou dostáváš úrok.' },
      { text: 'Může ti chodit dividenda', side: 0, why: 'Dividenda je podíl na zisku firmy vyplácený majitelům akcií.' },
      { text: 'Předem víš úrok i datum splacení', side: 1, why: 'Dluhopis má daný úrok a den, kdy se půjčená částka vrací.' },
      { text: 'Cena obvykle kolísá víc', side: 0, why: 'Akcie mají dlouhodobě vyšší výnos, ale i větší výkyvy.' },
      { text: 'Nižší výnos výměnou za větší klid', side: 1, why: 'Dluhopisy bývají stabilnější než akcie.' },
    ],
  },
  'inflace': {
    lead: 'Inflace je nenápadná, o to víc se o ní traduje omylů.',
    sides: TRUTH,
    cards: [
      { text: 'Inflace znamená, že ceny v čase rostou', side: 0, why: 'A tím klesá kupní síla peněz.' },
      { text: 'Bankovka v šuplíku si drží svou kupní sílu', side: 1, why: 'Číslo na ní zůstává, ale koupíš za ni čím dál méně.' },
      { text: 'Dlouhodobý cíl ČNB je inflace 2 % ročně', side: 0, why: 'Mírná stálá inflace je záměr, ne nehoda.' },
      { text: 'Úrok 1 % na účtu stačí, i když je inflace 3 %', side: 1, why: 'Reálně tak každý rok zhruba o 2 % chudneš.' },
      { text: 'Při 3% inflaci si za 20 let koupíš za stejnou částku asi o 45 % méně', side: 0, why: 'Malé procento se za dlouhou dobu nasčítá.' },
      { text: 'Proti inflaci se nedá nic dělat', side: 1, why: 'Dlouhodobě ji pomáhá překonat investování.' },
    ],
  },
  'riziko': {
    lead: 'Riziko nejde odstranit, ale jde ho řídit. Co ho snižuje a co zvyšuje?',
    sides: ['Snižuje riziko', 'Zvyšuje riziko'],
    cards: [
      { text: 'Rozložit peníze mezi stovky firem', side: 0, why: 'Tomu se říká diverzifikace. Pád jedné firmy pak skoro nepoznáš.' },
      { text: 'Vsadit všechno na jednu akcii', side: 1, why: 'Když se té jedné firmě nedaří, nese to celé tvoje portfolio.' },
      { text: 'Investovat peníze, které necháš ležet 15 let', side: 0, why: 'Dlouhý horizont dává čas přečkat propady.' },
      { text: 'Investovat peníze, které budeš za měsíc potřebovat', side: 1, why: 'Když trh zrovna klesne, musíš prodat se ztrátou.' },
      { text: 'Mít stranou nouzovou rezervu', side: 0, why: 'Nečekaný výdaj tě pak nedonutí prodávat investice.' },
      { text: 'Půjčit si na investici', side: 1, why: 'Dluh musíš splatit, i když investice spadne.' },
    ],
  },
  'dane-dip': {
    lead: 'Daně z investic mají pár jednoduchých pravidel. Poznáš je?',
    sides: TRUTH,
    cards: [
      { text: 'Po více než 3 letech držení je zisk z prodeje akcií osvobozený od daně', side: 0, why: 'To je časový test.' },
      { text: 'Daní se celá částka z prodeje, ne jen zisk', side: 1, why: 'Daní se jen zisk: prodejní cena minus nákupní cena a poplatky.' },
      { text: 'Když za rok prodáš cenné papíry nejvýš za 100 000 Kč, daň neplatíš', side: 0, why: 'To je hodnotový test. Počítá se úhrn prodejů, ne zisk.' },
      { text: 'Peníze z DIP si můžeš kdykoli vybrat bez následků', side: 1, why: 'Jsou vázané nejdřív do 60 let a zároveň aspoň na 10 let.' },
      { text: 'Vklady do DIP snižují základ daně až o 48 000 Kč ročně', side: 0, why: 'Na dani tak ušetříš až 7 200 Kč. Limit je společný s penzijním spořením a životním pojištěním.' },
      { text: 'Základní sazba daně ze zisku z investic je 15 %', side: 0, why: 'Vyšší sazba 23 % se týká až velmi vysokých příjmů.' },
    ],
  },
  'duchod': {
    lead: 'Důchod se zdá daleko, ale rozhoduje se o něm už teď.',
    sides: TRUTH,
    cards: [
      { text: 'Státní důchod má základní a procentní výměru', side: 0, why: 'Základní je stejná pro všechny, procentní závisí na výdělcích a odpracovaných letech.' },
      { text: 'U průměrné mzdy nahradí státní důchod asi 90 % příjmu', side: 1, why: 'Je to zhruba 45 %.' },
      { text: 'Na stáří stačí začít myslet po čtyřicítce', side: 1, why: 'Čím dřív začneš, tím menší částky stačí.' },
      { text: 'Základní výměra důchodu je pro všechny stejná', side: 0, why: 'Liší se až procentní výměra.' },
      { text: 'Výše důchodu závisí i na počtu odpracovaných let', side: 0, why: 'Procentní výměra roste s výdělky a dobou pojištění.' },
      { text: 'DIP je jeden ze způsobů, jak si na stáří spořit s daňovou úlevou', side: 0, why: 'Vklady si můžeš odečíst od základu daně.' },
    ],
  },
};

/** Které hry téma nabízí. Kvíz má každé téma, odhad a třídění jen ta začátečnická. */
export function topicPlay(topicId: string): PlayKind[] {
  const kinds: PlayKind[] = [];
  if (TOPIC_GUESS[topicId]) kinds.push('tip');
  if (TOPIC_SORT[topicId]) kinds.push('sort');
  kinds.push('quiz');
  return kinds;
}

export const topicMax = (topicId: string): number =>
  topicPlay(topicId).reduce((sum, kind) => sum + PLAY_MAX[kind], 0);

/** Úrovně podle celkového počtu bodů. */
export const RANKS: { from: number; label: string }[] = [
  { from: 0, label: 'První kroky' },
  { from: 150, label: 'Rozjezd' },
  { from: 400, label: 'Peníze pod kontrolou' },
  { from: 750, label: 'Připraveno investovat' },
  { from: 1100, label: 'Celá akademie' },
];

export function rankOf(points: number) {
  const index = RANKS.reduce((best, r, i) => (points >= r.from ? i : best), 0);
  return { index, current: RANKS[index], next: RANKS[index + 1] as (typeof RANKS)[number] | undefined };
}

// 1 bod, 2–4 body, 5+ bodů
export const body = (n: number) => (n === 1 ? 'bod' : n >= 2 && n <= 4 ? 'body' : 'bodů');
