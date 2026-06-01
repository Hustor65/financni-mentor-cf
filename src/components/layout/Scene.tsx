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

/* ── Finanční burzy (huby) ───────────────────────────────────────────────── */
interface Hub {
  name: string;
  lat: number;
  lng: number;
}
const HUBS: Hub[] = [
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'London', lat: 51.51, lng: -0.09 },
  { name: 'Frankfurt', lat: 50.11, lng: 8.67 },
  { name: 'Zurich', lat: 47.37, lng: 8.54 },
  { name: 'Tokyo', lat: 35.68, lng: 139.77 },
  { name: 'Hong Kong', lat: 22.28, lng: 114.16 },
  { name: 'Shanghai', lat: 31.23, lng: 121.47 },
  { name: 'Singapore', lat: 1.28, lng: 103.86 },
  { name: 'Sydney', lat: -33.86, lng: 151.21 },
  { name: 'São Paulo', lat: -23.55, lng: -46.64 },
];
const hub = (n: string): Hub => {
  const h = HUBS.find((x) => x.name === n);
  if (!h) throw new Error(`hub ${n} not found`);
  return h;
};

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}
const toArc = ([a, b]: [Hub, Hub]): ArcDatum => ({
  startLat: a.lat,
  startLng: a.lng,
  endLat: b.lat,
  endLng: b.lng,
});
/* Mezikontinentální koridory burz (9 oblouků). */
const ARC_PAIRS: [Hub, Hub][] = [
  [hub('New York'), hub('London')],
  [hub('London'), hub('Frankfurt')],
  [hub('Frankfurt'), hub('Zurich')],
  [hub('London'), hub('Tokyo')],
  [hub('Tokyo'), hub('Hong Kong')],
  [hub('Hong Kong'), hub('Shanghai')],
  [hub('Hong Kong'), hub('Singapore')],
  [hub('Singapore'), hub('Sydney')],
  [hub('New York'), hub('São Paulo')],
];
const ARCS: ArcDatum[] = ARC_PAIRS.map(toArc);

/* Markery = body na všech hubech (drobné azurové tečky). */
const POINTS = HUBS.map((h) => ({ lat: h.lat, lng: h.lng }));

/* Azurový gradient pro oblouky (průhledný → azur → průhledný = putující pulz). */
const ARC_COLOR: string[] = ['rgba(58,181,224,0)', CYAN, 'rgba(58,181,224,0)'];

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
  // fBm (4 oktávy)
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
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
      {/* daleká hustá vrstva — bez drei twinkle (speed=0), vlastní jemný drift děláme my */}
      <Stars
        radius={300}
        depth={60}
        count={3500}
        factor={2.5}
        saturation={0.15}
        fade
        speed={0}
      />
      {/* bližší řidší vrstva pro hloubku */}
      <Stars radius={320} depth={40} count={500} factor={4} saturation={0} fade speed={0} />
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
      uOpacity: { value: 0.17 }, // subtle azurový lem
      uPower: { value: 3.2 },
    }),
    [color],
  );
  return (
    <mesh scale={1.018} renderOrder={2}>
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
  const entranceRef = useRef<THREE.Group>(null);
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
  const arcsData = still || arcsReady ? ARCS : [];

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

  // Graceful entrance: škálu skupiny povolíme 0.7→1 (~1 s) přes ref na transformu.
  // NE traversal hex meshů — animujeme jen jeden group.scale. reduced-motion → rovnou 1.
  const entranceDone = useRef(false);
  useEffect(() => {
    const g = entranceRef.current;
    if (!g) return;
    if (still) {
      g.scale.setScalar(1);
      entranceDone.current = true;
    } else {
      g.scale.setScalar(0.7);
      entranceDone.current = false;
    }
  }, [still]);

  // Auto-rotace + entrance scale — vše v jednom useFrame (žádné alokace/frame).
  useFrame((_, delta) => {
    // entrance: kriticky tlumený lerp k 1 (mutujeme jen group.scale, ne meshe)
    const eg = entranceRef.current;
    if (eg && !entranceDone.current) {
      const s = eg.scale.x + (1 - eg.scale.x) * Math.min(1, delta * 4.5);
      eg.scale.setScalar(s);
      if (s > 0.999) {
        eg.scale.setScalar(1);
        entranceDone.current = true;
      }
    }
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
    <group ref={entranceRef}>
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
              // atmosféra — tlumená (jen měkký objem), siluetu řeší fresnel lem
              showAtmosphere
              atmosphereColor={accentColor}
              atmosphereAltitude={0.12}
              // graticule (lat/lon mřížka, Cloudflare-style) — efekt jí dá depthTest:false
              // → prosvítá i na odvrácenou stranu; barvu/opacitu zjemní taktéž efekt
              showGraticules
              // tečkované kontinenty (knihovna čte `geometry` atribut Featur z GeoJSONu)
              hexPolygonsData={features}
              hexPolygonUseDots
              hexPolygonResolution={4}
              hexPolygonMargin={0.4}
              hexPolygonAltitude={0.005}
              hexPolygonColor={() => 'rgba(58,181,224,0.6)'}
              hexPolygonsTransitionDuration={0}
              // oblouky burz (azurový pulz) — „nakreslí se“ při příchodu
              arcsData={arcsData}
              arcColor={() => ARC_COLOR}
              arcAltitudeAutoScale={0.42}
              arcStroke={0.32}
              arcCurveResolution={64}
              arcCircularResolution={6}
              arcDashLength={0.42}
              arcDashGap={1.4}
              arcDashAnimateTime={still ? 0 : 2000}
              arcsTransitionDuration={still ? 0 : 2000}
              // markery = drobné azurové body
              pointsData={POINTS}
              pointColor={() => accentColor}
              pointAltitude={0.012}
              pointRadius={0.34}
              pointResolution={10}
              pointsMerge
            />
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
      dpr={[1, 1.5]}
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', position: 'absolute', inset: 0 }}
      onCreated={({ camera }) => camera.lookAt(0, -28, 0)}
    >
      {/* osvětlení — MeshPhong povrch + tečky potřebují světlo */}
      <ambientLight intensity={1.6} color="#9fd6f0" />
      <directionalLight position={[-180, 120, 200]} intensity={1.1} color="#cfeeff" />
      <pointLight position={[200, -60, 120]} intensity={0.6} color={accentColor} />

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
