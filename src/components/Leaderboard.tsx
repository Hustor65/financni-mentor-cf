import { useEffect, useState } from 'react';
import { Segmented } from './Segmented';
import { useAccount } from '../utils/account';
import { fmtPct } from '../utils/market';
import { body } from '../data/play';

/**
 * Žebříček na stánku — deset nejlepších podle bodů za hry a podle výkonu portfolia na
 * zkoušku. Ukazuje jen přezdívku a číslo. Kdo nechce, vypne si to v účtu.
 */

interface Board {
  points: { name: string; points: number }[];
  portfolio: { name: string; pct: number }[];
}

type Tab = 'points' | 'portfolio';

const REFRESH_MS = 30_000;

export const Leaderboard: React.FC<{ initial?: Tab }> = ({ initial = 'points' }) => {
  const { user } = useAccount();
  const [tab, setTab] = useState<Tab>(initial);
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/leaderboard')
        .then(r => ((r.headers.get('content-type') ?? '').includes('json') ? r.json() : Promise.reject(new Error('not json'))))
        .then((b: Board) => { if (alive) { setBoard(b); setFailed(false); } })
        .catch(() => { if (alive) setFailed(true); });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const rows = tab === 'points'
    ? (board?.points ?? []).map(r => ({ name: r.name, value: `${r.points} ${body(r.points)}` }))
    : (board?.portfolio ?? []).map(r => ({ name: r.name, value: fmtPct(r.pct), up: r.pct >= 0 }));

  return (
    <section className="lb" aria-label="Žebříček">
      <div className="lb__head">
        <h2 className="ui-sec__title">Žebříček</h2>
        <Segmented
          label="Podle čeho řadit" value={tab} onChange={v => setTab(v as Tab)}
          options={[{ value: 'points', label: 'Body' }, { value: 'portfolio', label: 'Portfolio' }]}
        />
      </div>
      {failed && !board ? (
        <p className="ui-small">Žebříček se teď nepodařilo načíst.</p>
      ) : rows.length === 0 ? (
        <p className="lb__empty">
          {board ? 'Zatím tu nikdo není. Vytvoř si účet (ikona vpravo nahoře) a buď první.' : 'Načítám žebříček…'}
        </p>
      ) : (
        <ol className="lb__list">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className={user && user.name === r.name ? 'is-me' : undefined}>
              <span className="lb__rank num">{i + 1}</span>
              <span className="lb__name">{r.name}</span>
              <span className={`lb__value num${'up' in r ? (r.up ? ' is-up' : ' is-down') : ''}`}>{r.value}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="ui-small lb__note">
        Ukazuje se jen přezdívka. Do žebříčku se dostaneš s účtem; vypnout si to můžeš v nastavení účtu. Výkon portfolia hlásí tvůj prohlížeč a server ho nepřepočítává, takže je to hra, ne oficiální soutěž.
      </p>
    </section>
  );
};
