"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line } from "@react-three/drei";
import {
  Suspense,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

type Phase = "chaos" | "pipelines" | "unify" | "growth";

type AutomationCoreProps = {
  scrollProgress?: number;
  className?: string;
  interactive?: boolean;
  density?: "full" | "lite";
};

const NODE_LABELS = [
  "CRM",
  "Shopify",
  "Gmail",
  "Slack",
  "Database",
  "Payments",
  "APIs",
  "Models",
  "Customers",
  "Workflows",
];

function phaseFromProgress(p: number): { phase: Phase; t: number } {
  if (p < 0.25) return { phase: "chaos", t: p / 0.25 };
  if (p < 0.5) return { phase: "pipelines", t: (p - 0.25) / 0.25 };
  if (p < 0.75) return { phase: "unify", t: (p - 0.5) / 0.25 };
  return { phase: "growth", t: (p - 0.75) / 0.25 };
}

function nodePositions(phase: Phase, t: number, count: number) {
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    let radius = 2.35;
    let y = Math.sin(a * 2) * 0.55;
    let x = Math.cos(a) * radius;
    let z = Math.sin(a) * radius;

    if (phase === "chaos") {
      const jitter = 0.55 * (1 - t);
      x += Math.sin(i * 12.1) * jitter;
      y += Math.cos(i * 7.3) * jitter;
      z += Math.sin(i * 4.8) * jitter;
    } else if (phase === "pipelines") {
      const lane = i % 3;
      const slot = Math.floor(i / 3);
      x = (lane - 1) * 1.6;
      y = 1.4 - slot * 0.85;
      z = -0.4 + lane * 0.2;
      const blend = t;
      const orbitX = Math.cos(a) * radius;
      const orbitZ = Math.sin(a) * radius;
      x = orbitX * (1 - blend) + x * blend;
      y = Math.sin(a * 2) * 0.55 * (1 - blend) + y * blend;
      z = orbitZ * (1 - blend) + z * blend;
    } else if (phase === "unify") {
      radius = 2.35 - t * 0.55;
      x = Math.cos(a) * radius;
      z = Math.sin(a) * radius;
      y = Math.sin(a * 3) * 0.25 * (1 - t);
    } else {
      radius = 1.8 + t * 0.35;
      x = Math.cos(a) * radius;
      z = Math.sin(a) * radius;
      y = Math.sin(a * 2 + t) * 0.2;
    }

    positions.push(new THREE.Vector3(x, y, z));
  }
  return positions;
}

function DataParticle({
  start,
  end,
  speed,
  offset,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  speed: number;
  offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const u = ((clock.elapsedTime * speed + offset) % 1 + 1) % 1;
    ref.current.position.lerpVectors(start, end, u);
    const s = 0.035 + Math.sin(u * Math.PI) * 0.03;
    ref.current.scale.setScalar(s);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#9ad4ef" transparent opacity={0.9} />
    </mesh>
  );
}

function CoreScene({
  scrollProgress,
  density,
  mouse,
}: {
  scrollProgress: number;
  density: "full" | "lite";
  mouse: MutableRefObject<{ x: number; y: number }>;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const count = density === "lite" ? 6 : 10;

  const { phase, t } = phaseFromProgress(scrollProgress);
  const positions = useMemo(
    () => nodePositions(phase, t, count),
    [phase, t, count],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      mouse.current.y * 0.18,
      0.05,
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      mouse.current.x * 0.08,
      0.05,
    );

    if (core.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.04;
      core.current.scale.setScalar(pulse);
    }

    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      7.2 - mouse.current.y * 0.35 - scrollProgress * 0.6,
      0.05,
    );
  });

  const connections = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    positions.forEach((p) => lines.push([new THREE.Vector3(0, 0, 0), p]));
    for (let i = 0; i < positions.length; i++) {
      const next = positions[(i + 1) % positions.length];
      if (phase !== "pipelines") lines.push([positions[i], next]);
      if (phase === "pipelines" && i % 3 !== 2 && i + 1 < positions.length) {
        lines.push([positions[i], positions[i + 1]]);
      }
    }
    return lines;
  }, [positions, phase]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 5]} intensity={1.2} color="#9ad4ef" />
      <pointLight position={[-4, -2, -3]} intensity={0.55} color="#4a7fa0" />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
        <group ref={group}>
          <mesh ref={core}>
            <icosahedronGeometry args={[0.55, 1]} />
            <meshStandardMaterial
              color="#0e1822"
              emissive="#6eb8e0"
              emissiveIntensity={0.55}
              metalness={0.85}
              roughness={0.25}
              wireframe={false}
            />
          </mesh>
          <mesh>
            <icosahedronGeometry args={[0.72, 1]} />
            <meshBasicMaterial
              color="#6eb8e0"
              wireframe
              transparent
              opacity={0.28}
            />
          </mesh>

          {positions.map((pos, i) => (
            <group key={NODE_LABELS[i] ?? i} position={pos.toArray()}>
              <mesh>
                <octahedronGeometry args={[0.14, 0]} />
                <meshStandardMaterial
                  color="#d7e8f4"
                  emissive="#6eb8e0"
                  emissiveIntensity={0.35}
                  metalness={0.6}
                  roughness={0.3}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshBasicMaterial
                  color="#6eb8e0"
                  transparent
                  opacity={0.08}
                />
              </mesh>
            </group>
          ))}

          {connections.map(([a, b], idx) => (
            <Line
              key={`line-${idx}`}
              points={[a, b]}
              color="#6eb8e0"
              lineWidth={1}
              transparent
              opacity={0.28 + (phase === "unify" || phase === "growth" ? 0.2 : 0)}
            />
          ))}

          {density === "full"
            ? connections.slice(0, 12).map(([a, b], idx) => (
                <DataParticle
                  key={`p-${idx}`}
                  start={a}
                  end={b}
                  speed={0.18 + (idx % 5) * 0.04}
                  offset={idx * 0.12}
                />
              ))
            : null}
        </group>
      </Float>
    </>
  );
}

export function AutomationCore({
  scrollProgress = 0,
  className,
  interactive = true,
  density = "full",
}: AutomationCoreProps) {
  const mouse = useRef({ x: 0, y: 0 });

  return (
    <div
      className={className}
      onPointerMove={
        interactive
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              mouse.current.x =
                ((e.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.current.y =
                -(((e.clientY - rect.top) / rect.height) * 2 - 1);
            }
          : undefined
      }
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 7.2], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          premultipliedAlpha: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Suspense fallback={null}>
          <CoreScene
            scrollProgress={scrollProgress}
            density={density}
            mouse={mouse}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
