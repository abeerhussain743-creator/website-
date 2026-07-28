"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function NetworkGraph({
  mouse,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => {
    const list: { pos: THREE.Vector3; color: string; size: number }[] = [];
    const colors = ["#4F8CFF", "#2DD4FF", "#6E5BFF", "#A855F7", "#9ec5ff"];
    for (let i = 0; i < 28; i++) {
      const phi = Math.acos(-1 + (2 * i) / 28);
      const theta = Math.sqrt(28 * Math.PI) * phi;
      const r = 1.6 + (i % 4) * 0.15;
      list.push({
        pos: new THREE.Vector3(
          r * Math.cos(theta) * Math.sin(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(phi)
        ),
        color: colors[i % colors.length],
        size: 0.05 + (i % 3) * 0.02,
      });
    }
    return list;
  }, []);

  const lines = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].pos.distanceTo(nodes[j].pos) < 1.35) {
          positions.push(
            nodes[i].pos.x,
            nodes[i].pos.y,
            nodes[i].pos.z,
            nodes[j].pos.x,
            nodes[j].pos.y,
            nodes[j].pos.z
          );
        }
      }
    }
    return new Float32Array(positions);
  }, [nodes]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = t * 0.12 + mouse.current.x * 0.4;
    group.current.rotation.x = 0.25 + mouse.current.y * 0.25;
  });

  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#4F8CFF" transparent opacity={0.35} />
      </lineSegments>
      {nodes.map((n, i) => (
        <Float key={i} speed={1 + (i % 3) * 0.3} floatIntensity={0.4}>
          <mesh position={n.pos}>
            <sphereGeometry args={[n.size, 16, 16]} />
            <meshStandardMaterial
              color={n.color}
              emissive={n.color}
              emissiveIntensity={0.7}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
        </Float>
      ))}
      <mesh>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color="#2DD4FF"
          emissive="#4F8CFF"
          emissiveIntensity={0.5}
          wireframe
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

export function EcosystemScene() {
  const mouse = useRef({ x: 0, y: 0 });
  return (
    <div
      className="h-[360px] w-full md:h-[480px]"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouse.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouse.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 2, 4]} color="#4F8CFF" intensity={20} />
        <pointLight position={[-3, -2, 2]} color="#A855F7" intensity={12} />
        <NetworkGraph mouse={mouse} />
      </Canvas>
    </div>
  );
}
