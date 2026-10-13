import { useState, useMemo } from 'react';
import { NumberField } from '../NumberField';

// Formátování čísel — české locale s mezerami jako oddělovači tisíců
const czFmt = (n: number): string =>
  n.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const czFmt2 = (n: number): string =>
  n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const HallucinationDemo: React.FC = () => {
  const [initDeposit, setInitDeposit] = useState(50000);
  const [monthly, setMonthly] = useState(3155);
  const [rate, setRate] = useState(11.43);
  const [years, setYears] = useState(8);

  const { formattedExact, formattedHallucinated, formattedDiff } =
    useMemo(() => {
      const r = (rate / 100) / 12;
      const n = years * 12;
      // r === 0 → limita anuity je prostý součet vkladů (jinak dělení nulou → NaN) (L63)
      const annuity = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const exact = initDeposit * Math.pow(1 + r, n) + annuity;
      const hallucinated = exact * 0.9904;
      const hallucShown = Math.floor(hallucinated);  // přesně tak, jak odhad zobrazíme
      const diff = exact - hallucShown;              // rozdíl ze ZOBRAZENÉHO odhadu → tři čísla sedí
      return {
        formattedExact: czFmt2(exact),
        formattedHallucinated: czFmt(hallucShown),
        formattedDiff: czFmt2(diff),
      };
    }, [initDeposit, monthly, rate, years]);

  const rateText = String(rate).replace('.', ',');

  return (
    <section className="ui-sec">
      <h2 className="ui-sec__title">Zkus si to na vlastních číslech</h2>
      <p className="ui-sec__lead">
        Nastav si spoření. Uvidíš, kolik vychází přesně, a vedle toho odhad, jaký by na stejnou
        otázku mohl dát jazykový model, který si výsledek nenechal spočítat.
      </p>

      <div className="ui-panel">
        <div className="ui-split">
          <div className="ui-stack tr-demo__inputs">
            <NumberField label="Počáteční vklad" suffix="Kč" value={initDeposit} onChange={setInitDeposit}
              min={1000} sliderMin={1000} sliderMax={500000} step={5000} />
            <NumberField label="Měsíční vklad" suffix="Kč" value={monthly} onChange={setMonthly}
              min={100} sliderMin={100} sliderMax={20000} step={500} />
            <NumberField label="Roční úrok" suffix="%" value={rate} onChange={setRate}
              min={1} max={100} sliderMin={1} sliderMax={15} step={0.1} decimals={2} />
            <NumberField label="Počet let" value={years} onChange={setYears}
              min={3} max={20} sliderMin={3} sliderMax={20} step={1} />
          </div>

          <div className="tr-demo__result">
            <p
              className="ui-hero-num"
              aria-live="polite"
              aria-label={`Přesný výpočet: ${formattedExact} korun`}
            >
              <span className="ui-hero-num__label">Přesný výpočet</span>
              {formattedExact} Kč
            </p>
            <p className="ui-small tr-demo__method">
              Složené úročení po měsících, vklad vždy na začátku měsíce.
            </p>

            <hr className="ui-divide" />

            <p className="tr-demo__ask">
              „Kolik budu mít po {years} letech, když začnu s {czFmt(initDeposit)} Kč, každý měsíc
              přidám {czFmt(monthly)} Kč a úrok bude {rateText} % ročně?“
            </p>
            <dl className="ui-kpis">
              <div>
                <dt>Odhad jazykového modelu</dt>
                <dd
                  aria-live="polite"
                  aria-label={`Odhad jazykového modelu: přibližně ${formattedHallucinated} korun`}
                >
                  ≈ {formattedHallucinated} Kč
                </dd>
              </div>
              <div>
                <dt>Chybí</dt>
                <dd className="is-down">{formattedDiff} Kč</dd>
              </div>
            </dl>
            <p className="ui-note ui-note--danger tr-demo__verdict">
              Model by ti řekl o <strong>{formattedDiff} Kč</strong> méně, než kolik opravdu vychází.
              Postup přitom popíše správně a částka vypadá věrohodně — chyby si proto nevšimneš.
            </p>
          </div>
        </div>
      </div>

      <p className="ui-small tr-demo__foot">
        Odhad modelu je ilustrace: bereme přesný výsledek a snižujeme ho o necelé 1 %. Skutečný
        model se může splést víc, míň, nebo vůbec — předem to nepoznáš.
      </p>
    </section>
  );
};
