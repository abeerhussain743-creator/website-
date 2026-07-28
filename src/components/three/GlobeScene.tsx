"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { createSeededRandom } from "@/lib/random";

function Globe({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);

  const particlePos = useMemo(() => {
    const rand = createSeededRandom(77);
    const count = 900;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.85 + rand() * 0.35;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.18 + mouse.current.x * 0.4;
      group.current.rotation.x = 0.35 + mouse.current.y * 0.2;
    }
    if (points.current) {
      points.current.rotation.y = -t * 0.08;
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.2} floatIntensity={0.35}>
        <mesh>
          <sphereGeometry args={[1.45, 48, 48]} />
          <meshStandardMaterial
            color="#0A1628"
            emissive="#4F8CFF"
            emissiveIntensity={0.15}
            metalness={0.9}
            roughness={0.25}
            wireframe
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.42, 64, 64]} />
          <meshStandardMaterial
            color="#122038"
            emissive="#2DD4FF"
            emissiveIntensity={0.08}
            metalness={0.7}
            roughness={0.35}
            transparent
            opacity={0.55}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.2, 0.2, 0]}>
          <torusGeometry args={[1.95, 0.012, 12, 120]} />
          <meshStandardMaterial color="#2DD4FF" emissive="#2DD4FF" emissiveIntensity={0.8} />
        </mesh>
        <mesh rotation={[0.3, 0.5, Math.PI / 4]}>
          <torusGeometry args={[2.2, 0.008, 12, 140]} />
          <meshStandardMaterial color="#6E5BFF" emissive="#6E5BFF" emissiveIntensity={0.6} />
        </mesh>
      </Float>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePos, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.025} color="#9ec5ff" transparent opacity={0.8} sizeAttenuation />
      </points>
    </group>
  );
}

export function GlobeScene() {
  const mouse = useRef({ x: 0, y: 0 });
  return (
    <div
      className="absolute inset-0"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouse.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouse.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5.8], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.25} />
        <pointLight position={[3, 2, 4]} color="#4F8CFF" intensity={24} />
        <pointLight position={[-2, -1, 3]} color="#A855F7" intensity={14} />
        <Globe mouse={mouse} />
      </Canvas>
    </div>
  );
}
