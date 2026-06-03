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
  /** Delší vysvětlení odhalené po kliknutí na „Číst více“; každý prvek = jeden odstavec. */
  more?: string[];
}

export const TOPIC_THEORY: Record<string, TheoryCard[]> = {
  'slozene-uroceni': [
    {
      h: 'Co je složené úročení',
      p: 'Když výnosy z investice reinvestujete, začnou samy vydělávat další výnosy. Výsledek neroste lineárně, ale exponenciálně — čím déle investujete, tím dramatičtější je rozdíl.',
      more: [
        'Rozdíl mezi jednoduchým a složeným úročením je v tom, na co se připisuje výnos. U jednoduchého úročení vyděláváte pořád jen z původního vkladu. U složeného úročení se výnos přičte k vkladu a v dalším roce vyděláváte už i z těchto připsaných peněz — úrok z úroku. Tím se základ, ze kterého rostete, každý rok zvětšuje.',
        'Představte si 10 000 Kč při 8 % ročně. První rok vydělají 800 Kč. Druhý rok už ale počítáte 8 % z 10 800 Kč, tedy 864 Kč. Třetí rok z 11 664 Kč, atd. Přírůstky se postupně zvětšují samy od sebe, aniž byste přidali jedinou korunu navíc. Na začátku je rozdíl proti jednoduchému úročení malý, po dvaceti či třiceti letech je obrovský.',
        'Klíčová podmínka je, že výnosy musíte nechat „uvnitř“ a reinvestovat je. Jakmile zisky průběžně vybíráte, efekt složeného úročení se vypne a vrátíte se k pomalejšímu lineárnímu růstu.',
        'Častý omyl je dívat se jen na roční procento a podceňovat čas. Osm procent ročně zní nenápadně, ale právě dlouhý horizont z něj dělá ten největší motor zhodnocení. Pozor, stejná matematika funguje i proti vám — třeba u dluhů na kreditní kartě, kde se složeně nabaluje dlužná částka.',
      ],
    },
    {
      h: 'Proč je čas důležitější než částka',
      p: 'Největší část práce odpracuje samotný začátek. Kdo začne ve 25 s malou částkou, často skončí výš než ten, kdo začne ve 40 s vyšší. Pracuje za vás čas, ne dokonalé načasování.',
      more: [
        'U složeného úročení rozhoduje, jak dlouho peníze pracují, často víc než to, kolik jich vložíte. Každý rok navíc na začátku má totiž čas se mnohokrát zdvojnásobit. Roky, které na konci scházejí, se nedají dohnat vyšším vkladem na poslední chvíli.',
        'Modelový příklad: kdo investuje 2 000 Kč měsíčně od 25 do 35 let a pak už nepřidá nic, může mít v 65 letech díky desetiletkám růstu více než ten, kdo začne ve 35 a poctivě posílá 2 000 Kč měsíčně až do 65. První vložil méně peněz, ale dal jim mnohem víc času.',
        'Proto je u dlouhodobého investování důležitější začít brzy a pravidelně než čekat na „ideální“ okamžik. Snaha vychytat dno trhu (časování) se většině lidí nevyplácí; pravidelné investování stejné částky naopak průměruje nákupní cenu.',
        'Nejčastější chyba začátečníků je odkládání s tím, že teď mají málo. Jenže odložené roky jsou přesně to, co nejde nahradit. I malá částka, která roste dlouho, překoná velkou částku, která roste krátce.',
      ],
    },
    {
      h: 'Pravidlo 72',
      p: 'Dobu zdvojnásobení investice odhadnete jako 72 dělené úrokem. Při 8 % ročně se peníze zdvojnásobí zhruba za 9 let.',
      more: [
        'Pravidlo 72 je rychlá pomůcka z hlavy: vydělíte číslo 72 ročním úrokem v procentech a vyjde přibližný počet let, za který se vklad zdvojnásobí. Při 8 % to je 72 ÷ 8 = 9 let, při 6 % je to 12 let a při 4 % 18 let. Vyšší výnos tedy dobu zdvojnásobení výrazně zkracuje.',
        'Pomůcka funguje díky tomu, že složené úročení roste geometricky, a 72 se dělí na celá čísla. Není to přesný vzorec, ale pro běžné úroky (zhruba 4–12 %) dává odhad blízko skutečnosti — pro hrubou představu úplně stačí.',
        'Stejné pravidlo umí ukázat i ničivou sílu inflace. Při 3% inflaci se „smáčkne“ kupní síla peněz na polovinu zhruba za 72 ÷ 3 = 24 let. Hotovost bez zhodnocení tak na poloviční hodnotu klesne během jedné generace.',
        'Pozor na meze pravidla: u velmi vysokých úroků (nad ~20 %) už začíná být nepřesné a předpokládá stabilní výnos. Reálné trhy kolísají, takže ho berte jako orientační odhad, ne jako záruku.',
      ],
    },
  ],
  'akcie-etf': [
    {
      h: 'Akcie = podíl ve firmě',
      p: 'Koupí akcie se stáváte spolumajitelem firmy; vyděláváte na růstu hodnoty a z dividend. Vyšší dlouhodobý výnos, ale i vyšší kolísání.',
      more: [
        'Akcie je podíl na vlastnictví konkrétní společnosti. Když ji koupíte, držíte malý kousek firmy a máte nárok na odpovídající díl jejího zisku. Vydělat můžete dvěma způsoby: růstem ceny akcie (koupíte levně, prodáte dráž) a výplatou dividendy, což je část zisku, kterou firma rozdělí akcionářům.',
        'Cena akcie se ale řídí očekáváním trhu a může výrazně kolísat nahoru i dolů — během krize klidně o desítky procent. To je důvod, proč akcie nesou historicky vyšší dlouhodobý výnos: investor je odměňován za to, že snáší tuto nejistotu. Akcie jsou tak nástroj „na dlouho“, ne na peníze, které budete brzy potřebovat.',
        'Příklad: koupíte akcii za 1 000 Kč, firmě se daří a po čase ji prodáte za 1 200 Kč — vyděláte 200 Kč na růstu ceny. Pokud mezitím vyplatila dividendu 30 Kč, máte ji navíc. Kdyby ale firma zklamala, mohla cena spadnout třeba na 700 Kč.',
        'Začátečníci často vsadí všechno na jednu „jistou“ firmu, kterou znají. To je velké riziko — i zavedená společnost může zkrachovat nebo dlouhodobě klesat. Proto se akcie obvykle drží rozložené přes mnoho firem, nejjednodušeji přes ETF.',
      ],
    },
    {
      h: 'Dluhopis = půjčka',
      p: 'Půjčujete státu nebo firmě a ony vám platí úrok. Stabilnější než akcie, nižší výnos.',
      more: [
        'Dluhopis je v podstatě potvrzení o půjčce. Když ho koupíte, půjčujete své peníze tomu, kdo dluhopis vydal — státu, městu nebo firmě. Ten se zavazuje platit vám předem dohodnutý úrok (kupón) a na konci splatnosti vrátit půjčenou částku (jmenovitou hodnotu).',
        'Na rozdíl od akcie nejste spolumajitel, ale věřitel. Proto je výnos zpravidla nižší a předem známější — víte, kolik vám má kdy přijít. Hlavní riziko je, že dlužník nezaplatí (úvěrové riziko). U státních dluhopisů vyspělé země je toto riziko nízké, u méně bonitních firem vyšší, a proto nabízejí vyšší úrok jako kompenzaci.',
        'Příklad: koupíte dluhopis za 10 000 Kč s 5% ročním kupónem na 3 roky. Každý rok vám přijde 500 Kč a po třech letech dostanete zpět i původních 10 000 Kč.',
        'Pozor na představu, že dluhopis je vždy bezpečný. Existují i rizikové firemní dluhopisy s lákavě vysokým úrokem, kde hrozí, že firma nesplatí nic. A pokud dluhopis prodáváte před splatností, jeho tržní cena kolísá — zejména když se mění úrokové sazby v ekonomice.',
      ],
    },
    {
      h: 'ETF = koš mnoha aktiv',
      p: 'ETF drží v jednom nákupu stovky až tisíce cenných papírů a kopíruje index. Okamžitá diverzifikace a nízké poplatky — nejčastější stavební kámen pro začátečníky.',
      more: [
        'ETF (burzovně obchodovaný fond) je jeden cenný papír, za kterým se skrývá celý koš aktiv. Místo abyste pracně kupovali stovky akcií jednotlivě, koupíte jeden podíl ETF a rázem vlastníte malý díl ode všech firem v koši. Většina ETF pasivně kopíruje nějaký index — třeba akcie největších firem světa.',
        'Hlavní výhody jsou tři. Za prvé okamžitá diverzifikace: riziko je rozprostřené přes mnoho firem, sektorů i zemí, takže krach jedné společnosti vás téměř nezasáhne. Za druhé nízké poplatky, protože fond jen kopíruje index a nemusí ho draze řídit. Za třetí jednoduchost a obchodovatelnost na burze jako běžná akcie.',
        'Příklad: jedním nákupem širokého světového akciového ETF získáte podíl v tisících firem napříč obory. Když se nedaří jedné, často to vyrovnají jiné — výsledkem je klidnější vývoj než u sázky na jednotlivou akcii.',
        'Časté nedorozumění je, že ETF je „bez rizika“. Diverzifikace tlumí riziko jednotlivé firmy, ale ne pokles celého trhu — i akciové ETF v krizi klesá. A pozor na poplatek fondu (ukazatel TER): u vhodných širokých ETF bývá velmi nízký, ale vyplatí se ho sledovat.',
      ],
    },
  ],
  'inflace': [
    {
      h: 'Co je inflace',
      p: 'Růst cen v čase, tedy pokles kupní síly peněz. Dlouhodobý cíl ČNB je 2 % ročně.',
      more: [
        'Inflace znamená, že ceny zboží a služeb v čase rostou, a tím za stejnou částku postupně pořídíte méně. Není to tak, že by věci „samy zdražovaly“ — jde o pokles hodnoty (kupní síly) peněz. Měří se přes spotřební koš: sleduje se, o kolik se průměrně zdraží typický nákup běžné domácnosti za rok.',
        'V Česku má cenovou stabilitu na starost Česká národní banka (ČNB). Její dlouhodobý inflační cíl je 2 % ročně. Mírná, předvídatelná inflace kolem tohoto cíle je pro ekonomiku zdravější než nula nebo naopak vysoké, kolísavé hodnoty, které lidem znesnadňují plánování.',
        'Příklad: když rohlík stojí 3 Kč a inflace je 2 %, příští rok stojí zhruba 3,06 Kč. Za jeden rok je to zanedbatelné, ale tyto malé přírůstky se rok co rok skládají na sebe a po desetiletích výrazně promění to, co si za stovku koupíte.',
        'Častý omyl je vnímat inflaci jen jako zdražování v obchodě. Stejně důležitá je druhá strana mince: peníze, které jen leží, každý rok tiše ztrácejí hodnotu, i když na účtu vidíte pořád stejné číslo.',
      ],
    },
    {
      h: 'Hotovost „pod polštářem“ ztrácí',
      p: 'Peníze ležící bez zhodnocení reálně chudnou. Při 3% inflaci si za stejnou částku za 20 let koupíte zhruba o 45 % méně.',
      more: [
        'Hotovost nebo peníze na běžném účtu mají tu vlastnost, že jejich nominální částka se nemění — 10 000 Kč zůstává 10 000 Kč. Jejich reálná hodnota, tedy co si za ně skutečně koupíte, ale s inflací klesá. Proto se říká, že „nečinné“ peníze pomalu chudnou, i když to na výpisu nevidíte.',
        'Síla tohoto efektu na dlouhém horizontu překvapí. Při trvalé inflaci kolem 3 % ročně klesne kupní síla peněz za 20 let zhruba o 45 % — z dnešních 10 000 Kč by reálně zbylo jen kolem 5 500 Kč v dnešních cenách. Polovinu hodnoty „sní“ inflace, aniž byste utratili korunu.',
        'Neznamená to, že hotovost je k ničemu. Naopak: rezervu na nečekané výdaje (ideálně několik měsíčních výdajů) je rozumné mít po ruce a v bezpečí, právě proto, že nekolísá. U těchto peněz je stabilita důležitější než výnos.',
        'Chyba je nechávat ladem i peníze, které dlouho nepotřebujete, „aby byly jisté“. U dlouhodobých úspor je největším tichým rizikem právě inflace — peníze nečinností reálně ztrácejí, i když se zdá, že se „nic neděje“.',
      ],
    },
    {
      h: 'Investice je hlavní obrana',
      p: 'Cílem investování je porazit inflaci — udržet a navýšit reálnou kupní sílu. V grafu porovnáte investici, hotovost a jejich reálnou hodnotu.',
      more: [
        'Smyslem investování není „zbohatnout přes noc“, ale udržet a navýšit reálnou kupní sílu peněz — tedy aby vaše úspory rostly aspoň stejně rychle jako ceny, nejlépe rychleji. Investice, jejíž výnos dlouhodobě překonává inflaci, vaše peníze chrání; ta, která za inflací zaostává, vás reálně stojí hodnotu.',
        'Rozlišujte nominální a reálný výnos. Když investice vynese 6 % a inflace je 2 %, váš reálný výnos je zhruba 4 % — o tolik reálně zbohatnete. Naopak spořicí účet s 1 % při 3% inflaci znamená reálnou ztrátu, i když číslo na účtu mírně roste.',
        'Historicky patří mezi nástroje, které dlouhodobě překonávají inflaci, hlavně akcie (například přes široká ETF), protože rostou společně s ekonomikou a zisky firem. Krátkodobě ale kolísají, takže fungují jako ochrana proti inflaci jen na delším horizontu.',
        'Pozor na dva extrémy. Nechat vše v hotovosti znamená jistou pomalou ztrátu kvůli inflaci. Honit „zaručené“ vysoké výnosy bez rizika zase obvykle končí podvodem. Rozumná obrana proti inflaci je dlouhodobé, rozložené investování — ne sázka na zázrak.',
      ],
    },
  ],
  'duchod': [
    {
      h: 'Z čeho se důchod skládá',
      p: 'Státní starobní důchod má dvě části: základní výměru (2026: 4 900 Kč, stejná pro všechny) a procentní výměru, která závisí na výdělcích a době pojištění (1,495 % za rok).',
      more: [
        'Státní starobní důchod se skládá ze dvou částí, které se sčítají. Základní výměra je pevná a stejná pro všechny bez ohledu na to, kolik kdo vydělával — v roce 2026 činí 4 900 Kč měsíčně. Tvoří jakýsi společný základ, na který má nárok každý důchodce.',
        'Druhá, obvykle větší část je procentní výměra. Ta už je „zásluhová“: odvíjí se od toho, kolik let jste platili sociální pojištění a jak vysoké jste měli výdělky. Za každý odpracovaný rok pojištění se připisuje 1,495 % z tzv. výpočtového základu (zjednodušeně z vašich průměrných, přepočtených výdělků).',
        'Z toho plyne jednoduchá logika: čím déle pracujete a čím vyšší máte (započitatelné) příjmy, tím vyšší procentní výměru získáte. Krátká doba pojištění nebo dlouhé výpadky bez placení pojistného důchod naopak snižují.',
        'Důležité je nepřeceňovat zásluhovou složku. Systém je solidární a výdělky se pro výpočet „zastropují“ a redukují, takže lidé s vysokým platem nedostávají úměrně tak vysoký důchod — náhrada jejich příjmu je v procentech nižší než u průměrně vydělávajících.',
      ],
    },
    {
      h: 'Důchodový věk roste',
      p: 'Podle ročníku narození se zvyšuje až na strop 67 let (ročník 1989 a mladší). Plánovaná novela má strop od 2028 vrátit na 65 let.',
      more: [
        'Důchodový věk, tedy kdy můžete odejít do řádného starobního důchodu, není pro všechny stejný — postupně se zvyšuje podle ročníku narození. Důvodem je hlavně to, že lidé se dožívají vyššího věku, a kdyby věk odchodu zůstal stejný, vyplácel by se důchod stále delší dobu a systém by to dlouhodobě neunesl.',
        'Podle aktuálně platných pravidel hranice roste až na strop 67 let, který dopadá na ročník 1989 a mladší. Mladší generace tak dnes počítají s odchodem později než jejich rodiče. Existuje ovšem plánovaná novela, podle níž by se strop měl od roku 2028 vrátit na 65 let — finální podobu ale určí teprve schválená legislativa.',
        'Příklad logiky systému: čím později jste se narodili, tím vyšší (do daného stropu) máte zákonný důchodový věk. Přesné datum si každý může ověřit v důchodové kalkulačce ČSSZ podle svého data narození.',
        'Časté nedorozumění je plánovat odchod „v 65“ jako jistotu. Pro mladší ročníky to dnes neplatí a konkrétní hranice se navíc může legislativně měnit. Při plánování proto raději počítejte s vyšším věkem a berte případné snížení jako příjemné překvapení.',
      ],
    },
    {
      h: 'Stát nestačí',
      p: 'U průměrné mzdy nahradí stát zhruba jen 45 % příjmu. Zbytek je rozumné si zajistit sám — třeba přes DIP nebo dlouhodobé investice.',
      more: [
        'Náhradový poměr říká, jakou část vaší předchozí mzdy nahradí státní důchod. U člověka s průměrnou mzdou je to zhruba 45 %. Jinými slovy: po odchodu do důchodu může příjem klesnout přibližně na necelou polovinu toho, co jste byli zvyklí vydělávat.',
        'U nadprůměrných výdělků je propad ještě citelnější. Kvůli redukci výdělků ve výpočtu nahradí důchod vyšším příjmům procentuálně méně — kdo bral hodně, dostane v poměru ke své mzdě menší díl než průměrně vydělávající. Spoléhat jen na stát proto u mnoha lidí znamená výrazný pokles životní úrovně.',
        'Řešením je vytvořit si vlastní „třetí pilíř“ navíc ke státnímu důchodu. Pomáhá k tomu čas a složené úročení: pravidelné dlouhodobé investování (například do širokých ETF) nebo daňově podporované produkty na stáří jako DIP či doplňkové penzijní spoření.',
        'Nejčastější chyba je odkládat řešení „na později“. Čím dříve začnete, tím méně musíte měsíčně odkládat, protože za vás víc odpracuje čas. Kdo začne řešit důchod až v padesáti, musí dohánět mnohem vyššími částkami — a stejně mu schází roky růstu.',
      ],
    },
  ],
  'dane-dip': [
    {
      h: 'Kdy z prodeje neplatíte nic',
      p: 'Zisk z prodeje cenných papírů je osvobozen, pokud splníte alespoň jeden test: časový (držba > 3 roky) nebo hodnotový (úhrn ročních prodejů ≤ 100 000 Kč). Od 2026 navíc u cenných papírů neplatí žádný horní strop osvobození.',
      more: [
        'Když prodáte akcie nebo podíl v ETF se ziskem, je tento zisk v principu příjmem, který se daní. Zákon ale nabízí dvě cesty, jak může být od daně osvobozen — stačí splnit jednu z nich, ne obě.',
        'První je časový test: pokud jste cenný papír drželi déle než 3 roky, je zisk z jeho prodeje osvobozen, ať je jakkoli velký. Druhá je hodnotový test: pokud úhrn vašich prodejů cenných papírů za celý rok nepřesáhne 100 000 Kč, jste rovněž osvobozeni, i kdybyste papíry drželi jen krátce. Pozor, u hodnotového testu se sčítá objem prodejů, ne zisk.',
        'Od roku 2026 platí u cenných papírů důležité zjednodušení: po splnění časového testu už neexistuje žádný horní strop osvobození. I velmi vysoký zisk z dlouhodobě držených akcií tak může být od daně osvobozen celý.',
        'Příklad: koupíte ETF, držíte ho 5 let a pak prodáte se ziskem 300 000 Kč. Splňujete časový test (déle než 3 roky), takže neplatíte nic. Kdybyste ale stejné papíry prodali už po roce a objem prodejů přesáhl 100 000 Kč, museli byste zisk zdanit. Časté nedorozumění je plést si „3 roky držby“ s „3 roky od prvního nákupu“ u postupně dokupovaných pozic — testuje se každý prodaný kus.',
      ],
    },
    {
      h: 'Když daníte',
      p: 'Zdaníte zisk (prodej − nákup − poplatky) sazbou 15 %, případně 23 % z části základu nad 1 762 812 Kč.',
      more: [
        'Pokud nesplníte ani časový, ani hodnotový test, zdaňuje se zisk, ne celá utržená částka. Zisk spočítáte jako prodejní cenu mínus nákupní cenu mínus související poplatky (například poplatky brokerovi). Daní se tedy jen to, co jste skutečně vydělali.',
        'Základní sazba daně z příjmů fyzických osob je 15 %. U vysokých příjmů se uplatní progrese: z části ročního základu daně nad 1 762 812 Kč se daní vyšší sazbou 23 %. Do tohoto základu se přitom sčítají i další zdanitelné příjmy, nejen zisky z investic.',
        'Příklad: koupíte akcie za 50 000 Kč, po roce je prodáte za 80 000 Kč a na poplatcích zaplatíte 200 Kč. Zdanitelný zisk je 80 000 − 50 000 − 200 = 29 800 Kč; daň 15 % z této částky je 4 470 Kč.',
        'Dvě věci se snadno přehlédnou. Zdanitelný zisk si můžete snížit i o prokazatelné ztráty z jiných prodejů cenných papírů ve stejném roce. A pokud daníte, je obvykle potřeba příjem uvést v daňovém přiznání — broker za vás daň automaticky neodvede. Při nejistotě se vyplatí ověřit pravidla u Finanční správy nebo s daňovým poradcem.',
      ],
    },
    {
      h: 'DIP — daňová úspora',
      p: 'Vklady do DIP si odečtete od základu daně až do 48 000 Kč ročně (limit sdílíte s penzijním spořením a životním pojištěním) → úspora až 7 200 Kč. Peníze jsou ale vázané — vybrat je můžete nejdříve v 60 letech a zároveň po min. 10 letech spoření.',
      more: [
        'DIP (dlouhodobý investiční produkt) je od roku 2024 státem daňově podporovaný způsob, jak si spořit a investovat na stáří. Není to konkrétní fond, ale „obal“, uvnitř kterého můžete držet například akcie, ETF nebo dluhopisy u banky či brokera, který DIP nabízí.',
        'Hlavní výhoda je daňová: vklady, které do DIP za rok pošlete, si můžete odečíst od základu daně, a to až do 48 000 Kč ročně. Při sazbě 15 % to znamená úsporu na dani až 7 200 Kč za rok. Tento limit je ale společný (sdílený) s doplňkovým penzijním spořením a životním pojištěním — 48 000 Kč platí na všechny tyto produkty dohromady, ne na každý zvlášť.',
        'Výhoda něco stojí: prostředky jsou vázané. Aby vám daňová úleva zůstala, musíte splnit dvě podmínky zároveň — vydržet alespoň 10 let a peníze vybrat nejdříve v roce, kdy vám bude 60 let. Při předčasném výběru se uplatněné odpočty obvykle zpětně dodaňují (až 10 let zpět).',
        'Příklad: pošlete do DIP za rok 48 000 Kč, o tuto částku si snížíte základ daně a ušetříte 7 200 Kč. Počítejte ale s tím, že k penězům se „bez postihu“ dostanete až po splnění obou podmínek. Časté nedorozumění je brát DIP jako běžný spořicí účet — jde o dlouhodobý nástroj na důchod, ne na peníze, které můžete kdykoli potřebovat.',
      ],
    },
  ],
  'riziko': [
    {
      h: 'Výnos a riziko jdou spolu',
      p: 'Neexistuje vysoký výnos bez rizika. Kdokoli slibuje „zaručené“ vysoké zhodnocení, je to varovný signál — často podvod.',
      more: [
        'Výnos a riziko jsou dvě strany téže mince. Vyšší možný výnos si trh vždy „vykupuje“ vyšším rizikem, tedy větší nejistotou a kolísáním hodnoty. Je to logické: kdyby někde existoval vysoký výnos zcela bez rizika, nahrnuli by se tam všichni a tato výhoda by okamžitě zmizela.',
        'Proto platí přibližná stupnice. Nejnižší riziko i výnos mají hotovost a spořicí účty. Uprostřed bývají kvalitní dluhopisy. Nejvyšší dlouhodobý výnos, ale i největší kolísání, nesou akcie. Žádný nástroj nenabízí „to nejlepší z obojího“ zároveň — vždy něco za něco.',
        'Z toho plyne jasné varování: kdokoli slibuje „zaručený“ vysoký výnos bez rizika, buď neříká pravdu, nebo jde rovnou o podvod. Typické znaky podvodu jsou tlak na rychlé rozhodnutí, výnosy znějící příliš dobře, než aby byly pravdivé, a mlžení o tom, kam přesně peníze jdou.',
        'Příklad zdravého uvažování: nabídka „20 % ročně garantovaně“ je v dnešním světě nereálná a má rozsvítit červenou kontrolku. Naopak realistické očekávání u dlouhodobých akciových investic se pohybuje řádově v jednotkách až nižších desítkách procent ročně — s tím, že některé roky budou i ztrátové.',
      ],
    },
    {
      h: 'Diverzifikace',
      p: 'Rozložení peněz mezi více aktiv, regionů a sektorů snižuje dopad toho, když se jedné investici nedaří. Velkou část za vás udělají ETF.',
      more: [
        'Diverzifikace znamená nesázet všechno na jednu kartu. Když peníze rozložíte mezi mnoho různých investic — více firem, oborů, regionů i typů aktiv — neúspěch jedné z nich vás zasáhne jen okrajově, protože ji mohou vyvážit ostatní. Lidově: nedávejte všechna vejce do jednoho košíku.',
        'Smysl je v tom, že různá aktiva nereagují na události stejně. Když klesá jeden sektor, jiný může zrovna růst. Tím se celkové kolísání portfolia zmírní, aniž byste se museli vzdát rozumného dlouhodobého výnosu. Diverzifikace tak snižuje riziko jednotlivých investic, nikoli riziko poklesu celého trhu.',
        'Velkou část práce za běžného investora zařídí široká ETF. Jediným nákupem získáte podíl ve stovkách až tisících firem napříč zeměmi a obory — tedy okamžitou diverzifikaci bez nutnosti ručně skládat desítky akcií.',
        'Pozor na zdánlivou diverzifikaci. Koupit pět akcií z jednoho oboru nebo jedné země není skutečné rozložení — když dolehne problém na celé odvětví, padají společně. Opačný extrém je „překvalitnit“: příliš mnoho překrývajících se fondů přidá poplatky a zmatek, ale riziko už dál nesnižuje.',
      ],
    },
    {
      h: 'Časový horizont',
      p: 'Na peníze potřebné brzy patří konzervativní nástroje; na 15+ let snesete víc akcií, protože máte čas přečkat propady.',
      more: [
        'Časový horizont je doba, po kterou peníze nebudete potřebovat. Je to jedno z nejdůležitějších kritérií pro volbu nástroje — víc než aktuální nálada na trhu. Obecně platí: čím delší horizont, tím větší kolísání (a tím i potenciální výnos) si můžete dovolit.',
        'Peníze, které budete potřebovat brzy (řádově do několika let) — třeba rezervu nebo úspory na konkrétní cíl — patří do konzervativních, stabilních nástrojů jako spořicí účet. U nich vás nepřekvapí propad ve špatnou chvíli. Naopak na dlouhý horizont 15 let a více unesete vyšší podíl akcií, protože máte dost času přečkat i hluboké propady a počkat na zotavení.',
        'Důvod je v chování trhů. Akcie krátkodobě kolísají a klidně spadnou o desítky procent, ale na dlouhém horizontu měly historicky tendenci se zotavit a růst spolu s ekonomikou. Dlouhý čas tak riziko propadu „rozmělní“ — krátkodobá ztráta se na cestě k cíli stihne vyrovnat.',
        'Klasická chyba je nesoulad mezi horizontem a nástrojem. Dát peníze potřebné za rok do akcií je hazard — můžete být nuceni prodat zrovna v propadu. A naopak nechat úspory na 30 let ležet jen v hotovosti znamená nechat je užírat inflací. Nejhorší je panicky prodat akcie během poklesu, a tím přeměnit dočasný pokles na trvalou ztrátu.',
      ],
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
