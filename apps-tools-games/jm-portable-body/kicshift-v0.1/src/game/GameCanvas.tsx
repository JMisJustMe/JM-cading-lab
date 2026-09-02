import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Arena, ArenaLights } from "./Arena";
import { Player } from "./Player";
import { Enemies } from "./Enemies";
import { Fx } from "./Fx";
import { Sim } from "./Sim";
import { HUD } from "./HUD";
import { resetRun, settings } from "./world";
import { forcePublish } from "./hudStore";

export function GameCanvas() {
  useEffect(() => {
    settings.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resetRun();
    forcePublish();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070a] touch-none overscroll-none">
      <Canvas
        shadows={false}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 18, 26], fov: 50, near: 0.1, far: 220 }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.35;
          scene.background = new THREE.Color("#05070a");
          scene.fog = new THREE.Fog("#05070a", 34, 78);
        }}
      >
        <ArenaLights />
        <Arena />
        <Enemies />
        <Player />
        <Fx />
        <Sim />
      </Canvas>
      <HUD />
    </div>
  );
}
