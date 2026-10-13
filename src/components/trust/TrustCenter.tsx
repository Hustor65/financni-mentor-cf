import React from 'react';
import { DATA_SOURCES, CONTENT_LAST_UPDATED } from '../../data/constants';
import { HallucinationDemo } from './HallucinationDemo';

export const TrustCenter: React.FC = () => (
  <div className="tr">
    <header className="page-head">
      <h1 className="page-title">Přesnost</h1>
      <p className="page-lead">Jazykové modely čísla odhadují. Tenhle web je počítá.</p>
    </header>

    <section className="ui-sec">
      <div className="ui-prose">
        <p>
          Jazykový model skládá odpověď slovo za slovem podle toho, co nejpravděpodobněji následuje.
          U textu to funguje dobře. U čísel to znamená, že výsledek nevypočítá, ale odhadne —
          a napíše ho stejně sebejistě, ať je správně, nebo ne.
        </p>
        <p>
          U peněz je to potíž. Částka, která vypadá věrohodně a je o pár tisíc vedle, projde bez
          povšimnutí.
        </p>
      </div>
    </section>

    <HallucinationDemo />

    <section className="ui-sec">
      <h2 className="ui-sec__title">Jak to děláme my</h2>
      <div className="ui-prose">
        <p>
          <strong>Čísla počítá kód webu.</strong> Kalkulačky počítají podle vzorců přímo ve tvém
          prohlížeči, ne přes umělou inteligenci.
        </p>
        <p>
          <strong>Mentor nepočítá zpaměti.</strong> Aktuální ceny akcií, fondů a kryptoměn si načítá
          z tržních dat. Když chceš propočet vlastních čísel, má tě poslat do kalkulačky.
        </p>
        <p>
          <strong>Výklad se opírá o Akademii.</strong> K otázce dostane mentor související texty
          z Akademie a slovníčku. Když z nich čerpá, vypíše je pod odpovědí jako zdroje.
        </p>
        <p>
          <strong>I tak se může splést.</strong> Mentor je jazykový model. Důležité věci si ověř
          ve zdrojích níže.
        </p>
        <p>
          <strong>Nic neprodáváme.</strong> Web není napojený na žádného brokera ani fond a nebere
          provize. Když zmíní konkrétní produkt, je to příklad, ne doporučení.
        </p>
      </div>
    </section>

    <section className="ui-sec">
      <h2 className="ui-sec__title">Zdroje a metodika</h2>
      <p className="ui-sec__lead">
        Parametry daní a důchodů platí pro rok 2026. Obsah jsme naposledy aktualizovali{' '}
        {CONTENT_LAST_UPDATED}.
      </p>
      <ul className="ui-rows tr-sources">
        {DATA_SOURCES.map(ds => (
          <li key={ds.name}>
            <a className="text-link" href={ds.url} target="_blank" rel="noopener noreferrer">
              {ds.name}
            </a>
            <span>{ds.use}</span>
          </li>
        ))}
        <li>
          <a className="text-link" href="https://finance.yahoo.com/" target="_blank" rel="noopener noreferrer">
            Yahoo Finance
          </a>
          <span>Ceny akcií, fondů, indexů a kryptoměn; mohou být o několik minut zpožděné</span>
        </li>
      </ul>
      <p className="tr-contact">
        Našel jsi chybu? Napiš na{' '}
        <a className="text-link" href="mailto:jakub.simon65@gmail.com">jakub.simon65@gmail.com</a>{' '}
        a opravíme ji.
      </p>
    </section>
  </div>
);
