/**
 * Obsah jednotlivých témat (kitů) — 1:1 přepis z app.py funkcí
 * _topic_compound / _topic_stocks / _topic_inflation / _topic_pension /
 * _topic_taxes / _topic_risk.
 *
 * Každé téma má vlastní krátké teorie-karty (NE celé lekce z ACADEMY_LESSONS),
 * přesně jak je má originál.
 */

export interface TheoryCard {
  h: string;
  p: string;
}

export const TOPIC_THEORY: Record<string, TheoryCard[]> = {
  'slozene-uroceni': [
    {
      h: 'Co je složené úročení',
      p: 'Když výnosy z investice reinvestujete, začnou samy vydělávat další výnosy. Výsledek neroste lineárně, ale exponenciálně — čím déle investujete, tím dramatičtější je rozdíl.',
    },
    {
      h: 'Proč je čas důležitější než částka',
      p: 'Největší část práce odpracuje samotný začátek. Kdo začne ve 25 s malou částkou, často skončí výš než ten, kdo začne ve 40 s vyšší. Pracuje za vás čas, ne dokonalé načasování.',
    },
    {
      h: 'Pravidlo 72',
      p: 'Dobu zdvojnásobení investice odhadnete jako 72 dělené úrokem. Při 8 % ročně se peníze zdvojnásobí zhruba za 9 let.',
    },
  ],
  'akcie-etf': [
    {
      h: 'Akcie = podíl ve firmě',
      p: 'Koupí akcie se stáváte spolumajitelem firmy; vyděláváte na růstu hodnoty a z dividend. Vyšší dlouhodobý výnos, ale i vyšší kolísání.',
    },
    {
      h: 'Dluhopis = půjčka',
      p: 'Půjčujete státu nebo firmě a ony vám platí úrok. Stabilnější než akcie, nižší výnos.',
    },
    {
      h: 'ETF = koš mnoha aktiv',
      p: 'ETF drží v jednom nákupu stovky až tisíce cenných papírů a kopíruje index. Okamžitá diverzifikace a nízké poplatky — nejčastější stavební kámen pro začátečníky.',
    },
  ],
  'inflace': [
    {
      h: 'Co je inflace',
      p: 'Růst cen v čase, tedy pokles kupní síly peněz. Dlouhodobý cíl ČNB je 2 % ročně.',
    },
    {
      h: 'Hotovost „pod polštářem" ztrácí',
      p: 'Peníze ležící bez zhodnocení reálně chudnou. Při 3% inflaci si za stejnou částku za 20 let koupíte zhruba o 45 % méně.',
    },
    {
      h: 'Investice je hlavní obrana',
      p: 'Cílem investování je porazit inflaci — udržet a navýšit reálnou kupní sílu. V grafu porovnáte investici, hotovost a jejich reálnou hodnotu.',
    },
  ],
  'duchod': [
    {
      h: 'Z čeho se důchod skládá',
      p: 'Státní starobní důchod má dvě části: základní výměru (2026: 4 900 Kč, stejná pro všechny) a procentní výměru, která závisí na výdělcích a době pojištění (1,495 % za rok).',
    },
    {
      h: 'Důchodový věk roste',
      p: 'Podle ročníku narození se zvyšuje až na strop 67 let (ročník 1989 a mladší). Plánovaná novela má strop od 2028 vrátit na 65 let.',
    },
    {
      h: 'Stát nestačí',
      p: 'U průměrné mzdy nahradí stát zhruba jen 45 % příjmu. Zbytek je rozumné si zajistit sám — třeba přes DIP nebo dlouhodobé investice.',
    },
  ],
  'dane-dip': [
    {
      h: 'Kdy z prodeje neplatíte nic',
      p: 'Zisk z prodeje cenných papírů je osvobozen, pokud splníte alespoň jeden test: časový (držba > 3 roky) nebo hodnotový (úhrn ročních prodejů ≤ 100 000 Kč). Od 2026 navíc u cenných papírů neplatí žádný horní strop osvobození.',
    },
    {
      h: 'Když daníte',
      p: 'Zdaníte zisk (prodej − nákup − poplatky) sazbou 15 %, případně 23 % z části základu nad 1 762 812 Kč.',
    },
    {
      h: 'DIP — daňová úspora',
      p: 'Vklady do DIP si odečtete od základu daně až do 48 000 Kč ročně (limit sdílíte s penzijkem a životkem) → úspora až 7 200 Kč. Peníze jsou ale vázané do 60 let a 10 let.',
    },
  ],
  'riziko': [
    {
      h: 'Výnos a riziko jdou spolu',
      p: 'Neexistuje vysoký výnos bez rizika. Kdokoli slibuje „zaručené" vysoké zhodnocení, je to varovný signál — často podvod.',
    },
    {
      h: 'Diverzifikace',
      p: 'Rozložení peněz mezi více aktiv, regionů a sektorů snižuje dopad toho, když se jedné investici nedaří. Velkou část za vás udělají ETF.',
    },
    {
      h: 'Časový horizont',
      p: 'Na peníze potřebné brzy patří konzervativní nástroje; na 15+ let snesete víc akcií, protože máte čas přečkat propady.',
    },
  ],
};

// Sekční label (ikona + text) pro každé téma — 1:1 s originálem
export const TOPIC_TOOL_LABEL: Record<string, { icon: string; label: string }> = {
  'slozene-uroceni': { icon: 'bar-chart-3', label: 'Vyzkoušejte si to' },
  'akcie-etf': { icon: 'bar-chart-3', label: 'Porovnání nástrojů' },
  'inflace': { icon: 'bar-chart-3', label: 'Jak inflace ukrajuje' },
  'duchod': { icon: 'hourglass', label: 'Spočítejte si důchod' },
  'dane-dip': { icon: 'scale', label: 'Daň z prodeje investic' },
  'riziko': { icon: 'shield-check', label: 'Najděte svůj profil' },
};
