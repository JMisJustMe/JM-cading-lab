import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA_R, GATE_R, game, settings } from "./world";
import { C, getFloorTexture, getGlowTexture } from "./visuals";

function InstancedRing({
  count,
  radius,
  y,
  geometry,
  material,
  scaleY = 1,
  jitter = 0,
}: {
  count: number;
  radius: number;
  y: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  scaleY?: number;
  jitter?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius + (jitter ? (Math.sin(i * 12.9898) * 0.5 + 0.5) * jitter : 0);
      const sy = scaleY * (jitter ? 0.75 + ((Math.sin(i * 78.233) * 0.5 + 0.5) as number) * 0.7 : 1);
      o.position.set(Math.cos(a) * r, y * sy, Math.sin(a) * r);
      o.rotation.set(0, -a, 0);
      o.scale.set(1, sy, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count, radius, y, scaleY, jitter]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow={false} />;
}

function FluxGate() {
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowTex = useMemo(getGlowTexture, []);

  useFrame((_, dt) => {
    const powered = game.gatePower > 0;
    const t = performance.now() * 0.001;
    if (ringA.current) {
      ringA.current.rotation.z += dt * (powered ? 1.8 : 0.35);
      ringA.current.rotation.x = Math.PI / 2;
    }
    if (ringB.current) ringB.current.rotation.y += dt * (powered ? -2.4 : -0.5);
    if (core.current) {
      const s = powered ? 1 + Math.sin(t * 7) * 0.09 : 0.75 + Math.sin(t * 2) * 0.03;
      core.current.scale.setScalar(s);
      core.current.rotation.y += dt * 0.8;
    }
    if (coreMat.current) {
      coreMat.current.emissiveIntensity = powered ? 3.2 + Math.sin(t * 9) * 0.8 : 0.5;
      coreMat.current.color.set(powered ? C.cyan : C.cyanDeep);
      coreMat.current.emissive.set(powered ? C.cyan : C.cyanDeep);
    }
    if (glow.current) {
      const s = (powered ? 9 : 4) * (1 + Math.sin(t * 6) * (powered ? 0.09 : 0.02));
      glow.current.scale.set(s, s, 1);
      (glow.current.material as THREE.SpriteMaterial).opacity = powered ? 0.85 : 0.28;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow>
        <ringGeometry args={[GATE_R * 0.55, GATE_R, 48]} />
        <meshStandardMaterial color={C.cyanDeep} emissive={C.cyan} emissiveIntensity={0.9} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[GATE_R * 0.55, 40]} />
        <meshStandardMaterial color="#0b1a22" roughness={0.3} metalness={0.8} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (GATE_R + 0.25), 0.9, Math.sin(a) * (GATE_R + 0.25)]} rotation-y={-a} castShadow>
            <boxGeometry args={[0.36, 1.8, 0.36]} />
            <meshStandardMaterial color={C.steel} metalness={0.9} roughness={0.35} />
          </mesh>
        );
      })}
      <mesh ref={ringA} position={[0, 1.6, 0]}>
        <torusGeometry args={[1.5, 0.075, 8, 40]} />
        <meshStandardMaterial color={C.cyan} emissive={C.cyan} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} position={[0, 1.6, 0]} rotation-x={Math.PI / 2.4}>
        <torusGeometry args={[1.05, 0.055, 8, 32]} />
        <meshStandardMaterial color={C.amber} emissive={C.amber} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={core} position={[0, 1.6, 0]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial ref={coreMat} color={C.cyan} emissive={C.cyan} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <sprite ref={glow} position={[0, 1.5, 0]}>
        <spriteMaterial map={glowTex} color={C.cyan} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.3} />
      </sprite>
    </group>
  );
}

export function Arena() {
  const floorTex = useMemo(getFloorTexture, []);
  const trace = useRef<THREE.Mesh>(null);
  const trace2 = useRef<THREE.Mesh>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);

  const geo = useMemo(
    () => ({
      pylon: new THREE.BoxGeometry(0.55, 1.5, 0.42),
      spire: new THREE.CylinderGeometry(0.32, 0.7, 9, 6),
      block: new THREE.BoxGeometry(1.4, 0.55, 1.0),
    }),
    [],
  );
  const mat = useMemo(
    () => ({
      steel: new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.85, roughness: 0.4 }),
      dark: new THREE.MeshStandardMaterial({ color: "#151b23", metalness: 0.7, roughness: 0.55 }),
      hot: new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 1.3, toneMapped: false }),
    }),
    [],
  );

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  useFrame((_, dt) => {
    const boost = game.arenaBoost;
    if (trace.current) {
      trace.current.rotation.z += dt * 0.12;
      const m = trace.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.25 + boost * 0.5 + (game.gatePower > 0 ? 0.18 : 0);
    }
    if (trace2.current) trace2.current.rotation.z -= dt * 0.07;
    if (rimMat.current) rimMat.current.emissiveIntensity = 0.8 + boost * 3.2 + (game.gatePower > 0 ? 0.6 : 0);
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ARENA_R, 64]} />
        <meshStandardMaterial map={floorTex} roughness={0.62} metalness={0.55} />
      </mesh>
      <mesh ref={trace} rotation-x={-Math.PI / 2} position-y={0.045}>
        <ringGeometry args={[ARENA_R * 0.52, ARENA_R * 0.56, 64, 1, 0, Math.PI * 1.35]} />
        <meshBasicMaterial color={C.amber} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh ref={trace2} rotation-x={-Math.PI / 2} position-y={0.045}>
        <ringGeometry args={[ARENA_R * 0.79, ARENA_R * 0.815, 64, 1, 0, Math.PI * 0.9]} />
        <meshBasicMaterial color={C.cyan} transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh position-y={-0.7} castShadow={false}>
        <cylinderGeometry args={[ARENA_R, ARENA_R * 0.86, 1.4, 48, 1, true]} />
        <meshStandardMaterial color="#0b0e13" metalness={0.8} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.14} rotation-x={Math.PI / 2}>
        <torusGeometry args={[ARENA_R - 0.05, 0.16, 6, 72]} />
        <meshStandardMaterial ref={rimMat} color={C.ember} emissive={C.ember} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <InstancedRing count={24} radius={ARENA_R + 0.45} y={0.75} geometry={geo.pylon} material={mat.steel} />
      <InstancedRing count={9} radius={ARENA_R + 7} y={4.5} geometry={geo.spire} material={mat.dark} jitter={3.5} />
      <InstancedRing count={12} radius={ARENA_R + 2.4} y={0.28} geometry={geo.block} material={mat.dark} jitter={1.8} />
      <InstancedRing count={24} radius={ARENA_R - 1.1} y={0.06} geometry={geo.pylon} material={mat.hot} scaleY={0.06} />
      <mesh rotation-x={-Math.PI / 2} position-y={-6}>
        <circleGeometry args={[80, 48]} />
        <meshStandardMaterial color="#05070a" roughness={1} metalness={0} />
      </mesh>
      <FluxGate />
    </group>
  );
}

export function ArenaLights() {
  const key = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (key.current) key.current.intensity = 1.5 + game.arenaBoost * 1.2;
  });
  return (
    <>
      <hemisphereLight args={["#4d6f8f", "#0a0c10", 0.95]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        ref={key}
        position={[9, 16, 8]}
        intensity={1.5}
        color="#cfe4ff"
        castShadow={!settings.reduced}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0012}
      />
      <pointLight position={[0, 3, 0]} color={C.cyan} intensity={22} distance={22} decay={2} />
      <pointLight position={[-12, 4, -10]} color={C.ember} intensity={30} distance={30} decay={2} />
      <pointLight position={[12, 4, 10]} color={C.amber} intensity={18} distance={28} decay={2} />
    </>
  );
}
