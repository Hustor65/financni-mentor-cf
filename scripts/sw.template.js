/* Service worker — web se načte i bez připojení (stánek s přetíženou Wi‑Fi).
   Šablona: seznamy souborů a verzi doplní při buildu vite.config.ts.
   Bez sítě nefunguje jen AI mentor a ukládání do účtu; tržní data se berou
   z uloženého snímku (/snapshot). */
const VERSION = '__VERSION__';
const CACHE = `fm-${VERSION}`;
/** kostra webu — stáhne se hned při instalaci */
const CORE = __CORE__;
/** těžké kusy (3D glóbus, všechny snímky trhů) — stáhnou se až na požádání (režim stánku) nebo při prvním použití */
const EXTRA = __EXTRA__;

// Pages vrací na neexistující soubor úvodní stránku se stavem 200. HTML pod adresou
// skriptu nebo dat by se uložilo „napořád“ a rozbilo by web → ukládáme jen to, co sedí.
const isHtml = response => (response.headers.get('content-type') ?? '').includes('text/html');
const storable = (response, html) => response.ok && response.type === 'basic' && isHtml(response) === html;

const fetchInto = async (cache, url) => {
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!storable(response, url === '/')) throw new Error(`precache ${url}`);
  await cache.put(url, response);
};

self.addEventListener('install', event => {
  // kostra musí být celá: když se něco nestáhne (slabá Wi‑Fi), instalace selže
  // a dál slouží předchozí verze s úplnou cache
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(CORE.map(url => fetchInto(cache, url))))
      .then(() => self.skipWaiting()),
  );
});

// těžké kusy navíc: tady jeden nepovedený soubor nevadí
const warm = async () => {
  const cache = await caches.open(CACHE);
  await Promise.all(EXTRA.map(url => fetchInto(cache, url).catch(() => {})));
};

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fm-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'warm') event.waitUntil(warm());
});

const put = async (request, response, html = false) => {
  if (storable(response, html)) {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
  }
  return response;
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // API (mentor, živá data, účty) jde vždy na síť; klient si s výpadkem poradí sám
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // stránka: nejdřív síť (ať se nová verze projeví hned), při výpadku uložená kostra
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { signal: AbortSignal.timeout(4000) })
        .then(r => (url.pathname === '/' ? put('/', r, true) : r))
        .catch(() => caches.match('/', { cacheName: CACHE }).then(r => r ?? Response.error())),
    );
    return;
  }

  // soubory s otiskem v názvu se nikdy nemění → cache napořád
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request, { cacheName: CACHE }).then(hit => hit ?? fetch(request).then(r => put(request, r))));
    return;
  }

  // ostatní (snímky trhů, mapa pro glóbus): hned z cache, na pozadí obnovit
  event.respondWith(
    caches.match(request, { cacheName: CACHE }).then(hit => {
      const fresh = fetch(request).then(r => put(request, r));
      if (!hit) return fresh;
      event.waitUntil(fresh.catch(() => {}));
      return hit;
    }),
  );
});
