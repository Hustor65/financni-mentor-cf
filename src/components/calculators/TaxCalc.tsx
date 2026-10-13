import { useState, useMemo } from 'react';
import { czInvestmentTax, czDipDeduction } from '../../utils/calculators';
import { DIP_DEDUCT_LIMIT_2026 } from '../../data/constants';
import { NumberField } from '../NumberField';
import { kc } from './shared';

export const TaxCalc: React.FC = () => {
  // ── Prodej cenných papírů ──
  const [buy, setBuy] = useState(20000);
  const [sell, setSell] = useState(26000);
  const [proceeds, setProceeds] = useState(26000);
  const [heldOver3y, setHeld] = useState(false);

  // ── DIP ──
  const [dipContrib, setDipContrib] = useState(24000);
  const [otherContrib, setOtherContrib] = useState(0);

  const taxResult = useMemo(
    () => czInvestmentTax(buy, sell, proceeds, heldOver3y),
    [buy, sell, proceeds, heldOver3y],
  );
  const dipResult = useMemo(
    () => czDipDeduction(dipContrib, otherContrib),
    [dipContrib, otherContrib],
  );

  // ukazatel stropu — sdílený strop se plní penzijkem jako první, pak DIP
  const CAP = DIP_DEDUCT_LIMIT_2026;
  const otherCapped = Math.min(otherContrib, CAP);
  const otherPct = Math.min(100, (otherCapped / CAP) * 100);
  const dipPct = Math.max(0, Math.min(100 - otherPct, (dipResult.deductible / CAP) * 100));
  const dipOverCap = Math.max(0, dipContrib - dipResult.deductible);

  return (
    <div className="tl-calc">
      {/* ════ Část 1: daň z prodeje ════ */}
      <section aria-labelledby="tax-sale-title">
        <h3 className="ui-h3 tl-part__title" id="tax-sale-title">Daň z prodeje investic</h3>
        <p className="tl-part__lead">Zisk z prodeje akcií a fondů se daní 15 %. Dvě výjimky tě od daně osvobodí úplně.</p>
        <div className="tl-calc__grid">
          <div className="tl-inputs">
            <NumberField label="Nákupní cena" suffix="Kč" value={buy} onChange={setBuy}
              min={0} max={100000000} sliderMin={0} sliderMax={500000} step={1000} />
            <NumberField label="Prodejní cena" suffix="Kč" value={sell} onChange={setSell}
              min={0} max={100000000} sliderMin={0} sliderMax={500000} step={1000} />
            <NumberField label="Všechny prodeje za rok" suffix="Kč" value={proceeds} onChange={setProceeds}
              min={0} max={100000000} sliderMin={0} sliderMax={500000} step={1000} />
            <label className="ui-check">
              <input type="checkbox" checked={heldOver3y} onChange={e => setHeld(e.target.checked)} />
              <span>Držím je déle než 3 roky</span>
            </label>
          </div>

          <div className="tl-out" aria-live="polite">
            <p className="ui-hero-num tl-hero">
              <span className="ui-hero-num__label">Daň k zaplacení</span>
              {kc(taxResult.tax)}
            </p>
            <dl className="ui-kpis">
              <div>
                <dt>Zisk před zdaněním</dt>
                <dd>{kc(taxResult.gain)}</dd>
              </div>
              <div>
                <dt>Zisk po zdanění</dt>
                <dd className="is-up">{kc(taxResult.netGain)}</dd>
              </div>
            </dl>
            {taxResult.exempt ? (
              <p className="ui-note ui-note--ok">
                <strong>Osvobozeno od daně.</strong>{' '}
                {taxResult.passedTimeTest
                  ? 'Cenné papíry držíš déle než 3 roky, takže zisk nedaníš (časový test).'
                  : 'Tvoje prodeje za rok nepřesáhly 100 000 Kč, takže zisk nedaníš.'}
              </p>
            ) : (
              <p className="ui-note ui-note--warn">
                <strong>Zisk daníš 15 %.</strong>{' '}
                Prodeje za rok přesáhly 100 000 Kč a cenné papíry držíš kratší dobu než 3 roky. Po třech letech
                držení by byl zisk od daně osvobozený.
              </p>
            )}
            <p className="ui-small">
              Do limitu 100 000 Kč se počítají příjmy ze všech prodejů cenných papírů za kalendářní rok, ne jen zisk.
              Bez poplatků; orientační výpočet podle pravidel roku 2026.
            </p>
          </div>
        </div>
      </section>

      <hr className="ui-divide" />

      {/* ════ Část 2: DIP ════ */}
      <section aria-labelledby="tax-dip-title">
        <h3 className="ui-h3 tl-part__title" id="tax-dip-title">Kolik ušetříš přes DIP</h3>
        <p className="tl-part__lead">
          Vklady do dlouhodobého investičního produktu si odečteš od základu daně, nejvýš {kc(CAP)} ročně
          dohromady s penzijním a životním pojištěním.
        </p>
        <div className="tl-calc__grid">
          <div className="tl-inputs">
            <NumberField label="Roční vklad do DIP" suffix="Kč" value={dipContrib} onChange={setDipContrib}
              min={0} max={1000000} sliderMin={0} sliderMax={120000} step={1000} />
            <NumberField label="Penzijní a životní pojištění za rok" suffix="Kč" value={otherContrib} onChange={setOtherContrib}
              min={0} max={1000000} sliderMin={0} sliderMax={120000} step={1000} />
          </div>

          <div className="tl-out" aria-live="polite">
            <p className="ui-hero-num tl-hero">
              <span className="ui-hero-num__label">Na dani ušetříš za rok</span>
              {kc(dipResult.taxSaving)}
            </p>
            <dl className="ui-kpis">
              <div>
                <dt>Odečteš od základu daně</dt>
                <dd>{kc(dipResult.deductible)}</dd>
              </div>
              <div>
                <dt>Vklad tě po úspoře vyjde na</dt>
                <dd>{kc(dipResult.netCost)}</dd>
              </div>
            </dl>

            <div className="tl-cap">
              <div className="tl-cap__head">
                <span>Roční strop odpočtu</span>
                <span>{kc(CAP)}</span>
              </div>
              <div className="tl-cap__bar" aria-hidden="true">
                <span className="tl-cap__seg tl-cap__seg--other" style={{ width: `${otherPct}%` }} />
                <span className="tl-cap__seg tl-cap__seg--dip" style={{ width: `${dipPct}%` }} />
              </div>
              <ul className="tl-cap__legend">
                {otherCapped > 0 && (
                  <li><span className="tl-cap__sw tl-cap__sw--other" aria-hidden="true" />Penzijní a životní pojištění {kc(otherCapped)}</li>
                )}
                <li><span className="tl-cap__sw tl-cap__sw--dip" aria-hidden="true" />DIP s odpočtem {kc(dipResult.deductible)}</li>
                {dipResult.unused > 0 && <li>Volné místo {kc(dipResult.unused)}</li>}
              </ul>
            </div>

            {dipOverCap > 0 && (
              <p className="ui-note ui-note--warn">
                <strong>{kc(dipOverCap)} je nad stropem.</strong> Tahle část vkladu už daň nesníží.
              </p>
            )}
            <p className="ui-small">
              Úspora je 15 % z odečtené částky a projeví se v ročním zúčtování nebo v daňovém přiznání.
              Strop plní nejdřív penzijní a životní pojištění, na DIP zbývá zbytek.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
