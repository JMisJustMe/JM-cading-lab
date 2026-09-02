import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { particles, projectiles, rings, shards } from "./world";
import { C, getGlowTexture } from "./visuals";

const HIDE = new THREE.Object3D();
HIDE.position.set(0, -999, 0);
HIDE.updateMatrix();

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(particles.length * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(particles.length * 3), 3));
    g.setAttribute("size", new THREE.BufferAttribute(new Float32Array(particles.length), 1));
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.PointsMaterial({
      map: getGlowTexture(),
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      toneMapped: false,
    }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const col = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    const cAttr = geo.attributes['color'] as THREE.BufferAttribute;
    let n = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!;
      if (!p.alive) continue;
      const k = p.life / p.maxLife;
      pos.setXYZ(n, p.x, p.y, p.z);
      col.setHex(p.color).multiplyScalar(0.35 + k * 0.9);
      cAttr.setXYZ(n, col.r, col.g, col.b);
      n++;
    }
    geo.setDrawRange(0, n);
    pos.needsUpdate = true;
    cAttr.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

function Projectiles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.3, 10, 8), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i]!;
      if (!p.alive) { m.setMatrixAt(i, HIDE.matrix); continue; }
      const s = (p.charged ? 1.8 : 1) * (p.friendly ? 1.1 : 1);
      o.position.set(p.x, p.y, p.z);
      o.rotation.set(0, Math.atan2(p.vx, p.vz), 0);
      o.scale.set(s, s, s * 1.9);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(p.friendly ? (p.charged ? C.amberHot : C.amber) : C.cyan));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, projectiles.length]} frustumCulled={false} />;
}

function Shards() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.3, 0), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: 2.4, toneMapped: false }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i]!;
      if (!s.alive) { m.setMatrixAt(i, HIDE.matrix); continue; }
      o.position.set(s.x, s.y, s.z);
      o.rotation.set(s.t * 2.2, s.t * 3.1, 0);
      const sc = 1 + Math.sin(s.t * 6) * 0.12;
      o.scale.setScalar(sc);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, shards.length]} frustumCulled={false} />;
}

function Rings() {
  const refs = useRef<THREE.Mesh[]>([]);
  return <group>{rings.map((_, i) => <RingMesh key={i} index={i} refs={refs} />)}</group>;
}

function RingMesh({ index, refs }: { index: number; refs: React.MutableRefObject<THREE.Mesh[]> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const r = rings[index]!;
    if (!r.alive) { m.visible = false; return; }
    const k = Math.min(1, r.t / r.dur);
    const rad = r.r0 + (r.r1 - r.r0) * k;
    m.visible = true;
    m.position.set(r.x, 0.08, r.z);
    m.scale.set(rad, rad, 1);
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.color.setHex(r.color);
    mat.opacity = (1 - k) * 0.85;
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.82, 1, 40]} />
      <meshBasicMaterial transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export function Fx() {
  return <><Particles /><Projectiles /><Shards /><Rings /></>;
}
