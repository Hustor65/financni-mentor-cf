import { useRef, useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import R3fGlobe, { type GlobeMethods } from 'r3f-globe';
import {
  EXCHANGES, openMask, countOpen, marketsActiveSoon, lastWeekdayStart, subsolarPoint, pragueTime,
} from '../../utils/exchanges';
import type { Exchange } from '../../utils/exchanges';
import { setGlobeStatus } from '../../utils/globeStatus';

/**
 * HeroScene — glóbus jako hodiny světových trhů.
 *
 * Co ukazuje:
 *  - plnou, nasvícenou planetu: světlo je skutečné slunce (poloha se počítá
 *    z času návštěvníka), takže hranice dne a noci leží tam, kde opravdu je;
 *  - burzy: ta, která právě obchoduje, svítí zeleně, zavřená je tlumeně azurová;
 *  - mezi otevřenými burzami létají zelené pulzy, pod nimi slabá stálá síť tras;
 *  - když je všude zavřeno (víkend, noc), přehrává se zrychleně poslední
 *    obchodní den — popisek v hero to říká (utils/globeStatus).
 *
 * Kompozice: kamera stojí pevně, glóbus je v počátku. Velikost řídí škála skupiny,
 * umístění na obrazovce `camera.setViewOffset` (koule tak zůstane kruhem). Hodnoty
 * pro jednotlivé šířky jsou ve `useFraming`.
 *
 * Bez post-processingu: záře je fresnel na kouli, aditivní slupka atmosféry
 * a měkké body. Sdílené uniformy a materiály jsou na úrovni modulu (scéna je
 * na stránce jedna) — v useFrame se jen mění `.value`, nic se nealokuje.
 */

interface SceneProps {
  accentColor?: string;
  /** úroveň detailu: pod 2000 = telefon (hrubší tečky, méně hvězd, bez popisků) */
  particleCount?: number;
  paused?: boolean;
}

const CYAN = '#3ab5e0';
const GREEN = '#34d399';
const R = 100; // poloměr koule v three-globe

const LOW_PERF =
  typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;

/** Zrychlená ukázka: celý den za tolik vteřin. */
const LAPSE_DAY_SECONDS = 96;
/** Na kterou zeměpisnou délku se glóbus dívá v klidu (Praha uprostřed). */
const REST_YAW = (-14 * Math.PI) / 180;
/** Glóbus se neotáčí dokola — nad Tichým oceánem by byl prázdný. Kývá se mezi
 *  Atlantikem (je vidět New York) a Indií (je vidět Tokio). */
const SWAY_ANGLE = (60 * Math.PI) / 180;
const SWAY_SECONDS = 84;
const INTRO_SWEEP = (70 * Math.PI) / 180;
const INTRO_SECONDS = 1.8;

/* ── souřadnice ──────────────────────────────────────────────────────────── */

/** lat/lng → jednotkový vektor ve stejné soustavě, jakou používá three-globe. */
function polar(lat: number, lng: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  return out.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
}

function gcDist(a: Exchange, b: Exchange): number {
  const k = Math.PI / 180;
  const dLat = (b.lat - a.lat) * k, dLng = (b.lng - a.lng) * k;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ── trasy mezi burzami ──────────────────────────────────────────────────── */

interface ArcDatum {
  key: string;
  a: number; // index do EXCHANGES
  b: number;
  startLat: number; startLng: number; endLat: number; endLng: number;
  alt: number;
  /** true = putující pulz (obě burzy otevřené), false = slabá stálá trasa */
  pulse: boolean;
  gap: number;
  ms: number;
}

const PAIRS: [string, string][] = [
  ['NYSE', 'LSE'], ['NYSE', 'TSX'], ['NYSE', 'B3'], ['NYSE', 'FRA'],
  ['LSE', 'FRA'], ['LSE', 'PAR'], ['FRA', 'PSE'], ['LSE', 'PSE'], ['FRA', 'SIX'],
  ['LSE', 'JSE'], ['FRA', 'NSE'], ['NSE', 'SGX'], ['SGX', 'HKEX'], ['HKEX', 'SSE'],
  ['HKEX', 'JPX'], ['JPX', 'KRX'], ['JPX', 'ASX'], ['SGX', 'ASX'], ['LSE', 'HKEX'],
];
const TRUNKS = new Set(['NYSE|LSE', 'LSE|FRA', 'FRA|PSE', 'FRA|NSE', 'NSE|SGX', 'SGX|HKEX', 'HKEX|JPX', 'NYSE|B3', 'LSE|JSE', 'JPX|ASX']);

function buildArcs(): { tracks: ArcDatum[]; pulses: ArcDatum[] } {
  const index = (id: string) => EXCHANGES.findIndex(e => e.id === id);
  const tracks: ArcDatum[] = [];
  const pulses: ArcDatum[] = [];
  PAIRS.forEach(([x, y], i) => {
    const a = index(x), b = index(y);
    if (a < 0 || b < 0) return;
    const A = EXCHANGES[a], B = EXCHANGES[b];
    const d = gcDist(A, B);
    const base = {
      a, b, startLat: A.lat, startLng: A.lng, endLat: B.lat, endLng: B.lng,
      alt: d < 0.25 ? 0.05 : d < 1 ? 0.09 : 0.12,
      // fáze a rychlost pulzu se liší trasu od trasy (deterministicky), ať neblikají naráz
      gap: (i * 0.37) % 1,
      ms: 2600 + ((i * 733) % 1500),
    };
    if (TRUNKS.has(`${x}|${y}`)) tracks.push({ ...base, key: `t${i}`, pulse: false });
    pulses.push({ ...base, key: `p${i}`, pulse: true });
  });
  return { tracks, pulses };
}
const ARCS = buildArcs();

const TRACK_COLOR = 'rgba(58,181,224,0.2)';
const PULSE_COLOR = ['rgba(52,211,153,0)', GREEN, '#eafff6'];
const arcColor = (d: object) => ((d as ArcDatum).pulse ? PULSE_COLOR : TRACK_COLOR);
const arcAlt = (d: object) => (d as ArcDatum).alt;
const arcStroke = (d: object) => ((d as ArcDatum).pulse ? 0.5 : 0.2);
const arcGap = (d: object) => (d as ArcDatum).gap;
const arcDashLen = (d: object) => ((d as ArcDatum).pulse ? 0.45 : 1);
const arcDashGap = (d: object) => ((d as ArcDatum).pulse ? 1.6 : 0);
const arcTime = (d: object) => ((d as ArcDatum).pulse ? (d as ArcDatum).ms : 0);
const arcStill = () => 0;
const arcSolidLen = () => 1;

const RING_COLOR = ['rgba(234,255,246,0.8)', 'rgba(52,211,153,0.35)', 'rgba(52,211,153,0)'];
const ringColor = () => RING_COLOR;
const ringLat = (d: object) => (d as Exchange).lat;
const ringLng = (d: object) => (d as Exchange).lng;

const HEX_COLOR = () => CYAN;

/* ── sdílené uniformy (mění se jen .value) ───────────────────────────────── */

/** směr ke slunci v soustavě glóbu (otáčí se s ním → terminátor drží na mapě) */
const U_SUN = { value: new THREE.Vector3(0.3, 0.3, 0.9).normalize() };
/** totéž ve světových souřadnicích — pro slupku atmosféry */
const U_SUN_WORLD = { value: new THREE.Vector3(0.3, 0.3, 0.9).normalize() };
const U_TIME = { value: 0 };
/** velikost bodů v pixelech se počítá na výšku 900 px → na velké obrazovce nejsou titěrné */
const U_PIXEL = { value: 1 };

/* ── shadery ─────────────────────────────────────────────────────────────── */

const SURFACE_VERT = /* glsl */ `
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vObjN = normalize(position);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normalize(position));
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/* Oceán: noční strana skoro černá, denní námořnická; na siluetě azurový lem
   a přes celou plochu jemná síť poledníků a rovnoběžek. */
const OCEAN_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uSun;
  uniform vec3 uNight;
  uniform vec3 uDay;
  uniform vec3 uRim;
  void main() {
    float d = dot(normalize(vObjN), uSun);
    float day = smoothstep(-0.4, 0.6, d);
    float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0);
    vec3 col = mix(uNight, uDay, day);
    // měkké prosvětlení směrem ke slunci → koule má objem, ne jen lem
    col += uDay * pow(max(d, 0.0), 1.6) * 0.55;
    col += uRim * fres * (0.22 + 0.6 * day);
    // síť po 15° — oceán není prázdná plocha a koule má čitelný tvar
    vec3 n = normalize(vObjN);
    float lat = degrees(asin(clamp(n.y, -1.0, 1.0)));
    float lng = degrees(atan(n.z, n.x));
    float gLat = abs(fract(lat / 15.0 + 0.5) - 0.5) * 15.0;
    float gLng = abs(fract(lng / 15.0 + 0.5) - 0.5) * 15.0 * max(cos(radians(lat)), 0.05);
    float wLat = max(fwidth(lat), 0.02);
    float wLng = max(fwidth(lng) * max(cos(radians(lat)), 0.05), 0.02);
    float grid = max(1.0 - smoothstep(0.0, wLat * 1.4, gLat), (1.0 - smoothstep(0.0, wLng * 1.4, gLng)) * step(abs(lat), 82.0));
    col += uRim * grid * (0.07 + 0.09 * day) * (1.0 - fres);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* Tečky pevnin: ve dne azurové s horkým jádrem, v noci ocelově modré;
   k siluetě slábnou, ať okraj koule nepůsobí jako síto. */
const DOT_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vObjN;
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uSun;
  uniform vec3 uNight;
  uniform vec3 uDay;
  uniform vec3 uHot;
  void main() {
    float day = smoothstep(-0.3, 0.45, dot(normalize(vObjN), uSun));
    float limb = smoothstep(0.0, 0.4, dot(normalize(vN), normalize(vV)));
    vec3 col = mix(uNight, uDay, day) + uHot * pow(day, 4.0) * 0.3;
    gl_FragColor = vec4(col, mix(0.8, 1.0, day) * mix(0.3, 1.0, limb));
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
/* Slupka o 10 % větší než koule, kreslená zevnitř (BackSide): nejjasnější těsně
   u siluety planety, k vlastnímu okraji mizí. Na osvětlené straně výraznější. */
const ATMO_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uSunWorld;
  uniform vec3 uColor;
  void main() {
    vec3 n = normalize(vN);
    float g = pow(smoothstep(0.0, 0.417, -dot(n, normalize(vV))), 3.4);
    float sun = mix(0.3, 1.0, smoothstep(-0.5, 0.6, dot(n, uSunWorld)));
    gl_FragColor = vec4(uColor, g * sun * 0.5);
  }
`;

const STAR_VERT = /* glsl */ `
  precision highp float;
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uPixel;
  varying float vAlpha;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixel;
    vAlpha = 0.5 + 0.5 * sin(uTime * 1.3 + aSeed * 6.2831);
    vAlpha = 0.5 + 0.5 * vAlpha * aSeed;
  }
`;
const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float soft = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
    if (soft <= 0.01) discard;
    gl_FragColor = vec4(uColor, soft * vAlpha);
  }
`;

/* Burzy: měkké světlo na povrchu. aOpen plynule přechází 0 → 1 (zavřeno → otevřeno). */
const EXCH_VERT = /* glsl */ `
  precision highp float;
  attribute float aSize;
  attribute float aOpen;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixel;
  varying float vOpen;
  varying float vBright;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normalize(position));
    float facing = dot(n, normalize(cameraPosition - wp.xyz));
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    float breath = 0.8 + 0.2 * sin(uTime * 2.6 + aSeed * 6.2831);
    gl_PointSize = aSize * mix(0.5, 1.0, aOpen) * uPixel * (280.0 / max(-mv.z, 1.0));
    vOpen = aOpen;
    vBright = smoothstep(0.02, 0.3, facing) * mix(0.42, breath, aOpen);
  }
`;
const EXCH_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uOpenHalo;
  uniform vec3 uOpenCore;
  uniform vec3 uClosed;
  varying float vOpen;
  varying float vBright;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = smoothstep(0.42, 0.0, r);
    float halo = smoothstep(1.0, 0.0, r);
    halo *= halo;
    vec3 col = mix(mix(uClosed, uOpenHalo, vOpen), mix(uClosed, uOpenCore, vOpen), core * core);
    float a = (halo * 0.5 + core) * vBright;
    if (a <= 0.003) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/* ── materiály (jedna scéna na stránce → stačí jednou) ───────────────────── */

const OCEAN_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: SURFACE_VERT,
  fragmentShader: OCEAN_FRAG,
  uniforms: {
    uSun: U_SUN,
    uNight: { value: new THREE.Color('#0d1d38') },
    uDay: { value: new THREE.Color('#16376a') },
    uRim: { value: new THREE.Color(CYAN) },
  },
});

const DOT_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: SURFACE_VERT,
  fragmentShader: DOT_FRAG,
  uniforms: {
    uSun: U_SUN,
    uNight: { value: new THREE.Color('#5ba6dc') },
    uDay: { value: new THREE.Color(CYAN) },
    uHot: { value: new THREE.Color('#c9f1ff') },
  },
  transparent: true,
  depthWrite: false,
});
// three-globe při přepočtu vrstvy zapisuje do material.color — ať má kam
(DOT_MATERIAL as unknown as { color: THREE.Color }).color = new THREE.Color(CYAN);

/** Knihovní koule se nekreslí vůbec; oceán je vlastní mesh ve stejné soustavě jako tečky. */
const HIDDEN_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface GeoFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** Načti countries.geojson jednou; při chybě se glóbus vykreslí bez pevnin. */
function useCountries(): GeoFeature[] {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/countries.geojson')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('geojson'))))
      .then((json: { features?: GeoFeature[] }) => { if (alive && Array.isArray(json.features)) setFeatures(json.features); })
      .catch(() => { /* bez pevnin */ });
    return () => { alive = false; };
  }, []);
  return features;
}

/* ── kompozice podle velikosti okna ──────────────────────────────────────── */

interface Framing { scale: number; tilt: number; phone: boolean }

function useFraming(): Framing {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const w = useThree(s => s.size.width);
  const h = useThree(s => s.size.height);
  const aspect = w / Math.max(1, h);
  const phone = aspect < 0.8 || w < 720;
  // D = průměr glóbu jako podíl výšky okna, (cx, cy) = střed glóbu na obrazovce
  const f = phone
    ? { D: Math.min(0.62, 1.35 * aspect), cx: 0.62, cy: 0.7, tilt: 0.7 }
    : w < 1280
      ? { D: Math.min(0.68, 0.46 * aspect), cx: 0.74, cy: 0.5, tilt: 0.58 }
      : { D: Math.min(0.8, 0.5 * aspect), cx: 0.71, cy: 0.48, tilt: 0.58 };
  const { cx, cy } = f;

  useLayoutEffect(() => {
    camera.setViewOffset(w, h, (0.5 - cx) * w, (0.5 - cy) * h, w, h);
    camera.updateProjectionMatrix();
    return () => { camera.clearViewOffset(); camera.updateProjectionMatrix(); };
  }, [camera, w, h, cx, cy]);

  // kamera 280 daleko, fov 40° → škála, při které má silueta průměr D výšky okna
  return { scale: 2.8 * Math.sin(Math.atan(f.D * Math.tan(Math.PI / 9))), tilt: f.tilt, phone };
}

/* ── hodiny trhů: skutečný čas, nebo zrychlená ukázka ────────────────────── */

const sunTmp = new THREE.Vector3();

function useMarketClock(still: boolean) {
  const [mask, setMask] = useState(() => openMask(new Date()));
  const clock = useRef({ lapse: false, base: 0, sim: 0, sinceTick: 99, sinceCheck: 0, started: false });

  useFrame((_, rawDelta) => {
    const c = clock.current;
    const delta = Math.min(rawDelta, 0.1);
    if (!c.started) {
      c.started = true;
      const now = new Date();
      c.lapse = !still && !marketsActiveSoon(now);
      c.base = lastWeekdayStart(now);
      c.sim = 7 * 3_600_000; // ukázka začíná ráno evropského času
    }
    if (c.lapse) c.sim = (c.sim + (delta * 86_400_000) / LAPSE_DAY_SECONDS) % 86_400_000;

    c.sinceTick += delta;
    if (c.sinceTick < (c.lapse ? 0.12 : 2)) return;
    c.sinceTick = 0;

    // jednou za minutu ověř, jestli se mezitím neotevřel skutečný trh (nebo nezavřel poslední)
    c.sinceCheck += 1;
    if (!still && c.sinceCheck > (c.lapse ? 500 : 30)) {
      c.sinceCheck = 0;
      const now = new Date();
      c.lapse = !marketsActiveSoon(now);
      c.base = lastWeekdayStart(now);
    }

    const date = new Date(c.lapse ? c.base + c.sim : Date.now());
    const sun = subsolarPoint(date);
    U_SUN.value.copy(polar(sun.lat, sun.lng, sunTmp));
    const next = openMask(date);
    setMask(prev => (prev === next ? prev : next));
    setGlobeStatus({ open: countOpen(next), total: EXCHANGES.length, lapse: c.lapse, time: pragueTime(date) });
  });

  useEffect(() => () => setGlobeStatus(null), []);
  return mask;
}

/* ── hvězdy ──────────────────────────────────────────────────────────────── */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Stars({ count }: { count: number }) {
  const groupRef = useRef<THREE.Points>(null);
  const pointer = useThree(s => s.pointer);
  const geometry = useMemo(() => {
    const rnd = mulberry32(0x5eed1234);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 520 + rnd() * 380; // daleko za glóbem
      const theta = Math.acos(2 * rnd() - 1);
      const phi = rnd() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      pos[i * 3 + 2] = -Math.abs(r * Math.cos(theta)) - 60; // jen za rovinou glóbu
      seed[i] = 0.25 + rnd() * 0.75;
      size[i] = 1.4 + rnd() * rnd() * 3.2;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({ uTime: U_TIME, uPixel: U_PIXEL, uColor: { value: new THREE.Color('#cfe9f7') } }), []);

  // nepatrný posun hvězd za ukazatelem → hloubka
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.x += (pointer.y * 0.012 - g.rotation.x) * 0.04;
    g.rotation.y += (-pointer.x * 0.012 - g.rotation.y) * 0.04;
  });

  return (
    <points ref={groupRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── atmosféra ───────────────────────────────────────────────────────────── */

function Atmosphere() {
  const uniforms = useMemo(() => ({ uSunWorld: U_SUN_WORLD, uColor: { value: new THREE.Color(CYAN) } }), []);
  return (
    <mesh scale={1.1}>
      <sphereGeometry args={[R, 64, 48]} />
      <shaderMaterial
        vertexShader={ATMO_VERT} fragmentShader={ATMO_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide}
      />
    </mesh>
  );
}

/* ── burzy ───────────────────────────────────────────────────────────────── */

const posTmp = new THREE.Vector3();

function ExchangeLights({ mask }: { mask: number }) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const target = useRef(new Float32Array(EXCHANGES.length));

  const attrs = useMemo(() => {
    const n = EXCHANGES.length;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    EXCHANGES.forEach((e, i) => {
      polar(e.lat, e.lng, posTmp).multiplyScalar(R * 1.012).toArray(pos, i * 3);
      size[i] = e.id === 'PSE' ? 30 : e.tier === 'mega' ? 26 : 18;
      seed[i] = (i * 0.618) % 1;
    });
    return { pos, size, seed, open: new Float32Array(n) };
  }, []);

  useEffect(() => {
    for (let i = 0; i < EXCHANGES.length; i++) target.current[i] = (mask >> i) & 1;
  }, [mask]);

  // plynulý přechod zavřeno ↔ otevřeno (≈ 0,6 s)
  useFrame((_, delta) => {
    const attr = geomRef.current?.getAttribute('aOpen') as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    const k = Math.min(1, delta * 4);
    let changed = false;
    for (let i = 0; i < arr.length; i++) {
      const d = target.current[i] - arr[i];
      if (Math.abs(d) > 0.002) { arr[i] += d * k; changed = true; }
    }
    if (changed) attr.needsUpdate = true;
  });

  const uniforms = useMemo(() => ({
    uTime: U_TIME,
    uPixel: U_PIXEL,
    uOpenHalo: { value: new THREE.Color(GREEN) },
    uOpenCore: { value: new THREE.Color('#eafff6') },
    uClosed: { value: new THREE.Color('#4aa3cf') },
  }), []);

  return (
    <points frustumCulled={false} renderOrder={3}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[attrs.pos, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[attrs.size, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[attrs.seed, 1]} />
        <bufferAttribute attach="attributes-aOpen" args={[attrs.open, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={EXCH_VERT} fragmentShader={EXCH_FRAG} uniforms={uniforms}
        transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── popisky měst (sprite s textem z canvasu) ────────────────────────────── */

const LABELED = EXCHANGES.map((e, i) => ({ e, i })).filter(x => x.e.label);
const LABEL_W = 256;
const LABEL_H = 64;

function makeLabel(text: string, align: 'left' | 'right'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_W * 2;
  canvas.height = LABEL_H * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(2, 2);
    ctx.font = "600 30px 'Hanken Grotesk Variable', 'Hanken Grotesk', system-ui, sans-serif";
    ctx.textBaseline = 'middle';
    ctx.textAlign = align === 'right' ? 'left' : 'right';
    ctx.shadowColor = 'rgba(4, 10, 20, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, align === 'right' ? 22 : LABEL_W - 22, LABEL_H / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const OPEN_TINT = new THREE.Color('#d6ffee');
const CLOSED_TINT = new THREE.Color('#9fbcdc');
const worldTmp = new THREE.Vector3();
const centerTmp = new THREE.Vector3();

function Labels({ mask }: { mask: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree(s => s.camera);
  const sprites = useMemo(() => LABELED.map(({ e, i }) => {
    const material = new THREE.SpriteMaterial({ map: makeLabel(e.city, e.label ?? 'right'), transparent: true, depthWrite: false, depthTest: false, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(e.label === 'left' ? 1 : 0, 0.5);
    sprite.scale.set(30, 7.5, 1);
    sprite.position.copy(polar(e.lat, e.lng, new THREE.Vector3()).multiplyScalar(R * 1.03));
    sprite.renderOrder = 4;
    sprite.userData.index = i;
    return sprite;
  }), []);

  useEffect(() => () => {
    for (const s of sprites) { s.material.map?.dispose(); s.material.dispose(); }
  }, [sprites]);

  useEffect(() => {
    for (const s of sprites) s.material.color.copy((mask >> (s.userData.index as number)) & 1 ? OPEN_TINT : CLOSED_TINT);
  }, [mask, sprites]);

  // popisek je vidět jen na přivrácené straně; k okraji koule mizí
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.getWorldPosition(centerTmp);
    for (const child of g.children) {
      const s = child as THREE.Sprite;
      s.getWorldPosition(worldTmp);
      const nx = worldTmp.x - centerTmp.x, ny = worldTmp.y - centerTmp.y, nz = worldTmp.z - centerTmp.z;
      const vx = camera.position.x - worldTmp.x, vy = camera.position.y - worldTmp.y, vz = camera.position.z - worldTmp.z;
      const facing = (nx * vx + ny * vy + nz * vz) / (Math.hypot(nx, ny, nz) * Math.hypot(vx, vy, vz) || 1);
      s.material.opacity = THREE.MathUtils.smoothstep(facing, 0.42, 0.68) * 0.92;
    }
  });

  return (
    <group ref={groupRef}>
      {sprites.map(s => <primitive key={s.userData.index as number} object={s} />)}
    </group>
  );
}

/* ── glóbus ──────────────────────────────────────────────────────────────── */

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function GlobeBody({ still, paused, detail }: { still: boolean; paused: boolean; detail: 'full' | 'lite' }) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const motion = useRef({ yaw: REST_YAW, intro: still ? 1 : 0, ready: still, dragging: false, pitch: 0, yawVel: 0, sway: 0 });
  const features = useCountries();
  const size = useThree(s => s.size);
  const gl = useThree(s => s.gl);
  const pointer = useThree(s => s.pointer);
  const camera = useThree(s => s.camera);
  const framing = useFraming();
  const mask = useMarketClock(still);

  useLayoutEffect(() => { U_PIXEL.value = Math.max(0.8, size.height / 900) * Math.min(gl.getPixelRatio(), 1.5); }, [size.height, gl]);

  const rendererSize = useMemo(() => new THREE.Vector2(size.width, size.height), [size.width, size.height]);

  // trasy: slabá stálá síť + pulzy tam, kde jsou otevřené oba konce
  const arcsData = useMemo(() => {
    const live = ARCS.pulses.filter(p => (mask >> p.a) & 1 && (mask >> p.b) & 1);
    const pulses = detail === 'lite' ? live.slice(0, 8) : live;
    return still ? ARCS.tracks : [...ARCS.tracks, ...pulses];
  }, [mask, still, detail]);

  const ringsData = useMemo(
    () => (still ? [] : EXCHANGES.filter((e, i) => e.tier === 'mega' && (mask >> i) & 1)),
    [mask, still],
  );

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (paused || still) g.pauseAnimation();
    else g.resumeAnimation();
  }, [paused, still, features]);

  useEffect(() => { globeRef.current?.setPointOfView(camera); }, [camera]);

  // Tečky pevnin staví knihovna (jeden mesh na stát, Lambert). Přehodíme jim sdílený
  // shader s denním/nočním světlem. Vrstva vzniká asynchronně → krátké opakování.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const apply = () => {
      let found = 0;
      wrap.traverse(obj => {
        if ((obj as { __globeObjType?: string }).__globeObjType !== 'hexPolygon') return;
        const mesh = obj as THREE.Mesh;
        if (mesh.material !== DOT_MATERIAL) {
          const old = mesh.material;
          mesh.material = DOT_MATERIAL;
          (Array.isArray(old) ? old : [old]).forEach(m => m?.dispose());
        }
        mesh.renderOrder = 1;
        found++;
      });
      if (features.length > 0 && found > 0) { motion.current.ready = true; return; }
      if (tries++ < 60) timer = setTimeout(apply, 50);
      else motion.current.ready = true; // bez pevnin (geojson selhal) — úvod pustíme i tak
    };
    apply();
    return () => { if (timer) clearTimeout(timer); };
  }, [features]);

  useFrame((_, rawDelta) => {
    const m = motion.current;
    const delta = Math.min(rawDelta, 0.05);
    const spin = spinRef.current;
    const tilt = tiltRef.current;
    const scale = scaleRef.current;
    if (!spin || !tilt || !scale) return;

    if (!still && !paused) {
      U_TIME.value += delta;
      if (m.ready && m.intro < 1) m.intro = Math.min(1, m.intro + delta / INTRO_SECONDS);
      if (!m.dragging) {
        // po úvodu se glóbus pomalu kývá; po tažení myší se k tomu pohybu plynule vrátí
        if (m.intro >= 1) m.sway += delta;
        const target = REST_YAW - SWAY_ANGLE * Math.sin((m.sway * 2 * Math.PI) / SWAY_SECONDS);
        m.yaw += m.yawVel;
        m.yawVel *= 0.92;
        m.yaw += (target - m.yaw) * Math.min(1, delta * 0.9);
        m.pitch *= 0.96;
      }
    }

    const e = easeOutExpo(m.intro);
    spin.rotation.y = m.yaw - (1 - e) * INTRO_SWEEP;
    scale.scale.setScalar(framing.scale * (0.86 + 0.14 * e));
    // náklon osy + jemný náklon za ukazatelem + náklon z tažení
    const px = still ? 0 : pointer.y * -0.05;
    const py = still ? 0 : pointer.x * 0.05;
    tilt.rotation.x += (framing.tilt + px + m.pitch - tilt.rotation.x) * 0.08;
    tilt.rotation.y += (py - tilt.rotation.y) * 0.08;

    U_SUN_WORLD.value.copy(U_SUN.value).transformDirection(spin.matrixWorld);
  });

  // Tažení myší: vodorovně otáčí, svisle naklání (s omezením). Dotyk necháváme stránce na scroll.
  useEffect(() => {
    const el = gl.domElement;
    const last = { x: 0, y: 0 };
    const m = motion.current;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      m.dragging = true;
      m.yawVel = 0;
      last.x = e.clientX;
      last.y = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      // tlačítko puštěné mimo okno → tažení skončilo, i když pointerup nedorazil
      if (m.dragging && e.buttons === 0) m.dragging = false;
      if (!m.dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      m.yaw += dx * 0.0032;
      m.yawVel = dx * 0.0032;
      m.pitch = THREE.MathUtils.clamp(m.pitch + dy * 0.0032, -0.5, 0.5);
    };
    const onUp = () => { m.dragging = false; };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [gl]);

  return (
    <group ref={scaleRef}>
      <Atmosphere />
      <group ref={tiltRef} rotation={[framing.tilt, 0, 0]}>
        <group rotation={[0, 0, -0.1]}>
          <group ref={spinRef} rotation={[0, REST_YAW - (still ? 0 : INTRO_SWEEP), 0]}>
            <mesh material={OCEAN_MATERIAL}>
              <sphereGeometry args={[R, 96, 64]} />
            </mesh>
            <group ref={wrapRef}>
              <R3fGlobe
                ref={globeRef}
                rendererSize={rendererSize}
                globeMaterial={HIDDEN_MATERIAL}
                animateIn={false}
                waitForGlobeReady={false}
                showAtmosphere={false}
                showGraticules={false}
                hexPolygonsData={features}
                hexPolygonUseDots
                hexPolygonResolution={detail === 'lite' || LOW_PERF ? 3 : 4}
                hexPolygonDotResolution={detail === 'lite' || LOW_PERF ? 6 : 12}
                hexPolygonMargin={0.46}
                hexPolygonAltitude={0.008}
                hexPolygonColor={HEX_COLOR}
                hexPolygonsTransitionDuration={0}
                arcsData={arcsData}
                arcColor={arcColor}
                arcAltitude={arcAlt}
                arcStroke={arcStroke}
                arcCurveResolution={48}
                arcCircularResolution={4}
                arcDashLength={still ? arcSolidLen : arcDashLen}
                arcDashGap={still ? arcStill : arcDashGap}
                arcDashInitialGap={arcGap}
                arcDashAnimateTime={still ? arcStill : arcTime}
                arcsTransitionDuration={still ? 0 : 700}
                ringsData={ringsData}
                ringColor={ringColor}
                ringLat={ringLat}
                ringLng={ringLng}
                ringAltitude={0.012}
                ringMaxRadius={5}
                ringPropagationSpeed={2.2}
                ringRepeatPeriod={2400}
                ringResolution={48}
              />
            </group>
            <ExchangeLights mask={mask} />
            {detail === 'full' && !framing.phone && <Labels mask={mask} />}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ── HeroScene — Canvas wrapper (kontrakt viz HeroSection) ───────────────── */

export function HeroScene({ particleCount = 2400, paused = false }: SceneProps) {
  const still = usePrefersReducedMotion();
  const detail = particleCount < 2000 ? 'lite' : 'full';

  return (
    <Canvas
      // near/far těsně kolem scény → tečky 0,8 jednotky nad koulí se s ní neperou o hloubku
      camera={{ position: [0, 0, 280], fov: 40, near: 20, far: 1500 }}
      dpr={LOW_PERF ? 1 : [1, 1.5]}
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: !LOW_PERF, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', position: 'absolute', inset: 0 }}
    >
      <Stars count={Math.round(particleCount / 4)} />
      <GlobeBody still={still} paused={paused} detail={detail} />
    </Canvas>
  );
}
