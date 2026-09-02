import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { enemies, E_CHASER, E_SHOOTER, E_HEAVY, type Enemy } from "./world";
import { C } from "./visuals";

interface SlotApi {
  group: THREE.Group | null;
  mats: THREE.MeshStandardMaterial[];
  eye?: THREE.MeshStandardMaterial | null;
}

function useEnemyPool(type: number, animate: (e: Enemy, api: SlotApi, t: number, dt: number) => void) {
  const slots = useRef<SlotApi[]>([]);
  useFrame((_, dt) => {
    const t = performance.now() * 0.001;
    const pool = enemies[type]!;
    for (let i = 0; i < pool.length; i++) {
      const e = pool[i]!;
      const api = slots.current[i];
      if (!api?.group) continue;
      api.group.visible = e.alive;
      if (!e.alive) continue;
      api.group.position.set(e.x, 0, e.z);
      api.group.rotation.y = e.yaw;
      const s = 0.35 + e.spawn * 0.65;
      api.group.scale.setScalar(s);

      const telegraph = e.tele > 0 ? 1 - e.tele : 0;
      const glow = e.flash * 3 + (e.tele > 0 ? 0.6 + telegraph * 3.2 : 0);
      for (const m of api.mats) {
        m.emissiveIntensity = glow;
        m.emissive.set(e.flash > 0.02 ? "#ffffff" : C.crimson);
      }
      if (api.eye) api.eye.emissiveIntensity = 1.8 + (e.tele > 0 ? telegraph * 5 : Math.sin(t * 3 + i) * 0.5);
      animate(e, api, t, dt);
    }
  });
  return slots;
}

const setSlot =
  (slots: React.RefObject<SlotApi[]>, i: number) =>
  (g: THREE.Group | null) => {
    if (!slots.current[i]) slots.current[i] = { group: null, mats: [] };
    slots.current[i]!.group = g;
    if (g) {
      const mats: THREE.MeshStandardMaterial[] = [];
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          if (o.userData['eye']) slots.current[i]!.eye = m;
          else mats.push(m);
        }
      });
      slots.current[i]!.mats = mats;
    }
  };

function Shadow() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
      <circleGeometry args={[0.7, 18]} />
      <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

function Chasers() {
  const slots = useEnemyPool(E_CHASER, (e, api) => {
    const g = api.group!;
    const lunge = e.tele > 0 ? (1 - e.tele) * 0.5 : 0;
    g.children[1]!.rotation.x = 0.35 + lunge;
    g.position.y = Math.abs(Math.sin(e.anim * 9)) * 0.08 * (e.tele > 0 ? 0 : 1);
  });
  return (
    <>
      {enemies[E_CHASER]!.map((_, i) => (
        <group key={i} ref={setSlot(slots, i)} visible={false}>
          <Shadow />
          <group position={[0, 0.9, 0]} rotation-x={0.35}>
            <mesh castShadow><boxGeometry args={[0.44, 0.72, 0.36]} /><meshStandardMaterial color="#5a1622" metalness={0.5} roughness={0.55} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            <mesh position={[0, 0.5, 0.1]} castShadow><boxGeometry args={[0.3, 0.26, 0.34]} /><meshStandardMaterial color="#31101a" metalness={0.6} roughness={0.4} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            <mesh position={[0, 0.5, 0.28]} userData={{ eye: true }}><boxGeometry args={[0.2, 0.07, 0.05]} /><meshStandardMaterial color={C.crimson} emissive={C.crimson} emissiveIntensity={2} toneMapped={false} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.32, 0.12, 0.16]} rotation-z={s * 0.5} castShadow><boxGeometry args={[0.13, 0.6, 0.14]} /><meshStandardMaterial color="#3d1119" metalness={0.6} roughness={0.5} emissive={C.crimson} emissiveIntensity={0} /></mesh>)}
            {[-1, 1].map((s) => <mesh key={"l" + s} position={[s * 0.16, -0.62, -0.05]} castShadow><boxGeometry args={[0.16, 0.6, 0.18]} /><meshStandardMaterial color="#2a0d14" metalness={0.5} roughness={0.6} emissive={C.crimson} emissiveIntensity={0} /></mesh>)}
          </group>
        </group>
      ))}
    </>
  );
}

function Shooters() {
  const slots = useEnemyPool(E_SHOOTER, (e, api) => {
    const g = api.group!;
    g.position.y = 0.35 + Math.sin(e.anim * 2.2) * 0.12;
    const body = g.children[1]!;
    body.rotation.y = Math.sin(e.anim * 1.4) * 0.15;
    body.children[4]!.rotation.x = e.tele > 0 ? -1.35 : -0.9;
  });
  return (
    <>
      {enemies[E_SHOOTER]!.map((_, i) => (
        <group key={i} ref={setSlot(slots, i)} visible={false}>
          <Shadow />
          <group position={[0, 0.5, 0]}>
            <mesh castShadow><cylinderGeometry args={[0.16, 0.34, 0.9, 6]} /><meshStandardMaterial color="#123642" metalness={0.8} roughness={0.35} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            <mesh position={[0, 0.62, 0]} castShadow><boxGeometry args={[0.4, 0.36, 0.34]} /><meshStandardMaterial color="#1c4b5c" metalness={0.85} roughness={0.3} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            <mesh position={[0, 0.62, 0.2]} userData={{ eye: true }}><sphereGeometry args={[0.11, 12, 10]} /><meshStandardMaterial color={C.cyan} emissive={C.cyan} emissiveIntensity={2} toneMapped={false} /></mesh>
            <mesh position={[0, -0.6, 0]} castShadow><coneGeometry args={[0.3, 0.6, 6]} /><meshStandardMaterial color="#0d2a33" metalness={0.8} roughness={0.4} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            <group position={[0.36, 0.35, 0]} rotation-x={-0.9}>
              <mesh castShadow><boxGeometry args={[0.2, 0.62, 0.2]} /><meshStandardMaterial color="#1c4b5c" metalness={0.85} roughness={0.3} emissive={C.crimson} emissiveIntensity={0} /></mesh>
              <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.11, 0.15, 0.3, 8]} /><meshStandardMaterial color={C.cyanDeep} emissive={C.cyan} emissiveIntensity={1.4} toneMapped={false} /></mesh>
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

function Heavies() {
  const slots = useEnemyPool(E_HEAVY, (e, api) => {
    const g = api.group!;
    const body = g.children[1]!;
    const wind = e.tele > 0 ? 1 - e.tele : 0;
    body.position.y = 0.15 + Math.abs(Math.sin(e.anim * 3.2)) * 0.06 - wind * 0.12;
    body.rotation.x = -wind * 0.45;
    body.children[5]!.rotation.x = -wind * 2.4;
    body.children[6]!.rotation.x = -wind * 2.4;
    g.scale.setScalar((0.35 + e.spawn * 0.65) * 1.35);
  });
  return (
    <>
      {enemies[E_HEAVY]!.map((_, i) => (
        <group key={i} ref={setSlot(slots, i)} visible={false}>
          <Shadow />
          <group position={[0, 0.15, 0]}>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.28, 0.4, 0]} castShadow><boxGeometry args={[0.34, 0.8, 0.36]} /><meshStandardMaterial color="#2c2740" metalness={0.7} roughness={0.5} emissive={C.crimson} emissiveIntensity={0} /></mesh>)}
            <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[0.95, 0.85, 0.62]} /><meshStandardMaterial color="#3a3355" metalness={0.8} roughness={0.4} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            <mesh position={[0, 1.15, 0.33]} userData={{ eye: true }}><boxGeometry args={[0.5, 0.1, 0.06]} /><meshStandardMaterial color={C.violet} emissive={C.violet} emissiveIntensity={2} toneMapped={false} /></mesh>
            <mesh position={[0, 1.68, -0.05]} castShadow><boxGeometry args={[0.34, 0.3, 0.34]} /><meshStandardMaterial color="#241f36" metalness={0.85} roughness={0.35} emissive={C.crimson} emissiveIntensity={0} /></mesh>
            {[-1, 1].map((s) => (
              <group key={"a" + s} position={[s * 0.66, 1.4, 0]}>
                <mesh position={[0, -0.1, 0]} rotation-z={-s * 0.25} castShadow><boxGeometry args={[0.3, 0.6, 0.32]} /><meshStandardMaterial color="#2c2740" metalness={0.8} roughness={0.45} emissive={C.crimson} emissiveIntensity={0} /></mesh>
                <mesh position={[s * 0.14, -0.55, 0]} castShadow><boxGeometry args={[0.44, 0.42, 0.44]} /><meshStandardMaterial color={C.steel} metalness={0.92} roughness={0.28} emissive={C.crimson} emissiveIntensity={0} /></mesh>
              </group>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}

export function Enemies() {
  return <><Chasers /><Shooters /><Heavies /></>;
}
