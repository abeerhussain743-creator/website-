"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";

function AICore({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.15 + mouse.current.x * 0.35;
      group.current.rotation.x = mouse.current.y * 0.25 + Math.sin(t * 0.4) * 0.08;
    }
    if (core.current) {
      core.current.rotation.y = t * 0.4;
      core.current.rotation.z = t * 0.15;
    }
    if (ring1.current) ring1.current.rotation.z = t * 0.55;
    if (ring2.current) ring2.current.rotation.x = t * 0.35;
  });

  const particles = useMemo(() => {
    const pts = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const r = 2.2 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pts[i * 3 + 2] = r * Math.cos(phi);
    }
    return pts;
  }, []);

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.6}>
        <Sphere ref={core} args={[1.05, 64, 64]}>
          <MeshDistortMaterial
            color="#4F8CFF"
            emissive="#2DD4FF"
            emissiveIntensity={0.45}
            roughness={0.15}
            metalness={0.85}
            distort={0.35}
            speed={2.2}
          />
        </Sphere>
        <Sphere args={[1.25, 32, 32]}>
          <meshBasicMaterial color="#2DD4FF" transparent opacity={0.08} wireframe />
        </Sphere>
      </Float>

      <mesh ref={ring1} rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[1.85, 0.018, 16, 120]} />
        <meshStandardMaterial
          color="#2DD4FF"
          emissive="#2DD4FF"
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={ring2} rotation={[0.4, 0.6, Math.PI / 3]}>
        <torusGeometry args={[2.25, 0.012, 16, 140]} />
        <meshStandardMaterial
          color="#6E5BFF"
          emissive="#6E5BFF"
          emissiveIntensity={0.7}
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>

      <mesh rotation={[-0.5, 0.2, 0.8]}>
        <torusGeometry args={[2.55, 0.008, 12, 160]} />
        <meshStandardMaterial
          color="#A855F7"
          emissive="#A855F7"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#9ec5ff"
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function SceneLights() {
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!light.current) return;
    const t = state.clock.getElapsedTime();
    light.current.intensity = 28 + Math.sin(t * 1.5) * 6;
    light.current.position.x = Math.sin(t * 0.5) * 2;
    light.current.position.y = Math.cos(t * 0.4) * 1.5;
  });
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight ref={light} position={[2, 2, 3]} color="#4F8CFF" intensity={28} />
      <pointLight position={[-3, -1, 2]} color="#A855F7" intensity={14} />
      <pointLight position={[0, -2, 4]} color="#2DD4FF" intensity={10} />
    </>
  );
}

export function HeroScene() {
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
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <SceneLights />
        <Stars radius={40} depth={30} count={1200} factor={2.5} saturation={0} fade speed={0.6} />
        <AICore mouse={mouse} />
        <fog attach="fog" args={["#06070A", 8, 18]} />
      </Canvas>
    </div>
  );
}
