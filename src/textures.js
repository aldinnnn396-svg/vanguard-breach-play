import * as THREE from 'three';

export const textures = {};

function createCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finish(tex) {
  // Anisotropic filtering keeps ground/walls sharp at grazing angles.
  // Three.js clamps this to the device maximum automatically.
  tex.anisotropy = 8;
  return tex;
}

export function getBrickTexture() {
  if (textures.brick) return textures.brick;
  const S = 512;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a4440';
  ctx.fillRect(0, 0, S, S);
  const rows = 16, cols = 8;
  const rh = S / rows, cw = S / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + offset;
      const y = r * rh;
      const shade = Math.floor(Math.random() * 24 - 12);
      ctx.fillStyle = `rgb(${75 + shade}, ${68 + shade}, ${64 + shade})`;
      ctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      // Top highlight + bottom shadow per brick for depth.
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 2, y + 2, cw - 4, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 2, y + rh - 5, cw - 4, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textures.brick = finish(tex);
  return tex;
}
export function getConcreteTexture() {
  if (textures.concrete) return textures.concrete;
  const S = 512;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a404a';
  ctx.fillRect(0, 0, S, S);
  const imgData = ctx.getImageData(0, 0, S, S);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
    data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
  // Expansion joints + a few cracks and stains.
  ctx.strokeStyle = '#282d36';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, S, S);
  ctx.strokeRect(S / 2, 0, S / 2, S);
  ctx.strokeStyle = 'rgba(20,22,28,0.6)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 5; k++) {
    let x = Math.random() * S, y = Math.random() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += Math.random() * 30 - 15; y += Math.random() * 30 - 15; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 30 + Math.random() * 50, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textures.concrete = finish(tex);
  return tex;
}

export function getWoodTexture() {
  if (textures.wood) return textures.wood;
  const S = 256;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5c4328';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#45321d';
  for (let y = 0; y < S; y += 64) {
    ctx.fillRect(0, y, S, 3);
  }
  ctx.fillStyle = '#6e5132';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.fillRect(x, y, Math.random() * 40 + 10, 2);
  }
  // Nail heads at plank corners.
  ctx.fillStyle = '#2a2118';
  for (let y = 32; y < S; y += 64) {
    for (let x = 16; x < S; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textures.wood = finish(tex);
  return tex;
}
export function getHazardTexture() {
  if (textures.hazard) return textures.hazard;
  const S = 256;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e222a';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#e29b28';
  ctx.beginPath();
  for (let i = -S; i < S * 2; i += 64) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i + 32 - S, S);
    ctx.lineTo(i - S, S);
  }
  ctx.fill();
  // Wear: dark scuffs over the stripes.
  ctx.fillStyle = 'rgba(20,22,28,0.25)';
  for (let i = 0; i < 24; i++) {
    ctx.fillRect(Math.random() * S, Math.random() * S, Math.random() * 30 + 8, 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textures.hazard = finish(tex);
  return tex;
}

export function getSignTexture(letter, colorHex) {
  const key = 'sign_' + letter;
  if (textures[key]) return textures[key];
  const S = 512;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 28;
  ctx.strokeRect(24, 24, S - 48, S - 48);
  ctx.fillStyle = colorHex;
  ctx.font = 'bold 260px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, S / 2, 220);
  ctx.font = 'bold 48px monospace';
  ctx.fillText('BOMBSITE ' + letter, S / 2, 410);
  const tex = new THREE.CanvasTexture(canvas);
  textures[key] = finish(tex);
  return tex;
}

export function getTitleSignTexture() {
  if (textures.titleSign) return textures.titleSign;
  const canvas = createCanvas(1024, 256);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#7d8aa0';
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 992, 224);
  ctx.fillStyle = '#e6ebf2';
  ctx.font = '900 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OUTPOST BASTION', 512, 104);
  ctx.fillStyle = '#e29b28';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('TACTICAL ENGAGEMENT ZONE', 512, 176);
  const tex = new THREE.CanvasTexture(canvas);
  textures.titleSign = finish(tex);
  return tex;
}

export function getSkyTexture() {
  if (textures.sky) return textures.sky;
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#121526');
  grad.addColorStop(0.35, '#3b2342');
  grad.addColorStop(0.65, '#b84a39');
  grad.addColorStop(0.85, '#e07d3b');
  grad.addColorStop(1.0, '#f2ab4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  textures.sky = tex;
  return tex;
}

export function getCorrugatedTexture(base = '#2a4a6b', key = 'corrBlue') {
  if (textures[key]) return textures[key];
  const S = 256;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  // Vertical ribs: alternating light/shadow stripes.
  for (let x = 0; x < S; x += 16) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.14)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 16, S);
  }
  // Rivets along the top and bottom edges.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = 8; x < S; x += 32) {
    ctx.beginPath(); ctx.arc(x, 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, S - 8, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Wear scuffs.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 6 + Math.random() * 20, 2 + Math.random() * 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textures[key] = finish(tex);
  return tex;
}

export function getAsphaltTexture() {
  if (textures.asphalt) return textures.asphalt;
  const S = 512;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#33363a';
  ctx.fillRect(0, 0, S, S);
  // Dense speckle.
  for (let i = 0; i < 9000; i++) {
    const v = 40 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${v},${v},${v + 3})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  // Tactical tile grid.
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  for (let p = 0; p <= S; p += 128) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let p = 2; p <= S; p += 128) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }
  // Cracks.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    let x = Math.random() * S, y = Math.random() * S;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textures.asphalt = finish(tex);
  return tex;
}
