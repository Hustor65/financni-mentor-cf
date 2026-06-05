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
  { id: 'scamy', title: 'Podvody a scamy', icon: 'alert-triangle', summary: 'Jak poznat finanční podvod a nenaletět „zaručeným výnosům" ani phishingu.', status: 'live' },
  { id: 'dane-brigada', title: 'Daně z brigády', icon: 'file-text', summary: 'Hrubá vs. čistá mzda a jak si po brigádě říct o vrácení daně.', status: 'live' },
  { id: 'dluhy', title: 'Dluhy, kreditky a splátky', icon: 'dollar-sign', summary: 'Proč je drahý úvěr past — RPSN, kreditka vs. debetka a „kup teď, zaplať později".', status: 'live' },
  { id: 'jak-na-to', title: 'Jak na to v praxi', icon: 'check-circle', summary: 'Praktické návody: první účet, výplatní páska, předplatné a první bydlení.', status: 'live' },
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

// Téma „Podvody a scamy" — rozpoznání finančních podvodů (vlajkové téma „Nachytej AI").
export const SCAMY_QUIZ: QuizQuestion[] = [
  { q: 'Někdo ti slibuje „zaručený" výnos 30 % měsíčně bez rizika. Co to znamená?', options: ['Skvělou příležitost, hned do toho', 'Skoro jistě podvod — vysoký výnos bez rizika neexistuje', 'Úplně běžný výnos u akcií'], correct: 1, explain: 'Čím vyšší slíbený výnos, tím vyšší riziko. „Zaručený" vysoký výnos bez rizika je klasický znak podvodu.' },
  { q: 'Přijde ti SMS „od banky": „Podezřelá platba, potvrď identitu na tomto odkazu." Co uděláš?', options: ['Kliknu a vyplním údaje, ať mi účet nezablokují', 'Neklikám — ověřím to přímo v appce banky nebo na oficiálním webu', 'Přepošlu to kamarádům'], correct: 1, explain: 'To je phishing. Banka tě nikdy nežádá o hesla přes odkaz v SMS nebo e‑mailu. Nikdy neklikej — jdi rovnou do oficiální appky či na web banky.' },
  { q: 'Nabídka „brigády": necháš si posílat cizí peníze na svůj účet a pošleš je dál za 10 % odměny. Co to je?', options: ['Snadný přivýdělek', 'Money muling — praní špinavých peněz, je to trestné', 'Normální práce z domova'], correct: 1, explain: 'Tohle je money muling — pomáháš prát špinavé peníze a je to trestné, i když „jen přeposíláš". Svůj účet nikdy nepůjčuj cizím lidem.' },
];

// Téma „Daně z brigády" — první kontakt studenta s daněmi (hrubá/čistá, DPP/DPČ, vrácení daně).
export const BRIGADA_QUIZ: QuizQuestion[] = [
  { q: 'Jaký je rozdíl mezi hrubou a čistou mzdou?', options: ['Žádný, je to totéž', 'Hrubá je před odečtením daní a odvodů, čistá je to, co ti reálně přijde', 'Čistá je víc než hrubá'], correct: 1, explain: 'Hrubá mzda je částka před odečtením daně a odvodů. Čistá mzda je to, co ti po srážkách opravdu dorazí na účet.' },
  { q: 'Podepíšeš u zaměstnavatele „prohlášení poplatníka". K čemu to je?', options: ['Zvýší ti to daň', 'Umožní uplatnit slevu na poplatníka, takže platíš nižší (často nulovou) daň', 'Nic to nedělá'], correct: 1, explain: 'Díky prohlášení můžeš uplatnit slevu na poplatníka (2026 je 30 840 Kč ročně). U běžné studentské brigády ti tak daň často vyjde na nulu.' },
  { q: 'Z brigády ti strhli zálohovou/srážkovou daň. Můžeš ji dostat zpět?', options: ['Ne, daň je nenávratná', 'Často ano — když po roce podáš daňové přiznání a uplatníš slevu na poplatníka', 'Jen když si o to řekneš zaměstnavateli hned'], correct: 1, explain: 'Když máš nižší roční příjem, část nebo celá sražená daň se ti přes daňové přiznání vrátí. Spousta studentů o tyhle peníze zbytečně přijde.' },
];

// Téma „Dluhy, kreditky a splátky" — cost of credit (z deep-researche nejsilnější nález).
export const DLUHY_QUIZ: QuizQuestion[] = [
  { q: 'Co ti říká číslo RPSN u půjčky?', options: ['Jen roční úrok', 'Kolik tě půjčka reálně stojí za rok včetně VŠECH poplatků', 'Kolik si můžeš půjčit'], correct: 1, explain: 'RPSN (roční procentní sazba nákladů) zahrnuje úrok i všechny poplatky — je to nejpoctivější číslo pro porovnání půjček. Čím vyšší, tím dražší.' },
  { q: 'Telefon stojí 6 000 Kč hotově, nebo 24 splátek po 350 Kč. Co je dražší?', options: ['Hotově', 'Splátky — celkem 8 400 Kč, tedy o 2 400 Kč víc', 'Vyjde to nastejno'], correct: 1, explain: '24 × 350 = 8 400 Kč. Splátky tě stojí o 2 400 Kč navíc. Když máš na hotovost, skoro vždy se vyplatí zaplatit rovnou.' },
  { q: 'Jaký je rozdíl mezi kreditkou a debetkou?', options: ['Žádný', 'Debetka utrácí tvoje peníze, kreditka ti je půjčuje (a může se prodražit)', 'Kreditka je vždycky výhodnější'], correct: 1, explain: 'Debetkou platíš ze svého. Kreditkou si půjčuješ od banky — pokud nesplatíš celou částku v bezúročném období, naskakuje vysoký úrok.' },
];

// Téma „Jak na to v praxi" — praktické životní situace (první účet, výplatnice, předplatné, bydlení).
export const JAKNATO_QUIZ: QuizQuestion[] = [
  { q: 'Co je „čistá mzda" na výplatní pásce?', options: ['Hrubá mzda před srážkami', 'To, co ti reálně přijde na účet po odečtení daní a odvodů', 'Jen prémie navíc'], correct: 1, explain: 'Čistá mzda je částka, která ti po všech srážkách (daň, pojištění) opravdu dorazí na účet.' },
  { q: 'Jak nejspolehlivěji zrušíš nechtěné placené předplatné?', options: ['Smažu aplikaci z telefonu', 'Zruším ho v nastavení účtu / App Store / Google Play', 'Počkám, až přestane samo'], correct: 1, explain: 'Smazání appky platbu NEzruší — předplatné musíš zrušit přímo ve správě předplatných (App Store, Google Play nebo na webu služby).' },
  { q: 'Co je kauce u podnájmu?', options: ['Poplatek, který se nevrací', 'Vratná jistota (obvykle 1–3 nájmy) pro případ poškození bytu', 'Měsíční nájem navíc'], correct: 1, explain: 'Kauce je vratná jistota — dostaneš ji zpět, když byt při odchodu předáš nepoškozený a nemáš dluhy na nájmu.' },
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
