"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hash01 } from "@/lib/client";
import type { SourceId } from "@/lib/types";

export interface Signal {
  id: string;
  source: SourceId;
}

// Validated categorical slots (dark-surface steps), fixed per source.
const SOURCE_HEX: Record<SourceId, string> = {
  bluesky: "#3987e5",
  reddit: "#d95926",
  stackexchange: "#199e70",
  hackernews: "#c98500",
};

const AMBER = new THREE.Color("#f2a33a");

function onSphere(lat: number, lon: number, r = 1): THREE.Vector3 {
  return new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon));
}

function signalPosition(id: string, r = 1.006): THREE.Vector3 {
  const lat = Math.asin(2 * hash01(id + "lat") - 1);
  const lon = hash01(id + "lon") * Math.PI * 2;
  return onSphere(lat, lon, r);
}

function DotSphere({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pos.set([Math.cos(theta) * rad, y, Math.sin(theta) * rad], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  return (
    <points geometry={geometry}>
      <pointsMaterial color={AMBER} size={0.014} sizeAttenuation transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Latitudes() {
  const lines = useMemo(
    () =>
      [-0.6, -0.3, 0, 0.3, 0.6].map((lat) => {
        const pts = Array.from({ length: 97 }, (_, i) => onSphere(lat, (i / 96) * Math.PI * 2, 1.001));
        return new THREE.BufferGeometry().setFromPoints(pts);
      }),
    []
  );
  return (
    <>
      {lines.map((g, i) => (
        <lineLoop key={i} geometry={g}>
          <lineBasicMaterial color={AMBER} transparent opacity={0.07} />
        </lineLoop>
      ))}
    </>
  );
}

function SignalMark({ signal, index }: { signal: Signal; index: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const dot = useRef<THREE.Mesh>(null);
  const born = useRef<number | null>(null);
  const position = useMemo(() => signalPosition(signal.id), [signal.id]);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize()),
    [position]
  );
  const color = SOURCE_HEX[signal.source];
  const phase = (index % 9) * 0.37;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (born.current === null) born.current = t;
    const age = Math.min(1, (t - born.current) / 0.6);
    if (dot.current) dot.current.scale.setScalar(age);
    if (ring.current) {
      const k = ((t + phase) % 2.4) / 2.4;
      ring.current.scale.setScalar(1 + k * 2.4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8 * age;
    }
  });

  return (
    <group position={position} quaternion={quaternion}>
      <mesh ref={dot}>
        <circleGeometry args={[0.02, 20]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.024, 0.03, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Glow() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, "rgba(232, 87, 42, 0.45)");
    g.addColorStop(0.45, "rgba(232, 87, 42, 0.12)");
    g.addColorStop(1, "rgba(232, 87, 42, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <sprite scale={[2.7, 2.7, 1]} position={[0, 0, -0.6]}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

function Scene({
  signals,
  speed,
  drag,
}: {
  signals: Signal[];
  speed: number;
  drag: React.MutableRefObject<{ vx: number; vy: number; active: boolean }>;
}) {
  const group = useRef<THREE.Group>(null);
  const count = typeof window !== "undefined" && window.innerWidth < 640 ? 700 : 1600;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = drag.current;
    g.rotation.y += delta * speed + d.vx;
    g.rotation.x = THREE.MathUtils.clamp(g.rotation.x + d.vy, -0.7, 0.7);
    // Ease drag momentum out, and tilt gently toward the pointer when idle.
    d.vx *= 0.92;
    d.vy *= 0.92;
    if (!d.active) g.rotation.x += (state.pointer.y * 0.25 - g.rotation.x) * 0.02;
  });

  return (
    <>
      <Glow />
      <group ref={group} rotation={[0.35, 0, 0.12]}>
        <DotSphere count={count} />
        <Latitudes />
        {signals.map((s, i) => (
          <SignalMark key={s.id} signal={s} index={i} />
        ))}
      </group>
    </>
  );
}

export default function SignalGlobe({ signals, scanning = false }: { signals: Signal[]; scanning?: boolean }) {
  const drag = useRef({ vx: 0, vy: 0, active: false });
  const last = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="globe-canvas"
      onPointerDown={(e) => {
        drag.current.active = true;
        last.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current.active || !last.current) return;
        drag.current.vx = (e.clientX - last.current.x) * 0.004;
        drag.current.vy = (e.clientY - last.current.y) * 0.004;
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => {
        drag.current.active = false;
        last.current = null;
      }}
      onPointerCancel={() => {
        drag.current.active = false;
        last.current = null;
      }}
    >
      <Canvas camera={{ position: [0, 0, 2.9], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <Scene signals={signals} speed={scanning ? 0.55 : 0.12} drag={drag} />
      </Canvas>
    </div>
  );
}
