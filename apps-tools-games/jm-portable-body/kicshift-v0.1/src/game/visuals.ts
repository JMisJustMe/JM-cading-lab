import * as THREE from "three";

export const C = {
  amber: "#ffb347",
  amberHot: "#ffd79a",
  ember: "#ff6a2a",
  cyan: "#5fe3ff",
  cyanDeep: "#1b7f9e",
  violet: "#b98cff",
  crimson: "#ff4d6a",
  steel: "#3a4553",
  obsidian: "#0e1116",
  obsidianLight: "#1a2029",
};

let glowTex: THREE.Texture | null = null;
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  glowTex = new THREE.CanvasTexture(cv);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

let floorTex: THREE.Texture | null = null;
export function getFloorTexture() {
  if (floorTex) return floorTex;
  const s = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;

  ctx.fillStyle = "#11151b";
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = Math.random() * 26 + 4;
    ctx.fillStyle = `rgba(${20 + Math.random() * 34 | 0},${24 + Math.random() * 34 | 0},${32 + Math.random() * 40 | 0},0.16)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const hexR = 34;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "rgba(120,160,190,0.13)";
  for (let row = -1; row * hexR * 1.5 < s + hexR; row++) {
    for (let col = -1; col * hexR * Math.sqrt(3) < s + hexR; col++) {
      const cx = col * hexR * Math.sqrt(3) + (row % 2 ? (hexR * Math.sqrt(3)) / 2 : 0);
      const cy = row * hexR * 1.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k - 30);
        const px = cx + hexR * 0.94 * Math.cos(a);
        const py = cy + hexR * 0.94 * Math.sin(a);
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    const grad = ctx.createLinearGradient(0, 0, 0, -c);
    grad.addColorStop(0, "rgba(255,150,60,0.55)");
    grad.addColorStop(0.55, "rgba(255,140,60,0.16)");
    grad.addColorStop(1, "rgba(255,140,60,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(0, -c + 40);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(95,227,255,0.20)";
  ctx.lineWidth = 3;
  for (const r of [130, 240, 350, 445]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,179,71,0.35)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 470, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const vg = ctx.createRadialGradient(c, c, s * 0.22, c, c, s * 0.5);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, s, s);

  floorTex = new THREE.CanvasTexture(cv);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.anisotropy = 4;
  return floorTex;
}
