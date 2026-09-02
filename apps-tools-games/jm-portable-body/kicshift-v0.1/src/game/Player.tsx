import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { player, game } from "./world";
import { C, getGlowTexture } from "./visuals";

export function Player() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const shield = useRef<THREE.Mesh>(null);
  const shieldMat = useRef<THREE.MeshBasicMaterial>(null);
  const chargeOrb = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const armourMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const glowTex = useMemo(getGlowTexture, []);

  const reg = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !armourMats.current.includes(m)) armourMats.current.push(m);
  };

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const t = performance.now() * 0.001;
    const dead = game.phase === "over" && player.hp <= 0;

    g.position.set(player.x, 0, player.z);
    g.rotation.y = player.yaw;
    g.visible = true;

    const spd = Math.hypot(player.vx, player.vz);
    const walk = Math.sin(player.step * 3.1) * Math.min(1, spd / 7);
    const bob = Math.abs(Math.sin(player.step * 3.1)) * Math.min(1, spd / 7) * 0.09;

    if (body.current) {
      body.current.position.y = 0.02 + bob + (dead ? -0.5 : 0);
      body.current.rotation.x = THREE.MathUtils.lerp(
        body.current.rotation.x,
        (dead ? 0.9 : 0) + Math.min(spd / 9, 1) * 0.16 - player.swing * 0.22,
        1 - Math.exp(-12 * dt),
      );
      body.current.rotation.z = THREE.MathUtils.lerp(body.current.rotation.z, dead ? 0.6 : 0, 1 - Math.exp(-8 * dt));
    }
    if (legR.current) legR.current.rotation.x = walk * 0.75;
    if (legL.current) legL.current.rotation.x = -walk * 0.75;
    if (armL.current) armL.current.rotation.x = -walk * 0.55 + (player.guardT > 0 ? -1.25 : 0);
    if (armR.current) {
      const punch = player.swing * -2.1;
      armR.current.rotation.x = THREE.MathUtils.lerp(
        armR.current.rotation.x,
        walk * 0.55 + punch + (player.charging ? -0.9 : 0),
        1 - Math.exp(-22 * dt),
      );
    }

    if (coreMat.current) {
      const chargePulse = player.charging ? 2 + player.charge * 6 : 1.8 + Math.sin(t * 3) * 0.4;
      coreMat.current.emissiveIntensity = chargePulse;
      coreMat.current.color.set(player.charge > 0.6 ? C.amberHot : C.amber);
      coreMat.current.emissive.set(player.charge > 0.6 ? C.amberHot : C.amber);
    }
    if (core.current) core.current.scale.setScalar(1 + (player.charging ? player.charge * 0.35 : 0));

    if (chargeOrb.current) {
      const on = player.charge > 0.05;
      chargeOrb.current.visible = on;
      if (on) {
        chargeOrb.current.scale.setScalar(0.18 + player.charge * 0.55);
        chargeOrb.current.rotation.y += dt * 6;
        (chargeOrb.current.material as THREE.MeshBasicMaterial).color.set(player.charge >= 0.6 ? C.amberHot : C.amber);
      }
    }

    if (shield.current && shieldMat.current) {
      const active = player.guardT > 0 || player.guardFx > 0;
      shield.current.visible = active;
      if (active) {
        const k = Math.max(player.guardT / 0.55, player.guardFx);
        shieldMat.current.opacity = 0.16 + k * 0.38;
        shieldMat.current.color.set(player.guardPerfect > 0 || player.guardFx > 0.6 ? "#ffffff" : C.cyan);
        shield.current.scale.setScalar(1 + player.guardFx * 0.35);
      }
    }

    const hurt = player.hurt;
    const phasing = player.shiftFx;
    const flicker = player.iframe > 0 && Math.sin(t * 40) > 0 ? 0.35 : 1;
    for (const m of armourMats.current) {
      m.emissiveIntensity = hurt * 2.4 + phasing * 1.6;
      if (hurt > 0.01) m.emissive.set(C.crimson);
      else if (phasing > 0.01) m.emissive.set(C.violet);
      else m.emissive.set("#000000");
      m.opacity = flicker * (1 - phasing * 0.45);
      m.transparent = flicker < 1 || phasing > 0.01;
    }

    if (glow.current) {
      const s = 2.6 + player.charge * 2.2 + (player.dashT > 0 ? 1.2 : 0);
      glow.current.scale.set(s, s, 1);
      (glow.current.material as THREE.SpriteMaterial).color.set(phasing > 0.01 ? C.violet : C.amber);
    }
    if (shadow.current) shadow.current.position.set(player.x, 0.06, player.z);
  });

  const armour = "#2a3340";
  const armourDark = "#1b2230";

  return (
    <>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.75, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <group ref={body}>
          <group ref={legL} position={[-0.19, 0.72, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow><boxGeometry args={[0.24, 0.72, 0.26]} /><meshStandardMaterial ref={reg} color={armourDark} metalness={0.7} roughness={0.45} /></mesh>
            <mesh position={[0, -0.72, 0.06]} castShadow><boxGeometry args={[0.27, 0.14, 0.4]} /><meshStandardMaterial ref={reg} color={armour} metalness={0.7} roughness={0.5} /></mesh>
          </group>
          <group ref={legR} position={[0.19, 0.72, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow><boxGeometry args={[0.24, 0.72, 0.26]} /><meshStandardMaterial ref={reg} color={armourDark} metalness={0.7} roughness={0.45} /></mesh>
            <mesh position={[0, -0.72, 0.06]} castShadow><boxGeometry args={[0.27, 0.14, 0.4]} /><meshStandardMaterial ref={reg} color={armour} metalness={0.7} roughness={0.5} /></mesh>
          </group>
          <mesh position={[0, 0.78, 0]} castShadow><boxGeometry args={[0.5, 0.2, 0.32]} /><meshStandardMaterial ref={reg} color={armour} metalness={0.75} roughness={0.42} /></mesh>
          <mesh position={[0, 1.16, 0]} castShadow><boxGeometry args={[0.58, 0.62, 0.38]} /><meshStandardMaterial ref={reg} color={armour} metalness={0.78} roughness={0.38} /></mesh>
          <mesh position={[0, 1.32, 0.2]} castShadow><boxGeometry args={[0.42, 0.3, 0.08]} /><meshStandardMaterial ref={reg} color={armourDark} metalness={0.9} roughness={0.3} /></mesh>
          <mesh ref={core} position={[0, 1.18, 0.22]}><icosahedronGeometry args={[0.14, 0]} /><meshStandardMaterial ref={coreMat} color={C.amber} emissive={C.amber} emissiveIntensity={2} toneMapped={false} /></mesh>
          <mesh position={[-0.42, 1.4, 0]} rotation-z={0.3} castShadow><boxGeometry args={[0.3, 0.24, 0.42]} /><meshStandardMaterial ref={reg} color={armourDark} metalness={0.85} roughness={0.35} /></mesh>
          <mesh position={[0.42, 1.4, 0]} rotation-z={-0.3} castShadow><boxGeometry args={[0.34, 0.28, 0.46]} /><meshStandardMaterial ref={reg} color={C.ember} metalness={0.6} roughness={0.45} /></mesh>
          <group ref={armL} position={[-0.42, 1.32, 0]}>
            <mesh position={[0, -0.28, 0]} castShadow><boxGeometry args={[0.18, 0.56, 0.19]} /><meshStandardMaterial ref={reg} color={armour} metalness={0.75} roughness={0.4} /></mesh>
            <mesh position={[0, -0.6, 0.02]} castShadow><boxGeometry args={[0.24, 0.22, 0.26]} /><meshStandardMaterial ref={reg} color={armourDark} metalness={0.85} roughness={0.3} /></mesh>
          </group>
          <group ref={armR} position={[0.42, 1.32, 0]}>
            <mesh position={[0, -0.28, 0]} castShadow><boxGeometry args={[0.19, 0.56, 0.2]} /><meshStandardMaterial ref={reg} color={armour} metalness={0.75} roughness={0.4} /></mesh>
            <mesh position={[0, -0.64, 0.04]} castShadow><boxGeometry args={[0.3, 0.3, 0.34]} /><meshStandardMaterial ref={reg} color={C.steel} metalness={0.92} roughness={0.25} /></mesh>
            <mesh ref={chargeOrb} position={[0, -0.74, 0.28]}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color={C.amber} toneMapped={false} transparent opacity={0.85} /></mesh>
          </group>
          <mesh position={[0, 1.66, 0]} castShadow><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial ref={reg} color={armourDark} metalness={0.8} roughness={0.35} /></mesh>
          <mesh position={[0, 1.66, 0.16]}><boxGeometry args={[0.24, 0.09, 0.04]} /><meshStandardMaterial color={C.cyan} emissive={C.cyan} emissiveIntensity={2.4} toneMapped={false} /></mesh>
          <mesh position={[0, 1.84, -0.04]} rotation-x={-0.3} castShadow><boxGeometry args={[0.1, 0.28, 0.1]} /><meshStandardMaterial ref={reg} color={C.ember} metalness={0.6} roughness={0.4} /></mesh>
          <mesh ref={shield} position={[0, 1.0, 0]} visible={false}>
            <sphereGeometry args={[1.05, 20, 14]} />
            <meshBasicMaterial ref={shieldMat} color={C.cyan} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
        <sprite ref={glow} position={[0, 1.1, 0]}><spriteMaterial map={glowTex} color={C.amber} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      </group>
    </>
  );
}
