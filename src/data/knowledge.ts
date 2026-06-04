/**
 * Znalostní báze + lehký lexikální retriever pro grounding AI Mentora.
 * Port z Python knowledge.py — zachovány všechny české texty.
 */

export interface LessonBlock {
  h: string;
  p: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  minutes: number;
  summary: string;
  blocks: LessonBlock[];
  quiz: QuizQuestion[];
}

export interface GlossaryTerm {
  term: string;
  def: string;
}

export interface ExtraFact {
  id: string;
  title: string;
  source: string;
  text: string;
}

// ── AKADEMIE ──
export const ACADEMY_LESSONS: Lesson[] = [
  {
    id: 'proc-investovat', title: 'Proč vůbec investovat', icon: 'trending-up',
    minutes: 5, summary: 'Inflace, čas a síla složeného úročení.',
    blocks: [
      { h: 'Inflace ujídá z úspor', p: 'Peníze na běžném účtu každý rok ztrácejí kupní sílu. Při inflaci 3 % ročně z dnešních 100 000 Kč zbude za 20 let reálně jen kolem 55 000 Kč. Investování je hlavní způsob, jak se inflaci bránit a hodnotu peněz si dlouhodobě udržet.' },
      { h: 'Síla složeného úročení', p: 'Když výnosy necháš dál pracovat (reinvestuješ je), začnou samy vydělávat další výnosy. Tomu se říká složené úročení. V čase to roste čím dál rychleji — a právě proto je nejdůležitější začít brzy, ne nutně s velkou částkou.' },
      { h: 'Čas je cennější než částka', p: 'Kdo začne ve 25 a odkládá málo, často skončí výš než ten, kdo začne ve 40 s vyšší částkou. Pracuje za tebe čas, ne snaha dokonale trefit ten správný okamžik.' },
    ],
    quiz: [
      { q: 'Co dělá inflace s úsporami na běžném účtu?', options: ['Zvyšuje jejich kupní sílu', 'Snižuje jejich kupní sílu', 'Nemá na ně vliv'], correct: 1, explain: 'Inflace snižuje reálnou hodnotu (kupní sílu) peněz v čase.' },
      { q: 'Co je složené úročení?', options: ['Daň z výnosů', 'Výnosy, které samy vydělávají další výnosy', 'Poplatek brokerovi'], correct: 1, explain: 'Reinvestované výnosy vydělávají další výnosy, takže hodnota roste exponenciálně.' },
      { q: 'Co je u dlouhodobého investování nejcennější?', options: ['Čas — začít brzy', 'Dokonalé načasování trhu', 'Co největší jednorázová částka'], correct: 0, explain: 'Čas a pravidelnost dlouhodobě porazí snahu trh načasovat.' },
    ],
  },
  {
    id: 'akcie-dluhopisy-etf', title: 'Akcie, dluhopisy, ETF — co je co', icon: 'bar-chart-3',
    minutes: 7, summary: 'Základní stavební kameny portfolia.',
    blocks: [
      { h: 'Akcie = podíl ve firmě', p: 'Když si koupíš akcii, stáváš se spolumajitelem firmy. Vyděláváš na růstu její hodnoty a někdy i z dividend (podílu na zisku). Akcie mívají dlouhodobě vyšší výnos, ale taky víc kolísají.' },
      { h: 'Dluhopis = půjčka', p: 'Dluhopisem půjčuješ státu nebo firmě a oni ti za to platí úrok. Bývá klidnější než akcie, ale s nižším očekávaným výnosem.' },
      { h: 'ETF = koš mnoha aktiv', p: 'ETF (burzovně obchodovaný fond) drží v jednom nákupu stovky až tisíce akcií nebo dluhopisů a obvykle kopíruje nějaký index (třeba celý světový akciový trh). Jedním nákupem tak rozložíš peníze do spousty firem naráz a poplatky jsou nízké — pro začátečníka nejčastější základ portfolia.' },
    ],
    quiz: [
      { q: 'Co znamená vlastnit akcii?', options: ['Půjčil jsem firmě peníze', 'Jsem spolumajitel firmy', 'Mám pojištění'], correct: 1, explain: 'Akcie = podíl (vlastnictví) ve firmě.' },
      { q: 'Co bývá typicky stabilnější?', options: ['Akcie', 'Dluhopisy'], correct: 1, explain: 'Dluhopisy bývají méně kolísavé, ale s nižším očekávaným výnosem.' },
      { q: 'Hlavní výhoda ETF pro začátečníka?', options: ['Zaručený výnos', 'Okamžitá diverzifikace a nízké poplatky', 'Žádné riziko'], correct: 1, explain: 'ETF levně rozloží peníze do mnoha aktiv. Riziko ale nemizí.' },
    ],
  },
  {
    id: 'riziko-vynos-diverzifikace', title: 'Riziko, výnos a diverzifikace', icon: 'shield-check',
    minutes: 6, summary: 'Proč vyšší výnos vždy znamená vyšší riziko.',
    blocks: [
      { h: 'Výnos a riziko jdou ruku v ruce', p: 'Vysoký výnos bez rizika neexistuje. Když ti někdo slibuje „zaručené“ vysoké zhodnocení, zbystři — často je to podvod.' },
      { h: 'Diverzifikace = nesázej vše na jednu kartu', p: 'Když rozložíš peníze mezi víc aktiv, regionů a oborů, tolik tě nezasáhne, když se jedné investici nedaří. Velkou část téhle práce za tebe udělají ETF.' },
      { h: 'Jak dlouho budeš peníze postrádat, takové riziko unes', p: 'Na peníze, které budeš potřebovat za rok, patří spíš opatrné nástroje. Na 15+ let si můžeš dovolit víc akcií — máš totiž čas přečkat i propady.' },
    ],
    quiz: [
      { q: 'Co znamená slib „zaručeného“ vysokého výnosu?', options: ['Skvělá příležitost', 'Varovný signál / možný podvod', 'Běžná nabídka bank'], correct: 1, explain: 'Vysoký výnos bez rizika neexistuje — je to klasický znak podvodu.' },
      { q: 'K čemu slouží diverzifikace?', options: ['Ke zvýšení poplatků', 'Ke snížení dopadu neúspěchu jedné investice', 'K zaručení zisku'], correct: 1, explain: 'Rozloží riziko mezi více aktiv, takže jeden propadák tolik nebolí.' },
      { q: 'Pro peníze potřebné až za 15+ let je vhodnější:', options: ['Spíš akcie / ETF', 'Jen spořicí účet'], correct: 0, explain: 'Delší horizont umožní přečkat výkyvy a využít vyšší výnos akcií.' },
    ],
  },
  {
    id: 'jak-zacit-cr', title: 'Jak začít prakticky v ČR', icon: 'target',
    minutes: 8, summary: 'Broker vs. robo, DIP a daně z investic.',
    blocks: [
      { h: 'Kde investovat', p: 'Investovat můžeš přes brokera (ETF a akcie si vybíráš sám) nebo přes robo-advisora (ten ti portfolio sestaví a spravuje za roční poplatek). Vždy si ověř, že je poskytovatel regulovaný (ČNB / EU) — je to tvoje pojistka.' },
      { h: 'DIP — daňová výhoda na penzi', p: 'Dlouhodobý investiční produkt (DIP) ti umožní odečíst od základu daně až 48 000 Kč ročně. Peníze jsou ale vázané do 60 let věku a minimálně 10 let — hodí se proto na dlouhodobé spoření na penzi.' },
      { h: 'Daně z investic (základ)', p: 'V ČR platí časový test: když cenné papíry držíš déle než 3 roky, je zisk z prodeje osvobozený od daně. Osvobozený je i rok, kdy souhrn tvých prodejů nepřesáhne 100 000 Kč. Pravidla se ale mění, tak si je vždycky ověř k aktuálnímu roku.' },
    ],
    quiz: [
      { q: 'Co dělá robo-advisor?', options: ['Půjčuje peníze', 'Sestaví a spravuje portfolio za poplatek', 'Garantuje výnos'], correct: 1, explain: 'Robo-advisor automaticky sestaví a spravuje portfolio za roční poplatek.' },
      { q: 'Hlavní výhoda DIP?', options: ['Žádné riziko', 'Odpočet až 48 000 Kč/rok od daní', 'Okamžitý přístup k penězům'], correct: 1, explain: 'DIP dává daňový odpočet, ale peníze jsou vázané do 60 let a min. 10 let.' },
      { q: 'Po jak dlouhé držbě je zisk z cenných papírů osvobozen (časový test)?', options: ['1 rok', 'Více než 3 roky', '10 let'], correct: 1, explain: 'Časový test = držba delší než 3 roky → osvobození zisku od daně.' },
    ],
  },
  {
    id: 'chyby-psychologie', title: 'Nejčastější chyby a psychologie', icon: 'alert-triangle',
    minutes: 6, summary: 'Časování trhu, panika, poplatky a FOMO.',
    blocks: [
      { h: 'Časování trhu nefunguje', p: 'Snaha „nakoupit dole a prodat nahoře“ dlouhodobě nevychází ani profíkům. Když investuješ pravidelně stejnou částku (DCA), zbavíš rozhodování emocí.' },
      { h: 'Největší nepřítel je panika', p: 'Propady trhu jsou normální, patří k tomu. Kdo v panice prodá, promění dočasný pokles v trvalou ztrátu. Historicky se trhy z propadů vždycky zotavily — odměnou je trpělivost.' },
      { h: 'Hlídej si poplatky a hype', p: 'Vysoké poplatky ti za desítky let ukrojí obrovský kus výnosu. A dej si pozor na FOMO (strach, že o něco přijdeš) u krypta a „zaručených“ trendů — to je častá cesta ke ztrátě.' },
    ],
    quiz: [
      { q: 'Funguje dlouhodobě časování trhu?', options: ['Ano, spolehlivě', 'Ne, ani profesionálům', 'Jen u krypta'], correct: 1, explain: 'Časování trhu dlouhodobě selhává; pomáhá pravidelnost (DCA).' },
      { q: 'Co má při propadu trhu dělat dlouhodobý investor?', options: ['Spanikařit a prodat', 'Zachovat klid a držet plán', 'Vsadit vše na jednu akcii'], correct: 1, explain: 'Propady jsou normální; panický prodej mění dočasný pokles v trvalou ztrátu.' },
      { q: 'Proč hlídat poplatky?', options: ['Nemají vliv', 'Za desítky let ukrojí velkou část výnosu', 'Zvyšují výnos'], correct: 1, explain: 'Poplatky se složeně načítají a výrazně sníží konečný výnos.' },
    ],
  },
];

// ── SLOVNÍČEK ──
export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Akcie', def: 'Podíl (vlastnictví) ve firmě. Vyděláváš na růstu její hodnoty a na dividendách. Dlouhodobě nabízí vyšší výnos, ale i větší kolísání (a tím vyšší riziko).' },
  { term: 'Dluhopis', def: 'Půjčka státu nebo firmě, která ti za to platí úrok. Klidnější než akcie, ale nižší výnos.' },
  { term: 'ETF', def: 'Burzovně obchodovaný fond — jedním nákupem koupíš celý koš mnoha aktiv naráz, obvykle kopíruje index. Levné a rovnou rozložené do spousty firem.' },
  { term: 'Index', def: 'Ukazatel, jak si vede celý koš cenných papírů dohromady. Příklad: index S&P 500 sleduje 500 největších amerických firem.' },
  { term: 'Indexový fond', def: 'Fond, který jen pasivně kopíruje index místo toho, aby akcie aktivně vybíral. Díky tomu má nízké poplatky.' },
  { term: 'Podílový fond', def: 'Fond, kde správce spojí peníze investorů dohromady a investuje je za ně. Bývá dražší než ETF.' },
  { term: 'Diverzifikace', def: 'Rozložení peněz mezi víc aktiv, regionů a oborů, aby tě jeden neúspěch tolik nezasáhl.' },
  { term: 'Složené úročení', def: 'Výnosy, které samy vydělávají další výnosy. V čase to roste čím dál rychleji.' },
  { term: 'Inflace', def: 'Růst cen v čase, tedy pokles hodnoty peněz (za stejnou částku si koupíš míň než dřív). Cíl ČNB je 2 % ročně.' },
  { term: 'Volatilita', def: 'Míra kolísání ceny. Vyšší volatilita = větší výkyvy nahoru i dolů.' },
  { term: 'Riziko', def: 'Možnost, že skutečný výnos bude jiný (i horší) než očekávaný. Vyšší výnos = vyšší riziko.' },
  { term: 'Výnos', def: 'O kolik ti investice vydělá za dané období, obvykle se udává v % ročně (p.a. = per annum, tj. za rok).' },
  { term: 'Likvidita', def: 'Jak rychle a bez ztráty dokážeš aktivum proměnit zpátky na hotovost.' },
  { term: 'Dividenda', def: 'Podíl na zisku firmy vyplácený akcionářům.' },
  { term: 'P/E poměr', def: 'Cena akcie dělená ročním ziskem na akcii. Zhruba ti napoví, jak je akcie „drahá“ vůči tomu, kolik firma vydělává.' },
  { term: 'DCA', def: 'Pravidelné investování stejné částky (třeba každý měsíc). Zbaví tě rozhodování, kdy zrovna nakoupit, a vyřadí emoce.' },
  { term: 'DIP', def: 'Dlouhodobý investiční produkt. Umožní ti daňový odpočet až 48 000 Kč ročně; peníze jsou ale vázané nejméně 10 let a zároveň do 60 let věku.' },
  { term: 'Penzijní spoření', def: 'Doplňkové penzijní spoření se státním příspěvkem a možností daňového odpočtu. Dlouhodobě si v něm spoříš na penzi v regulovaném fondu.' },
  { term: 'Broker', def: 'Zprostředkovatel, přes kterého nakupuješ a prodáváš cenné papíry. Vždy si ověř, že je regulovaný (ČNB/EU).' },
  { term: 'Robo-advisor', def: 'Online služba, která ti za roční poplatek automaticky sestaví a spravuje portfolio podle toho, co potřebuješ (např. Portu, Fondee).' },
  { term: 'TER', def: 'Celková roční nákladovost fondu nebo ETF v %. Čím nižší, tím líp — poplatky ti ujídají výnos.' },
  { term: 'Časový test', def: 'Daňové pravidlo: když cenné papíry držíš déle než 3 roky, je zisk z jejich prodeje osvobozený od daně z příjmu.' },
  { term: 'Portfolio', def: 'Všechny tvoje investice dohromady.' },
  { term: 'Rebalancování', def: 'Občas srovnáš portfolio zpátky na cílové rozložení (třeba 80 % akcie / 20 % dluhopisy).' },
  { term: 'Býčí / medvědí trh', def: 'Býčí trh = dlouhodobý růst, medvědí trh = pokles o 20 %+ od vrcholu.' },
  { term: 'FIRE', def: 'Z anglického „Financial Independence, Retire Early“ (finanční nezávislost, dřívější odchod do penze). Cílem je naspořit a zainvestovat dost na to, abys mohl přestat pracovat dřív než v důchodovém věku.' },
  { term: 'RPSN', def: 'Roční procentní sazba nákladů. Říká ti, kolik tě půjčka reálně stojí za rok — včetně všech poplatků, ne jen úroku. Čím nižší RPSN, tím levnější půjčka. Porovnávej půjčky právě podle RPSN, ne podle úroku.' },
  { term: 'Úrok', def: 'Cena za půjčení peněz. Když spoříš, banka platí úrok tobě. Když si půjčíš, platíš ho ty bance. Čím vyšší úrok u půjčky, tím dráž tě vyjde.' },
  { term: 'Kreditka vs. debetka', def: 'Debetkou utrácíš svoje vlastní peníze z účtu. Kreditkou si půjčuješ peníze banky — a když je nesplatíš včas, může se to pořádně prodražit na úrocích.' },
  { term: 'Nouzová rezerva', def: 'Peníze odložené stranou na 3–6 měsíců tvých výdajů pro případ nouze (rozbité auto, výpadek příjmu). Měl bys ji mít dřív, než začneš investovat — je to tvůj záchranný polštář.' },
  { term: 'Rozpočet 50/30/20', def: 'Jednoduché pravidlo, jak rozdělit příjem: 50 % na potřeby (nájem, jídlo), 30 % na chtění (zábava) a 20 % na spoření a splátky dluhů. Snadno zapamatovatelný start, čísla si můžeš upravit.' },
  { term: 'BNPL (kup teď, zaplať později)', def: 'Z anglického „Buy Now, Pay Later“ — odložená platba, kterou splácíš po částech. Láká, protože si věc odneseš hned, ale snadno se v drobných splátkách utopíš a ztratíš přehled. Měj na ně velký pozor.' },
];

// ── EXTRA FAKTA ──
export const EXTRA_FACTS: ExtraFact[] = [
  {
    id: 'fakt-dane-prodej', title: 'Daně z prodeje investic (2026)',
    source: 'Nástroje → Daň z prodeje investic',
    text: 'Zisk z prodeje cenných papírů (akcie, ETF) je v ČR osvobozený od daně z příjmů, pokud splníš aspoň jeden test: ČASOVÝ TEST (držba déle než 3 roky) NEBO HODNOTOVÝ TEST (úhrn tvých ročních příjmů z prodeje cenných papírů nepřesáhne 100 000 Kč). Od roku 2026 byl u cenných papírů zrušen dřívější 40milionový strop osvobození. Pokud osvobozený nejsi, daníš ZISK (prodejní cena minus nákupní cena minus poplatky) sazbou 15 %, případně 23 % z části celkového ročního základu daně nad 1 762 812 Kč. Do tohoto základu se přitom sčítají i další zdanitelné příjmy (např. ze zaměstnání), nejen zisk z investic. Osvobozený příjem nad 5 000 000 Kč musíš oznámit finančnímu úřadu.',
  },
  {
    id: 'fakt-dip', title: 'DIP — dlouhodobý investiční produkt (2026)',
    source: 'Nástroje → DIP kalkulačka',
    text: 'DIP ti umožní odečíst od základu daně až 48 000 Kč ročně. Tento roční limit je SDÍLENÝ napříč produkty na stáří — DIP, doplňkové penzijní spoření i životní pojištění dohromady. Při sazbě 15 % to znamená úsporu na dani až 7 200 Kč ročně. Peníze v DIP jsou vázané: bez doplacení daně je vybereš nejdřív v 60 letech věku a zároveň po minimálně 10 letech trvání. Když je vybereš dřív, musíš dodanit uplatněné odpočty za posledních 10 let (zisky si necháš). Zaměstnavatel ti může přispět navíc až 50 000 Kč ročně osvobozeně (samostatný limit).',
  },
  {
    id: 'fakt-duchod', title: 'Státní starobní důchod (2026)',
    source: 'Nástroje → Důchodová kalkulačka',
    text: 'Český státní starobní důchod se skládá ze dvou částí, které se sčítají: základní výměry (v roce 2026 činí 4 900 Kč měsíčně, stejná pro všechny) a procentní výměry (1,495 % tzv. výpočtového základu za každý rok pojištění). U průměrné mzdy je náhradový poměr (důchod vůči mzdě) zhruba 45 %; u nižších příjmů víc, u vyšších míň. Důchodový věk se podle ročníku narození zvyšuje až na strop 67 let (ročník 1989 a mladší podle aktuálně platné reformy). Protože stát ti nahradí jen část příjmu, je rozumné si na penzi spořit i sám.',
  },
  {
    id: 'fakt-slozene-uroceni', title: 'Složené úročení, inflace a pravidlo 72',
    source: 'Nástroje → Simulátor složeného úročení',
    text: 'Složené úročení znamená, že reinvestované výnosy samy vydělávají další výnosy — hodnota proto v čase roste čím dál rychleji a vyplatí se začít co nejdřív. Inflace působí opačně: snižuje hodnotu peněz (dlouhodobý cíl ČNB je 2 % ročně), takže hotovost ležící „pod polštářem“ reálně chudne. Pravidlo 72: počet let do zdvojnásobení investice si přibližně odhadneš jako 72 dělené roční úrokovou sazbou v procentech.',
  },
];

// ══════════════════════════════════════════════════════════════════
// LEHKÝ LEXIKÁLNÍ RETRIEVER
// ══════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  'se', 'si', 'je', 'na', 'do', 'za', 'ze', 'ke', 've', 'co', 'jak', 'jako',
  'kdy', 'kde', 'proc', 'to', 'ten', 'ta', 'ty', 'mi', 'me', 'pro', 'od', 'po',
  'pri', 'nad', 'pod', 'ale', 'nebo', 'ani', 'by', 'bych', 'byste', 'jsem',
  'jste', 'jsou', 'byl', 'byla', 'byt', 'vam', 'vas', 'mam', 'mate', 'muze',
  'lze', 'tak', 'uz', 'vic', 'vice', 'mezi', 'tom', 'toho', 'ktery', 'ktera',
  'ktere', 'kteri', 'este', 'asi', 'moc', 'tady', 'tedy', 'prosim', 'dobry',
  'ahoj', 'chci', 'rad',
  'bude', 'budu', 'budes', 'budem', 'budeme', 'budete', 'budou', 'jaky',
  'jaka', 'jake', 'kolik', 'zitra', 'dnes', 'vcera', 'mit',
  'mel', 'mela', 'meli', 'chce', 'chceme', 'musim', 'muzu', 'rekni', 'vysvetli',
  'potrebuji', 'potreba', 'delat', 'udelat', 'vsechno', 'neco', 'nic',
]);

function norm(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function tokens(s: string): string[] {
  return norm(s).split(/[^0-9a-z]+/).filter(Boolean);
}

function contentTokens(s: string): string[] {
  return tokens(s).filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

function stem(t: string): string {
  return t.length >= 4 ? t.slice(0, 4) : t;
}

// Token-level index dokumentu: množina přesných tokenů (O(1) lookup) + jejich seznam pro
// volnější shodu. V retrieve porovnáváme dotaz vůči TOKENŮM dokumentu na hranici slova
// (prefix nebo 4-znakový stem), ne raw substring → odpadnou mid-word false-shody a přesná
// shoda rozliší blízké pojmy („Index“ vs „Indexový fond“). (M22)
interface TokenIndex {
  tokens: Set<string>;
  list: string[];
}
function tokenIndex(s: string): TokenIndex {
  const t = contentTokens(s);
  return { tokens: new Set(t), list: t };
}

// Volnější shoda dotazového tokenu s NĚJAKÝM tokenem dokumentu (na hranici slova, ne mid-
// word): kratší prefixem delšího (min. 3 znaky; daň→daně, etf→etfs) NEBO shodný 4-znakový
// stem (burza→burzovní, akcie→akcionář). „akci“ tak nematchne „transakce“.
function looseHit(qt: string, list: string[]): boolean {
  return list.some(dt => {
    const short = qt.length <= dt.length ? qt : dt;
    const long = qt.length <= dt.length ? dt : qt;
    if (short.length >= 3 && long.startsWith(short)) return true;
    return qt.length >= 4 && dt.length >= 4 && stem(qt) === stem(dt);
  });
}

interface KBDoc {
  id: string;
  title: string;
  source: string;
  text: string;
  _title: TokenIndex;
  _text: TokenIndex;
}

function buildDocs(): KBDoc[] {
  const docs: KBDoc[] = [];
  ACADEMY_LESSONS.forEach((l, i) => {
    const body = l.summary + ' ' + l.blocks.map(b => b.h + '. ' + b.p).join(' ');
    docs.push({
      id: 'lesson-' + l.id, title: l.title,
      source: `Akademie → lekce ${i + 1}: ${l.title}`, text: body,
      _title: tokenIndex(l.title), _text: tokenIndex(l.title + ' ' + body),
    });
  });
  GLOSSARY.forEach(g => {
    docs.push({
      id: 'term-' + g.term, title: g.term,
      source: `Slovníček → ${g.term}`, text: g.term + ': ' + g.def,
      _title: tokenIndex(g.term), _text: tokenIndex(g.term + ': ' + g.def),
    });
  });
  EXTRA_FACTS.forEach(f => {
    docs.push({
      id: f.id, title: f.title, source: f.source, text: f.text,
      _title: tokenIndex(f.title), _text: tokenIndex(f.title + ' ' + f.text),
    });
  });
  return docs;
}

const KB_DOCS = buildDocs();

export function retrieve(query: string, k = 4, minScore = 2): KBDoc[] {
  const qTokens = contentTokens(query);
  if (!qTokens.length) return [];
  // jednoslovný dotaz: stačí trefa do těla dokumentu (jinak by score 1 < 2 → prázdný kontext)
  const threshold = qTokens.length <= 1 ? 1 : minScore;
  const scored: [number, KBDoc][] = [];
  for (const d of KB_DOCS) {
    let score = 0;
    for (const t of qTokens) {
      if (d._title.tokens.has(t)) score += 3;            // přesná shoda tokenu v názvu
      else if (looseHit(t, d._title.list)) score += 2;   // slovní tvar (prefix/stem) v názvu
      else if (d._text.tokens.has(t)) score += 2;        // přesná shoda tokenu v těle
      else if (looseHit(t, d._text.list)) score += 1;    // slovní tvar (prefix/stem) v těle
    }
    if (score >= threshold) scored.push([score, d]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, k).map(([, d]) => d);
}

export function formatContext(docs: KBDoc[]): string {
  if (!docs.length) return '';
  const parts = ['=== OVĚŘENÝ KONTEXT (čerpej z něj fakta a uveď zdroje) ==='];
  for (const d of docs) {
    parts.push(`[Zdroj: ${d.source}]\n${d.text}`);
  }
  return parts.join('\n\n');
}
