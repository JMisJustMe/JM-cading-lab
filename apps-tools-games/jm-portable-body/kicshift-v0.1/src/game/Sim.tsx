import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { game, player, step } from "./world";
import { publishHud } from "./hudStore";

/**
 * Drives the headless sim each frame and runs the camera rig.
 * Fixed angled 2.5D view: camera sits on +Z looking at -Z, so joystick
 * up == -Z (away from viewer) and +X == screen right. Screen-relative by
 * construction: the camera never rotates with the player.
 */
export function Sim() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.8, 0));
  const shakeOff = useRef(new THREE.Vector3());

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const portrait = size.height > size.width;
    cam.fov = portrait ? 62 : 50;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    step(dt);

    const tx = player.x * 0.35;
    const tz = player.z * 0.3;
    const k = 1 - Math.exp(-3.2 * dt);
    look.current.x += (tx - look.current.x) * k;
    look.current.z += (tz - look.current.z) * k;

    const portrait = size.height > size.width;
    const dist = portrait ? 24 : 20;
    const height = portrait ? 17 : 13;

    const s = game.shake;
    if (s > 0.001) {
      shakeOff.current.set(
        (Math.random() - 0.5) * s * 1.4,
        (Math.random() - 0.5) * s * 0.9,
        (Math.random() - 0.5) * s * 1.4,
      );
    } else {
      shakeOff.current.multiplyScalar(0.6);
    }

    camera.position.set(
      look.current.x * 0.6 + shakeOff.current.x,
      height + shakeOff.current.y,
      look.current.z * 0.6 + dist + shakeOff.current.z,
    );
    camera.lookAt(look.current.x, 0.8, look.current.z);

    publishHud();
  });

  return null;
}
