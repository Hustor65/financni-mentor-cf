import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, PointMaterial, Points } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  accentColor?: string;
  particleCount?: number;
  paused?: boolean;
}

// Pozice částic se generují MIMO render (Math.random je nečistá funkce) — stabilní napříč rendery.
function makeOrbPositions(count: number): Float32Array {
  const pts = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 2 + Math.random() * 0.3;
    pts[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    pts[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
    pts[i * 3 + 2] = Math.cos(phi) * radius;
  }
  return pts;
}

function makeDataPoints(): Float32Array {
  const pts = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 15;
    pts[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  return pts;
}
const DATA_POINTS = makeDataPoints();

/**
 * FinancialOrb — koule z částic (Fibonacci rozložení).
 * Centrální „kupole" — zářící rotující datová koule.
 */
function FinancialOrb({ color, count }: { color: string; count: number }) {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => makeOrbPositions(count), [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      // frame-rate nezávislá, jemnější rotace (smooth)
      ref.current.rotation.y += delta * 0.04;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
      ref.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.09) * 0.025;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        color={color}
        size={0.015}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </Points>
  );
}

/** InnerGlow — menší jasnější koule uvnitř orbu pro hloubku. */
function InnerGlow({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (ref.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
      ref.current.scale.setScalar(scale);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial color={color} transparent opacity={0.08} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  );
}

/** OrbitalRing — tenký torus prstenec obíhající kolem koule. */
function OrbitalRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.10 + Math.PI / 4;
      ref.current.rotation.z = state.clock.elapsedTime * 0.065;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[2.8, 0.005, 16, 100]} />
      <meshStandardMaterial color={color} transparent opacity={0.4} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

/** FloatingDataPoints — rozptýlené částice (datové fragmenty). */
function FloatingDataPoints({ color }: { color: string }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = DATA_POINTS;
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });
  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        color={color}
        size={0.008}
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </Points>
  );
}

/** HeroScene — Canvas wrapper s celou 3D scénou (1:1 dle originálu). */
export function HeroScene({ accentColor = '#2596be', particleCount = 2400, paused = false }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 55 }}
      dpr={[1, 2]}
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} color={accentColor} intensity={2} distance={20} />
      <pointLight position={[-3, -4, 2]} color="#123A63" intensity={1} distance={15} />

      <Float speed={0.8} rotationIntensity={0.12} floatIntensity={0.4}>
        <group>
          <FinancialOrb color={accentColor} count={particleCount} />
          <InnerGlow color={accentColor} />
          <OrbitalRing color={accentColor} />
        </group>
      </Float>

      <FloatingDataPoints color={accentColor} />

      <Stars radius={80} depth={60} count={2500} factor={3} saturation={0.1} fade speed={0.18} />
    </Canvas>
  );
}
