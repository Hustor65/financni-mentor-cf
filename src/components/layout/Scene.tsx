import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import R3fGlobe, { type GlobeMethods } from 'r3f-globe';

/**
 * HeroScene — „Region: Earth“ rotující glóbus (Cloudflare-style), postavený na
 * battle-tested knihovně `r3f-globe` (wrapper nad `vasturiano/three-globe`).
 *
 * Vše žije UVNITŘ jednoho <Canvas> a sedí ZA vystředěným titulkem v
 * `.hero-fs-content` (titulek mizí při scrollu, glóbus je pozadí).
 *
 * Kompozice:
 *  1. Tmavě námořnická koule (MeshPhongMaterial ≈ #0d1829) + azurová atmosféra.
 *  2. Tečkované kontinenty — `hexPolygonsData` z Natural Earth GeoJSON
 *     (`/countries.geojson`, public-domain), `hexPolygonUseDots` → žhnoucí
 *     azurové tečky jako u Cloudflare. Když fetch selže, glóbus se vykreslí dál
 *     (kontinenty prostě chybí — žádný pád).
 *  3. Animované žhnoucí oblouky mezi světovými burzami — azurový gradient,
 *     putující pulz (`arcDashAnimateTime`), tenký `arcStroke`, jemná výška.
 *  4. Drobné markery na burzách — malé azurové body (`pointsData`, `pointsMerge`).
 *     ŽÁDNÉ velké plovoucí popisky/tickery (to byl ten eyesore) — jen tečky.
 *  5. Glóbus posazený níž a zvětšený → horní polokoule stoupá za titulek.
 *  6. Rotace: pomalá auto-rotace + tlumený parallax k pointeru.
 *
 * „Vesmírné“ pozadí (decentní, ať planeta „pluje“ v prostoru — NE křiklavě):
 *  A. Vrstvená hvězdná obloha (drei <Stars> daleká + bližší řidší, BEZ vlastního
 *     drei-twinkle: speed=0) + drobná custom-points vrstva s jemným blikáním.
 *  B. Velmi slabá mlhovina (fullscreen plane, custom fBm value-noise shader, pomalý
 *     drift, vignette-maska). Extrémně nízká opacita (~0.05), DOMINANTNĚ navy, jen
 *     odbarvené azurové závoje — ŽÁDNÁ zeleň (tu už dělá CSS aurora <body>, aby se
 *     nezdvojovaly). renderOrder=-10, depthTest/Write=false → daleko za glóbem.
 *  C. Vignette overlay (fullscreen plane, vysoký renderOrder, depthTest=false) —
 *     jemně ztmaví rohy, zaostří oko na glóbus a zkrotí okraje hvězd/mlhoviny.
 *  D. Fresnel rim glow na planetě (o málo větší koule, aditivní fresnel shader,
 *     azur) → planeta jemně žhne na siluetě. Společně s tlumenou three-globe
 *     atmosférou = „opravdová planeta“, ne dvě soupeřící svatozáře.
 *  E. Graceful entrance: na mountu se škála skupiny glóbu povolí 0.7→1 (~1 s) přes
 *     ref na transformu (NE traversal hex meshů!) + oblouky se „nakreslí“
 *     (arcsTransitionDuration, naplněné se zpožděním). reduced-motion → rovnou finále.
 *  F. Tlumený pointer-parallax POUZE na pozadí (hvězdy/mlhovina, ±~0.01 rad) — NE na
 *     glóbu (ten má vlastní drag + auto-rotaci, ať se nepere s parallaxem).
 *
 * Řízení běhu:
 *  - `paused` (hero mimo obrazovku): zmrazí rotaci a zavolá `pauseAnimation()`,
 *    aby arc-tweeny nešlapaly naprázdno; po un-pauze `resumeAnimation()`.
 *    Zároveň zmrazí veškerý drift/twinkle (uTime se neposouvá).
 *  - prefers-reduced-motion: klidný statický glóbus (žádná rotace ani arc anim),
 *    pozadí bez driftu/blikání, entrance přeskočena.
 *
 * Pozn. (React Compiler / react-hooks v7): mutujeme jen `ref.current` (transformy
 * skupin) a uniformy přes ref připnutý na JSX <shaderMaterial> (`mat.current.uniforms.*.value`)
 * — žádné mutace objektů vrácených z useMemo/useState. Geometrie/uniform objekty
 * se alokují jednou (useMemo), v useFrame se jen mění `.value` (žádné alokace/frame).
 */

interface SceneProps {
  accentColor?: string;
  particleCount?: number;
  paused?: boolean;
}

/* Pozn.: three-globe má poloměr koule ~100 jednotek → kamera/kompozice níž
 * jsou laděné k této škále. */
const CYAN = '#3ab5e0'; // atmosféra + tečky + oblouky
const GLOBE_RADIUS = 100; // three-globe default radius (jednotky scény)

/* Hrubá detekce slabšího HW podle počtu logických jader (proxy pro výkon GPU).
 * <=4 jader = typicky notebook bez dedikované grafiky → ještě tvrdší dpr cap (1×),
 * ať se hero glóbus neseká. Spočítá se jednou; guard pro jistotu (SSR/staré API). */
const LOW_PERF =
  typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;

/* ── Finanční burzy (huby) ───────────────────────────────────────────────── */
interface Hub {
  name: string;
  lat: number;
  lng: number;
  tier: 'mega' | 'major' | 'regional';
}
const HUBS: Hub[] = [
  { name: 'New York (NYSE)', lat: 40.7069, lng: -74.0113, tier: 'mega' },
  { name: 'New York (Nasdaq)', lat: 40.7561, lng: -73.9857, tier: 'mega' },
  { name: 'Toronto (TSX)', lat: 43.6479, lng: -79.3812, tier: 'major' },
  { name: 'Mexico City (BMV)', lat: 19.4338, lng: -99.1419, tier: 'regional' },
  { name: 'São Paulo (B3)', lat: -23.5708, lng: -46.6336, tier: 'major' },
  { name: 'Buenos Aires (BYMA)', lat: -34.6086, lng: -58.3739, tier: 'regional' },
  { name: 'Santiago (BCS)', lat: -33.441, lng: -70.651, tier: 'regional' },
  { name: 'Bogotá (BVC)', lat: 4.601, lng: -74.068, tier: 'regional' },
  { name: 'Lima (BVL)', lat: -12.054, lng: -77.033, tier: 'regional' },
  { name: 'London (LSE)', lat: 51.5155, lng: -0.0922, tier: 'mega' },
  { name: 'Paris (Euronext)', lat: 48.869, lng: 2.341, tier: 'mega' },
  { name: 'Amsterdam (Euronext)', lat: 52.3676, lng: 4.895, tier: 'major' },
  { name: 'Frankfurt (Deutsche Börse)', lat: 50.1155, lng: 8.6842, tier: 'major' },
  { name: 'Zurich (SIX)', lat: 47.37, lng: 8.536, tier: 'major' },
  { name: 'Milan (Borsa Italiana)', lat: 45.4654, lng: 9.1859, tier: 'major' },
  { name: 'Madrid (BME)', lat: 40.4168, lng: -3.6932, tier: 'major' },
  { name: 'Stockholm (Nasdaq)', lat: 59.332, lng: 18.072, tier: 'major' },
  { name: 'Oslo (Euronext)', lat: 59.912, lng: 10.735, tier: 'regional' },
  { name: 'Vienna (Wiener Börse)', lat: 48.2092, lng: 16.359, tier: 'regional' },
  { name: 'Warsaw (GPW)', lat: 52.233, lng: 21.008, tier: 'regional' },
  { name: 'Istanbul (BIST)', lat: 41.066, lng: 29.008, tier: 'regional' },
  { name: 'Moscow (MOEX)', lat: 55.752, lng: 37.628, tier: 'regional' },
  { name: 'Johannesburg (JSE)', lat: -26.098, lng: 28.056, tier: 'major' },
  { name: 'Lagos (NGX)', lat: 6.45, lng: 3.396, tier: 'regional' },
  { name: 'Nairobi (NSE)', lat: -1.284, lng: 36.823, tier: 'regional' },
  { name: 'Casablanca (BVC)', lat: 33.595, lng: -7.618, tier: 'regional' },
  { name: 'Cairo (EGX)', lat: 30.044, lng: 31.236, tier: 'regional' },
  { name: 'Riyadh (Tadawul)', lat: 24.711, lng: 46.674, tier: 'major' },
  { name: 'Dubai (DFM)', lat: 25.222, lng: 55.284, tier: 'regional' },
  { name: 'Abu Dhabi (ADX)', lat: 24.499, lng: 54.377, tier: 'regional' },
  { name: 'Doha (QSE)', lat: 25.287, lng: 51.531, tier: 'regional' },
  { name: 'Tel Aviv (TASE)', lat: 32.064, lng: 34.774, tier: 'regional' },
  { name: 'Mumbai (NSE/BSE)', lat: 18.93, lng: 72.835, tier: 'major' },
  { name: 'Shanghai (SSE)', lat: 31.233, lng: 121.505, tier: 'mega' },
  { name: 'Shenzhen (SZSE)', lat: 22.543, lng: 114.057, tier: 'mega' },
  { name: 'Hong Kong (HKEX)', lat: 22.281, lng: 114.159, tier: 'mega' },
  { name: 'Taipei (TWSE)', lat: 25.033, lng: 121.565, tier: 'major' },
  { name: 'Tokyo (JPX)', lat: 35.683, lng: 139.777, tier: 'mega' },
  { name: 'Seoul (KRX)', lat: 37.525, lng: 126.927, tier: 'major' },
  { name: 'Singapore (SGX)', lat: 1.281, lng: 103.85, tier: 'major' },
  { name: 'Bangkok (SET)', lat: 13.753, lng: 100.539, tier: 'regional' },
  { name: 'Kuala Lumpur (Bursa Malaysia)', lat: 3.148, lng: 101.713, tier: 'regional' },
  { name: 'Jakarta (IDX)', lat: -6.224, lng: 106.809, tier: 'regional' },
  { name: 'Ho Chi Minh City (HOSE)', lat: 10.778, lng: 106.7, tier: 'regional' },
  { name: 'Manila (PSE)', lat: 14.556, lng: 121.025, tier: 'regional' },
  { name: 'Sydney (ASX)', lat: -33.867, lng: 151.207, tier: 'major' },
  { name: 'Wellington (NZX)', lat: -41.287, lng: 174.776, tier: 'regional' },
];
/* Hub-and-spoke generátor oblouků (deterministický). „Páteřní“ huby (mega burzy),
 * z nichž/do nichž putují pulzy z okolních menších burz (spokes). */
const HUB_NAMES = [
  'New York (NYSE)', 'London (LSE)', 'Frankfurt (Deutsche Börse)',
  'Hong Kong (HKEX)', 'Tokyo (JPX)',
] as const;

interface ArcDatum {
  id: number;      // stabilní index → dávkování aktivních pulzů (perf)
  startLat: number; startLng: number; endLat: number; endLng: number;
  initGap: number; // 0..1 — de-syncs pulse POSITION
  animMs: number;  // 2600..4400 — de-syncs pulse SPEED (slower travel)
  alt: number;     // orbit band: 0.16 | 0.30 | 0.50
}

// great-circle distance (radians 0..pi), haversine. Pure, module scope.
function gcDist(a: Hub, b: Hub): number {
  const R = Math.PI / 180;
  const dLat = (b.lat - a.lat) * R, dLng = (b.lng - a.lng) * R;
  const la1 = a.lat * R, la2 = b.lat * R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const ALT_BANDS = [0.16, 0.3, 0.5] as const;
function altBand(d: number): number {
  return d < 0.35 ? ALT_BANDS[0] : d < 1.0 ? ALT_BANDS[1] : ALT_BANDS[2];
}

const arcRng = mulberry32(0xa12c); // deterministic seed → identical every load
function buildArcs(): ArcDatum[] {
  const names = HUB_NAMES as readonly string[];
  const hubs = HUBS.filter((h) => names.includes(h.name));
  const spokes = HUBS.filter((h) => !names.includes(h.name));
  const byName = (n: string): Hub => {
    const h = HUBS.find((x) => x.name === n);
    if (!h) throw new Error('hub ' + n);
    return h;
  };
  const seen = new Set<string>();
  const out: ArcDatum[] = [];
  // START = spoke, END = hub → pulse launches FROM the smaller exchange's pillar.
  const push = (from: Hub, to: Hub) => {
    if (from.name === to.name) return;
    if (gcDist(from, to) < 0.02) return; // skip degenerate co-located arcs (NYSE↔Nasdaq…)
    const k = [from.name, to.name].sort().join('|');
    if (seen.has(k)) return;
    seen.add(k);
    out.push({
      id: out.length,
      startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng,
      initGap: arcRng(),
      animMs: 2600 + arcRng() * 1800,
      alt: altBand(gcDist(from, to)),
    });
  };
  // Rule A: every spoke → nearest hub. Rule B: mega spokes also → 2nd-nearest hub.
  for (const s of spokes) {
    const ranked = hubs.slice().sort((x, y) => gcDist(s, x) - gcDist(s, y));
    if (ranked[0]) push(s, ranked[0]);
    if (s.tier === 'mega' && ranked[1]) push(s, ranked[1]);
  }
  // Rule C: trunk backbone (hub↔hub) — the iconic transoceanic main lines.
  const TRUNKS: [string, string][] = [
    ['New York (NYSE)', 'London (LSE)'],
    ['London (LSE)', 'Frankfurt (Deutsche Börse)'],
    ['Frankfurt (Deutsche Börse)', 'Hong Kong (HKEX)'],
    ['Hong Kong (HKEX)', 'Tokyo (JPX)'],
    ['Tokyo (JPX)', 'New York (NYSE)'],
    ['New York (NYSE)', 'Hong Kong (HKEX)'],
    ['London (LSE)', 'Tokyo (JPX)'],
  ];
  for (const [a, b] of TRUNKS) push(byName(a), byName(b));
  return out;
}
const ARCS: ArcDatum[] = buildArcs(); // ≈ 50 arcs after dedup/skip

/* ── Oblouky vysílají signál PLYNULE a nepřetržitě ────────────────────────────
 * Dřív se „aktivní okno" pulzů posouvalo po síti (dávkování kvůli perf). Jenže
 * když okno opustilo oblouk UPROSTŘED letu, pulz skokem zmizel (dashLength→0) →
 * čáry „nedojely", síť působila sekaně. Teď pulzuje VŠECH ~50 oblouků naráz a
 * nepřetržitě; nehoří identicky, protože je de-syncuje fáze (initGap) + per-arc
 * rychlost (animMs). Žádné okno = žádné mizení uprostřed letu + arcsData je teď
 * stabilní reference (po vstupu žádný re-digest → i méně CPU). Na slabším HW jen
 * polovina oblouků (fill na integrované GPU), pořád ale všechny plynule dojedou. */
const DISPLAY_ARCS: ArcDatum[] = LOW_PERF ? ARCS.filter((_, i) => i % 2 === 0) : ARCS;

/* Markery burz = zářící „světla měst" (komponenta CityLights níže) — sedí na
 * povrchu jako měkká světla, ne trčící válečky. Staví se přímo z HUBS (tier řídí
 * velikost/jas), takže žádné samostatné POINTS pole ani accessory nejsou potřeba. */

/* Azurový gradient pro oblouky (průhledný → azur → průhledný = putující pulz). */
const ARC_COLOR: string[] = ['rgba(58,181,224,0)', CYAN, 'rgba(58,181,224,0)'];
/* ~17 % oblouků dostane ZELENÝ pulz (teal→emerald) = brand-echo s azurovo-zeleným
 * titulkem → glóbus „si podá ruku" s textem, ubyde monochromní placatost. */
const ARC_COLOR_GREEN: string[] = ['rgba(45,212,191,0)', '#2dd4bf', 'rgba(45,212,191,0)'];
/* Stabilní arc accessory nezávislé na dávce (module-scope → nespouští re-digest
 * při každém posunu okna; měnit se musí JEN dash-length/animate-time, viz JSX). */
const ARC_COLOR_FN = (d: object): string[] =>
  (d as ArcDatum).id % 6 === 0 ? ARC_COLOR_GREEN : ARC_COLOR;
const ARC_ALT_FN = (d: object): number => (d as ArcDatum).alt;
const ARC_INITGAP_FN = (d: object): number => (d as ArcDatum).initGap;

/* ── Radar pulz na hlavních burzách ───────────────────────────────────────────
 * Z páteřních hubů (HUB_NAMES = 5 globálních center) se periodicky šíří jemný
 * azurový prstenec („ping") — burza jako živý zdroj signálu, navazuje na oblouky.
 * Jen 5 hubů + ringResolution 32 + perioda > život ringu → ~4 živé prstence naráz
 * (každý = 1 THREE.Line; pauseAnimation() je zmrazí — viz efekt v GlobeBody).
 * Všechny accessory STABILNÍ module-scope → re-render kvůli dávkování oblouků
 * NEpřestaví ring vrstvu (jinak by pulzy blikaly/resetovaly se). */
const RING_HUBS: Hub[] = HUBS.filter((h) => (HUB_NAMES as readonly string[]).includes(h.name));
const RING_COLOR: string[] = ['rgba(200,244,255,0.85)', 'rgba(75,196,230,0.35)', 'rgba(58,181,224,0)'];
const RING_COLOR_FN = (): string[] => RING_COLOR;
const RING_LAT_FN = (d: object): number => (d as Hub).lat;
const RING_LNG_FN = (d: object): number => (d as Hub).lng;

/* GeoJSON Feature (jen co potřebujeme z `.features`). */
interface GeoFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** Deterministický PRNG (mulberry32) — čistý (žádné Math.random v renderu →
 *  react-hooks/purity v7 OK). Stejný seed = stejné rozmístění hvězd každý render. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** prefers-reduced-motion hook (reaktivní). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Načti countries.geojson jednou; vrať `.features` nebo [] při chybě. */
function useCountries(): GeoFeature[] {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/countries.geojson')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('geojson 404'))))
      .then((json: { features?: GeoFeature[] }) => {
        if (alive && Array.isArray(json.features)) setFeatures(json.features);
      })
      .catch(() => {
        /* glóbus se vykreslí i bez kontinentů — žádný pád */
      });
    return () => {
      alive = false;
    };
  }, []);
  return features;
}

/* ════════════════════════════════════════════════════════════════════════════
   VESMÍRNÉ POZADÍ — shadery
   Všechny shadery jsou self-contained; varyings/uniformy deklarované a konzistentní,
   bez NaN (žádné dělení nulou, normalize jen nenulových vektorů). Aditivní materiály
   mají depthWrite:false.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Mlhovina: fBm value-noise, pomalý drift, vignette-maska ──────────────────
   DOMINANTNĚ navy, jen odbarvené azurové závoje. ŽÁDNÁ zeleň. Velmi nízká opacita. */
const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const NEBULA_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uNavy;
  uniform vec3 uCyan;

  // hash + value noise (žádné textury)
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  // fBm (2 oktávy — sníženo ze 4 kvůli výkonu; při 5% opacitě vizuálně k nerozeznání)
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 2; i++) {
      v += amp * vnoise(p);
      p = p * 2.02 + 11.7;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    // jemný pomalý drift mraků
    vec2 p = vUv * 3.0;
    float drift = uTime * 0.012;
    float n = fbm(p + vec2(drift, drift * 0.6));
    n = smoothstep(0.42, 0.92, n); // sevři do řidších závojů

    // vignette-maska: závoje hlavně k okrajům, střed (kde je glóbus) čistý
    vec2 c = vUv - 0.5;
    float edge = smoothstep(0.18, 0.62, length(c));

    // barva: navy → odbarvená azurová špička (NIKDY zeleň)
    vec3 col = mix(uNavy, uCyan, n * 0.55);
    float a = n * edge * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

/* ── Fresnel rim glow planety (aditivní) ─────────────────────────────────────
   Žhne na siluetě (pohled kolmo na normálu). */
const FRESNEL_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;
const FRESNEL_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPower;
  void main() {
    float f = 1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0);
    f = pow(f, uPower);
    gl_FragColor = vec4(uColor, f * uOpacity);
  }
`;

/* ── Vignette overlay (fullscreen, ztmaví rohy) ──────────────────────────────
   Násobí jen alfou tmavé barvy → jemné ztmavení rohů přes vše ostatní. */
const VIGNETTE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0); // fullscreen NDC triangle/quad
  }
`;
const VIGNETTE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uStrength;
  void main() {
    vec2 c = vUv - 0.5;
    // radiální ztmavení: střed čistý, rohy tmavé
    float v = smoothstep(0.32, 0.78, length(c));
    gl_FragColor = vec4(0.016, 0.027, 0.055, v * uStrength); // navy-black
  }
`;

/* ── Custom „twinkle“ hvězdy (drobná řídká vrstva s jemným blikáním) ─────────
   Levné: jeden Points buffer, blikání čistě ve vertex/fragment shaderu přes uTime. */
const TWINKLE_VERT = /* glsl */ `
  precision highp float;
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uTwinkle; // 0 = zmrazeno (reduced-motion / paused)
  varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // velikost klesá se vzdáleností
    gl_PointSize = aSize * (300.0 / max(-mvPosition.z, 1.0));
    // jemné blikání: nikdy plně nezhasne (0.45..1.0)
    float tw = 0.5 + 0.5 * sin(uTime * 1.6 + aSeed * 6.2831);
    vAlpha = mix(1.0, 0.45 + 0.55 * tw, uTwinkle);
  }
`;
const TWINKLE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    // kulatý bod s měkkým okrajem
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    float soft = smoothstep(0.5, 0.0, r);
    if (soft <= 0.001) discard;
    gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity);
  }
`;

/* ── Mlhovina (komponenta) ───────────────────────────────────────────────── */
function Nebula({ frozen }: { frozen: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.05 }, // EXTRÉMNĚ nízká (subtle, ne křiklavé)
      uNavy: { value: new THREE.Color('#0e2038') },
      uCyan: { value: new THREE.Color('#2f7fa6') }, // odbarvená azurová (ne syté CYAN)
    }),
    [],
  );
  useFrame((_, delta) => {
    if (frozen) return;
    const m = matRef.current;
    if (m) m.uniforms.uTime.value += Math.min(delta, 0.05);
  });
  return (
    <mesh renderOrder={-10} frustumCulled={false} position={[0, 0, -700]}>
      {/* velký plane daleko za glóbem; nepíše do depth → vždy úplně vzadu */}
      <planeGeometry args={[3600, 2200]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={NEBULA_VERT}
        fragmentShader={NEBULA_FRAG}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

/* ── Custom twinkle hvězdy (komponenta) ──────────────────────────────────── */
function TwinkleStars({ frozen, color }: { frozen: boolean; color: string }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const COUNT = 140;

  const geometry = useMemo(() => {
    const rnd = mulberry32(0x5eed1234); // fixní seed → stabilní rozmístění
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // rozsyp DALEKO za glóbus (poloměr ~118) — ať hvězdy nejsou uvnitř planety
      const r = 280 + rnd() * 220;
      const theta = Math.acos(2 * rnd() - 1);
      const phi = rnd() * Math.PI * 2;
      pos[i * 3 + 0] = r * Math.sin(theta) * Math.cos(phi);
      pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      pos[i * 3 + 2] = r * Math.cos(theta);
      seed[i] = rnd();
      size[i] = 1.4 + rnd() * 2.2;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTwinkle: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.6 },
    }),
    [color],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    // zmrazené blikání → uTwinkle 0 (hvězdy svítí klidně), čas neposouváme
    m.uniforms.uTwinkle.value = frozen ? 0 : 1;
    if (!frozen) m.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={TWINKLE_VERT}
        fragmentShader={TWINKLE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Vesmírné pozadí: vrstvy hvězd + mlhovina + tlumený parallax ──────────── */
function SpaceBackground({ frozen }: { frozen: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useThree((s) => s.pointer);

  // tlumený pointer-parallax POUZE na pozadí (±~0.012 rad) — glóbu se nedotýká
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (frozen) return; // reduced-motion / paused → bez parallaxu
    const tx = pointer.y * 0.012;
    const ty = pointer.x * 0.012;
    g.rotation.x += (tx - g.rotation.x) * 0.04;
    g.rotation.y += (ty - g.rotation.y) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {/* jedna hvězdná vrstva (sníženo z 3500+500 kvůli výkonu na slabších strojích) —
          bez drei twinkle (speed=0), vlastní jemný drift dělá TwinkleStars */}
      <Stars
        radius={300}
        depth={60}
        count={2000}
        factor={2.6}
        saturation={0.12}
        fade
        speed={0}
      />
      {/* drobná custom vrstva s jemným blikáním */}
      <TwinkleStars frozen={frozen} color="#bfe6f5" />
      {/* velmi slabá mlhovina daleko vzadu */}
      <Nebula frozen={frozen} />
    </group>
  );
}

/* ── Vignette overlay (ztmaví rohy, zaostří oko na glóbus) ────────────────── */
function VignetteOverlay() {
  const uniforms = useMemo(
    () => ({
      uStrength: { value: 0.55 }, // jemné–střední; kombinuje se s CSS vignette
    }),
    [],
  );
  // fullscreen quad v NDC (vertex ignoruje kameru) → renderOrder vysoký, depthTest off
  return (
    <mesh renderOrder={999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={VIGNETTE_VERT}
        fragmentShader={VIGNETTE_FRAG}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Fresnel rim glow (o málo větší koule, aditivní) ──────────────────────── */
function FresnelRim({ color }: { color: string }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.12 }, // jen jemný tenký lem na siluetě — žádná velká zář kolem planety
      uPower: { value: 3.6 },
    }),
    [color],
  );
  return (
    <mesh scale={1.025} renderOrder={2}>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <shaderMaterial
        vertexShader={FRESNEL_VERT}
        fragmentShader={FRESNEL_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/* ── Zářící „světla měst" = markery burz ──────────────────────────────────────
   Markery NEtrčí ze sféry jako válečky (to vypadalo nepřirozeně — na limbu jako
   rozházené hranaté čárky). Místo toho SEDÍ na povrchu jako měkká kulatá světla
   (noční metropole z oběžné dráhy): custom THREE.Points (vzor jako TwinkleStars),
   1 draw call, aditivní glow s radiálním gradientem (jádro→halo), per-tier
   velikost/jas, ZADNÍ polokoule ztlumená (facing) → na limbu nic netrčí, jen
   měkké světýlko, a markery splývají s azurovým tečkovaným povrchem = zakomponováno.
   Jemný „dech" (1 uniform, jako TwinkleStars) → živé, ale neseká. */
const CITY_VERT = /* glsl */ `
  precision highp float;
  attribute float aSize;
  attribute float aBright;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPulse;       // 1 živé, 0 zmrazené (paused / reduced-motion)
  uniform float uPixelRatio;
  varying float vBright;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 worldNormal = normalize(mat3(modelMatrix) * normalize(position));
    vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
    float facing = dot(worldNormal, viewDir);          // >0 přední, <0 zadní
    float side = smoothstep(-0.2, 0.35, facing);        // zadní ~0, přední 1
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // velikost klesá se vzdáleností (size-attenuation); škáluje s dpr
    gl_PointSize = aSize * uPixelRatio * (260.0 / max(-mvPosition.z, 1.0));
    // pomalý „dech" (každé světlo jinak fázované), zadní strana ztlumená ~6×
    float breath = 0.82 + 0.18 * sin(uTime * 0.9 + aSeed * 6.2831);
    vBright = aBright * mix(0.16, 1.0, side) * mix(1.0, breath, uPulse);
  }
`;
const CITY_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uCore;
  uniform vec3 uHalo;
  uniform float uOpacity;
  varying float vBright;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;        // 0 ve středu, 1 na okraji spritu
    if (r > 1.0) discard;             // kruh (žádný hranatý sprite)
    float core = smoothstep(0.5, 0.0, r);   // jasné bělavé jádro (vynikne nad tečkami)
    float halo = smoothstep(1.0, 0.0, r);
    halo = halo * halo;               // ^2 → bloom-křivka, ne plný disk
    vec3 col = mix(uHalo, uCore, core * core);
    float a = (halo * 0.45 + core) * vBright * uOpacity;
    if (a <= 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/* polar→kartézský přesně jako three-globe (radius 100) → světla sednou na burzy. */
function CityLights({ frozen }: { frozen: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = HUBS.length;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const bright = new Float32Array(n);
    const seed = new Float32Array(n);
    const rng = mulberry32(0x9e1f73);
    const rad = GLOBE_RADIUS * 1.006; // těsně nad povrchem (≈ rovina hex-teček)
    for (let i = 0; i < n; i++) {
      const h = HUBS[i];
      const phi = ((90 - h.lat) * Math.PI) / 180;
      const theta = ((90 - h.lng) * Math.PI) / 180;
      pos[i * 3 + 0] = rad * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = rad * Math.cos(phi);
      pos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
      size[i] = h.tier === 'mega' ? 22 : h.tier === 'major' ? 14 : 9;
      bright[i] = h.tier === 'mega' ? 1.0 : h.tier === 'major' ? 0.55 : 0.3;
      seed[i] = rng();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: 1 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio?.() ?? 1, 1.5) },
      uCore: { value: new THREE.Color('#dff4ff') }, // žhavé ledově-bílé jádro
      uHalo: { value: new THREE.Color(CYAN) },       // azurové halo (splývá s tečkami)
      uOpacity: { value: 1.0 },
    }),
    [gl],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uPulse.value = frozen ? 0 : 1;
    if (!frozen) m.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={matRef}
        vertexShader={CITY_VERT}
        fragmentShader={CITY_FRAG}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Glóbus (R3fGlobe) + rotující skupina + parallax ─────────────────────── */

function GlobeBody({
  accentColor,
  still,
  paused,
}: {
  accentColor: string;
  still: boolean;
  paused: boolean;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  // Wrapper kolem <R3fGlobe>: r3f-globe ref (`globeRef`) vystavuje JEN metody
  // (pauseAnimation…), NE samotný Object3D. Knihovna ale renderuje
  // <primitive object={ThreeGlobe}>, kde ThreeGlobe extends THREE.Group a je kořenem,
  // do něhož se přidávají všechny vrstvy (hex meshe, graticule…). Přes ref na tento
  // wrapper proto najdeme ThreeGlobe traversalem a sáhneme na materiály vrstev.
  const globeWrapRef = useRef<THREE.Group>(null);
  const parallaxRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const dragRef = useRef(false);
  const features = useCountries();
  const { camera, size, gl } = useThree();

  // oblouky naplníme se zpožděním → s arcsTransitionDuration se „nakreslí“ při příchodu.
  // reduced-motion: odvozeně rovnou hotové (`still || arcsReady`) → žádný synchronní
  // setState v efektu (čistý react-hooks lint). Efekt jen naplánuje draw-in (non-still).
  const [arcsReady, setArcsReady] = useState(false);
  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => setArcsReady(true), 320);
    return () => clearTimeout(t);
  }, [still]);
  const arcsData = still || arcsReady ? DISPLAY_ARCS : [];

  // OKLUDÉR: koule nic nemaluje (colorWrite:false), ale PÍŠE hloubku (depthWrite:true,
  // depthTest:true) → v opaque passu zakryje VŠE s depthTest:true za diskem planety:
  // hvězdy (drei <Stars> testují hloubku) „neprosvítají skrz planetu“. Tečky pevnin
  // i graticule mají naopak depthTest:false (viz efekt níže) → tento okludér je NEzakryje
  // a vidíme je na PŘEDNÍ i ZADNÍ polokouli → planeta je průsvitná koule z teček + mřížka,
  // ale sedí na TMAVÉM pozadí (žádné hvězdy uvnitř siluety). Oceán = jen tmavé pozadí.
  const globeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false }), []);
  useEffect(() => () => globeMaterial.dispose(), [globeMaterial]);

  // Renderer size → r3f-globe drží proporce nezávisle na okně.
  const rendererSize = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  );

  // Pauza/obnova interních tweenů knihovny (arc dash animace ap.).
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (paused || still) g.pauseAnimation();
    else g.resumeAnimation();
  }, [paused, still, features]);

  // Některé vrstvy potřebují znát kameru (drží se synchronizace pohledu).
  useEffect(() => {
    globeRef.current?.setPointOfView(camera);
  }, [camera]);

  // ── PRŮSVITNÁ PLANETA: tečky + graticule viditelné na OBOU polokoulích ──────
  // Mechanismus (viz analýza three-globe source):
  //   • ThreeGlobe extends THREE.Group a je kořenem, kam se přidávají všechny vrstvy.
  //     Najdeme ho traversalem `globeWrapRef` (jediný potomek typu Group s vrstvami).
  //   • Hex-tečky: každá země = THREE.Mesh s `__globeObjType === 'hexPolygon'`
  //     (MeshLambertMaterial). Nastavíme materiálu depthTest:false + depthWrite:false →
  //     přední tečky nezakryjí zadní a okludér-koule je nezakryje → vidíme PŘEDNÍ i ZADNÍ.
  //   • Graticule: jediný THREE.LineSegments (LineBasicMaterial) přidaný do kořene.
  //     Stejné depth flagy → mřížka prosvítá na odvrácenou stranu; zjemníme barvu/opacitu.
  //   • renderOrder=1 (transparent pass už beztak běží po opaque okludéru) → deterministicky.
  // Hex vrstva se staví ASYNCHRONNĚ po nastavení `hexPolygonsData` (data digest), proto
  // krátký omezený retry, dokud meshe nejsou v grafu. Vše guardováno (když nenajdeme,
  // planeta se prostě vykreslí dál — žádný pád). Mutujeme jen knihovní three materiály
  // získané traversalem (NE hodnoty z useMemo/useState) → react-hooks v7 OK.
  useEffect(() => {
    const wrap = globeWrapRef.current;
    if (!wrap) return;
    const gratColor = new THREE.Color(accentColor);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const apply = () => {
      let hexFound = 0;
      let gratFound = false;
      wrap.traverse((obj) => {
        // hex-tečky pevnin
        if ((obj as { __globeObjType?: string }).__globeObjType === 'hexPolygon') {
          const mesh = obj as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if (!m) continue;
            m.depthTest = false;
            m.depthWrite = false;
            m.transparent = true;
            m.needsUpdate = true;
          }
          mesh.renderOrder = 1;
          hexFound++;
        }
        // graticule = jediný LineSegments v glóbu
        if ((obj as THREE.Object3D).type === 'LineSegments') {
          const line = obj as THREE.LineSegments;
          const lm = line.material as THREE.LineBasicMaterial | THREE.LineBasicMaterial[];
          const mats = Array.isArray(lm) ? lm : [lm];
          for (const m of mats) {
            if (!m) continue;
            m.depthTest = false;
            m.depthWrite = false;
            m.transparent = true;
            // jemná azurová mřížka (Cloudflare-style), nízká opacita
            if ('color' in m && m.color instanceof THREE.Color) m.color.copy(gratColor);
            m.opacity = 0.12;
            m.needsUpdate = true;
          }
          line.renderOrder = 1;
          gratFound = true;
        }
      });
      // hex meshe se tvoří async; když ještě nejsou (nebo graticule), zkus znovu (max ~2 s).
      const featuresExpected = features.length > 0;
      const done = (!featuresExpected || hexFound > 0) && gratFound;
      if (!done && tries < 40) {
        tries++;
        timer = setTimeout(apply, 50);
      }
    };
    apply();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [features, accentColor]);

  // Auto-rotace (žádné alokace/frame). Příchod planety řeší CSS opacity fade na
  // wrapperu (.hero-fs-scene--enter), ne JS scale → imunní vůči rAF-pauze
  // v odpojené záložce; knihovní animateIn/waitForGlobeReady jsou vypnuté.
  useFrame((_, delta) => {
    if (still || paused) return;
    const sp = spinRef.current;
    if (sp && !dragRef.current) sp.rotation.y += Math.min(delta, 0.05) * 0.06;
  });

  // Drag: uživatel může glóbus chytit a libovolně roztočit. Horizontální tah = otáčení
  // kolem osy, vertikální = náklon (klampnutý). Po puštění se vrátí k auto-rotaci.
  // Jen myš/pero — touch necháme scrollovat stránku (jinak by nešlo projít hero na mobilu).
  useEffect(() => {
    const el = gl.domElement;
    const last = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // touch = scroll stránky
      dragRef.current = true;
      last.x = e.clientX;
      last.y = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      const sp = spinRef.current;
      const tilt = parallaxRef.current;
      // nižší citlivost = větší „odpor“, planeta se netočí tak hbitě
      if (sp) sp.rotation.y += dx * 0.0032;
      if (tilt) tilt.rotation.x = THREE.MathUtils.clamp(tilt.rotation.x + dy * 0.0032, -0.85, 0.85);
    };
    const onUp = () => {
      dragRef.current = false;
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl]);

  return (
    <group>
      <group ref={parallaxRef}>
        {/* lehký náklon osy zeměkoule pro „živější“ pohled */}
        <group rotation={[0.32, 0, 0.05]}>
          {/* spin skupina: rotujeme jí; startovní natočení = Atlantik k oku */}
          <group ref={spinRef} rotation={[0, -Math.PI / 2.2, 0]}>
            {/* jemný fresnel lem na siluetě (točí se se spinem) */}
            <FresnelRim color={accentColor} />
            {/* wrapper kolem glóbu → ref pro traversal k ThreeGlobe Object3D (viz efekt) */}
            <group ref={globeWrapRef}>
            <R3fGlobe
              ref={globeRef}
              rendererSize={rendererSize}
              globeMaterial={globeMaterial}
              // příchod neřeší knihovna (scale 1e-6→1 + spin) ani blank-frame čekání —
              // planeta je full-size od 1. snímku; grace zařídí CSS opacity fade
              animateIn={false}
              waitForGlobeReady={false}
              // atmosféra — tlumená (jen měkký objem), siluetu řeší fresnel lem
              showAtmosphere
              atmosphereColor={accentColor}
              atmosphereAltitude={0.08}
              // graticule (lat/lon mřížka, Cloudflare-style) — efekt jí dá depthTest:false
              // → prosvítá i na odvrácenou stranu; barvu/opacitu zjemní taktéž efekt
              showGraticules
              // tečkované kontinenty (knihovna čte `geometry` atribut Featur z GeoJSONu)
              hexPolygonsData={features}
              hexPolygonUseDots
              // tečky kontinentů: JEMNÉ jako původně (res 4 = hustý raster, kulaté tečky)
              // na běžném HW; jen na slabším HW (LOW_PERF) hrubší res 3 + 6úhelníkové tečky,
              // ať glóbus zůstane plynulý. (Uživatel: na běžném stroji chce jemné tečky.)
              hexPolygonResolution={LOW_PERF ? 3 : 4}
              hexPolygonDotResolution={LOW_PERF ? 6 : 12}
              hexPolygonMargin={0.4}
              hexPolygonAltitude={0.005}
              hexPolygonColor={() => 'rgba(58,181,224,0.6)'}
              hexPolygonsTransitionDuration={0}
              // oblouky burz (azurový pulz) — „nakreslí se“ při příchodu;
              // výška/rychlost/fáze pulzu per-arc (předpočítané pole na datu)
              arcsData={arcsData}
              arcColor={ARC_COLOR_FN}
              arcAltitude={ARC_ALT_FN}
              arcAltitudeAutoScale={0.5}
              arcStroke={0.3}
              arcCurveResolution={32}
              arcCircularResolution={4}
              // PLYNULÝ pulz: všechny oblouky mají stálou dash-délku a běží pořád;
              // de-sync drží initGap (fáze) + per-arc animMs (rychlost) → pulzy se
              // nepřekrývají identicky, ale žádný nezmizí uprostřed letu. still
              // (reduced-motion) → plná statická čára (dashLength 1, gap 0).
              // Všechna accessory jsou STABILNÍ reference → po vstupním draw-in
              // žádný re-digest (tube geometrie postavená jednou, uniformy beze změn).
              arcDashLength={still ? 1 : 0.34}
              arcDashGap={still ? 0 : 2.2}
              arcDashInitialGap={ARC_INITGAP_FN}
              arcDashAnimateTime={(d: object) =>
                still ? 0 : (d as ArcDatum).animMs}
              arcsTransitionDuration={still ? 0 : 1500}
              // RADAR PULZ na hlavních burzách: rozšiřující se prstenec („ping").
              // still (reduced-motion) → žádné ringy; paused/still zmrazí pauseAnimation().
              ringsData={still ? [] : RING_HUBS}
              ringColor={RING_COLOR_FN}
              ringLat={RING_LAT_FN}
              ringLng={RING_LNG_FN}
              ringAltitude={0.008}
              ringMaxRadius={18}
              ringPropagationSpeed={3.6}
              ringRepeatPeriod={3600}
              ringResolution={48}
            />
            {/* markery burz = zářící „světla měst" (CityLights, custom Points na povrchu) */}
            <CityLights frozen={paused || still} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/* ── HeroScene — Canvas wrapper (contract: viz HeroSection) ──────────────── */

export function HeroScene({
  accentColor = '#2596be',
  // particleCount zachován v kontraktu (volá ho HeroSection); glóbus si hustotu
  // teček řídí sám (hex rozlišení), tak hodnotu jen přijmeme.
  particleCount = 2400,
  paused = false,
}: SceneProps) {
  void particleCount;
  const reduced = usePrefersReducedMotion();
  const still = reduced;
  // zmraž veškerý drift/twinkle/parallax pozadí, když je hero mimo obrazovku
  // nebo když uživatel preferuje omezený pohyb
  const bgFrozen = paused || still;

  return (
    <Canvas
      // kamera ve škále glóbu (R ~100): odsazená tak, aby horní polokoule
      // vystupovala ZA vystředěný titulek (titulek zůstává čitelný).
      camera={{ position: [0, 40, 260], fov: 50, near: 0.1, far: 2000 }}
      // dpr cap snížen (z 1.5) + na slabším HW tvrdě 1× → méně fragmentů na retině.
      // antialias vypnuté (MSAA je na integrované GPU drahé; tečky/válečky mají měkké
      // okraje, siluetu drží fresnel lem → vizuálně skoro beze změny, znatelná úspora).
      dpr={LOW_PERF ? 1 : [1, 1.25]}
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', position: 'absolute', inset: 0 }}
      onCreated={({ camera }) => camera.lookAt(0, -28, 0)}
    >
      {/* osvětlení s TERMINÁTOREM: nižší ambient + silný TEPLÝ key + chladný FIALOVÝ fill
          → koule dostane světlou a tmavou stranu (objem), místo plochého rovnoměrného
          nasvícení, které vypadá „placatě 2D". (Teplo/chlad kontrast = hloubka.) */}
      <ambientLight intensity={0.7} color="#6f9bbd" />
      <directionalLight position={[-160, 130, 190]} intensity={1.7} color="#fff0db" />
      <pointLight position={[230, -50, 90]} intensity={1.0} color="#5b6cf5" />

      {/* vesmírné pozadí: vrstvené hvězdy + slabá mlhovina + tlumený bg-parallax */}
      <SpaceBackground frozen={bgFrozen} />

      {/* glóbus posazený níž a zvětšený → horní polokoule stoupá za titulek */}
      <group position={[0, -82, 0]} scale={1.18}>
        <GlobeBody accentColor={accentColor} still={still} paused={paused} />
      </group>

      {/* vignette overlay — jemně ztmaví rohy, zaostří oko na glóbus */}
      <VignetteOverlay />
    </Canvas>
  );
}
