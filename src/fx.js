import * as THREE from 'three';

function makeFlashTex() {
  // Sharp 4-point star: bright core + tapered spikes, no blurry ball.
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.translate(32, 32);
  function spike(len, wid, color) {
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-wid, 0);
    ctx.lineTo(0, -len);
    ctx.lineTo(wid, 0);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    spike(30, 4, 'rgba(255,230,160,0.95)');
    spike(18, 7, 'rgba(255,255,240,1)');
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,250,1)';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

export function createFx(scene) {
  const flashTex = makeFlashTex();

  const tracers = [];
  for (let i = 0; i < 16; i++) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffd875, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    line.name = 'fxTracer';
    scene.add(line);
    tracers.push({ line, attr: geo.getAttribute('position'), life: 0, maxLife: 0.085 });
  }

  const flashes = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({
      map: flashTex, color: 0xffcf6e, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const sp = new THREE.Sprite(mat);
    sp.visible = false;
    sp.name = 'fxMuzzleFlash';
    scene.add(sp);
    flashes.push({ sp, life: 0, maxLife: 0.055, baseScale: 0.3 });
  }

  // Bullet-hole decals: dark impact marks that linger on walls.
  const decalGeo = new THREE.CircleGeometry(0.07, 10);
  const decals = [];
  for (let i = 0; i < 24; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a, transparent: true, opacity: 0.85, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    const mesh = new THREE.Mesh(decalGeo, mat);
    mesh.visible = false;
    mesh.name = 'fxDecal';
    scene.add(mesh);
    decals.push({ mesh, life: 0, maxLife: 14 });
  }

  const sparkGeo = new THREE.BoxGeometry(0.032, 0.032, 0.12);
  const sparks = [];
  for (let i = 0; i < 48; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffb84d, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(sparkGeo, mat);
    mesh.visible = false;
    mesh.name = 'fxSpark';
    scene.add(mesh);
    sparks.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.24 });
  }

  const smokeGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const smokes = [];
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x5d6470, transparent: true, opacity: 0.65, depthWrite: false
    });
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mesh.visible = false;
    mesh.name = 'fxSmoke';
    scene.add(mesh);
    smokes.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1.3 });
  }

  // Deterministic pseudo-random (fixed seed): identical FX across runs so
  // dossier screenshots stay reproducible. Never Math.random() here.
  let fxSeed = 1234567;
  function fxRand() {
    fxSeed = (fxSeed * 1103515245 + 12345) & 0x7fffffff;
    return fxSeed / 0x7fffffff;
  }

  function nextFree(pool) {
    for (const item of pool) {
      if (item.life <= 0) return item;
    }
    return pool[0];
  }

  function spawnTracer(from, to) {
    const t = nextFree(tracers);
    t.attr.setXYZ(0, from.x, from.y, from.z);
    t.attr.setXYZ(1, to.x, to.y, to.z);
    t.attr.needsUpdate = true;
    t.line.visible = true;
    t.line.material.opacity = 0.95;
    t.life = t.maxLife;
  }

  function spawnFlash(pos, scale = 1) {
    const f = nextFree(flashes);
    f.sp.position.copy(pos);
    f.sp.material.rotation = fxRand() * Math.PI;
    f.sp.scale.setScalar(f.baseScale * scale);
    f.sp.visible = true;
    f.sp.material.opacity = 0.95;
    f.life = f.maxLife;
  }

  function spawnSparks(pos, count = 6, colorHex = 0xffb84d) {
    for (let i = 0; i < count; i++) {
      const s = nextFree(sparks);
      s.mesh.position.copy(pos);
      s.mesh.material.color.setHex(colorHex);
      s.vel.set((fxRand() - 0.5) * 6, fxRand() * 5 + 1, (fxRand() - 0.5) * 6);
      s.mesh.visible = true;
      s.mesh.material.opacity = 1;
      s.life = s.maxLife;
    }
  }

  function spawnDecal(pos, dir) {
    const d = nextFree(decals);
    d.mesh.position.copy(pos).addScaledVector(dir, -0.02);
    d.mesh.lookAt(pos.x - dir.x, pos.y - dir.y, pos.z - dir.z);
    d.mesh.visible = true;
    d.mesh.material.opacity = 0.85;
    d.life = d.maxLife;
  }

  function spawnSmoke(pos, count = 5) {
    for (let i = 0; i < count; i++) {
      const s = nextFree(smokes);
      s.mesh.position.set(pos.x + (fxRand() - 0.5) * 1.2, pos.y + fxRand() * 0.6, pos.z + (fxRand() - 0.5) * 1.2);
      s.vel.set((fxRand() - 0.5) * 1.2, 0.7 + fxRand() * 0.8, (fxRand() - 0.5) * 1.2);
      s.mesh.scale.setScalar(0.6);
      s.mesh.visible = true;
      s.mesh.material.opacity = 0.65;
      s.life = s.maxLife;
    }
  }

  function update(dt) {
    for (const t of tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.line.visible = false;
      else t.line.material.opacity = 0.95 * (t.life / t.maxLife);
    }
    for (const f of flashes) {
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0) f.sp.visible = false;
      else f.sp.material.opacity = 0.95 * (f.life / f.maxLife);
    }
    for (const s of sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.mesh.visible = false; continue; }
      s.vel.y -= 14 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.material.opacity = s.life / s.maxLife;
    }
    for (const s of smokes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.mesh.visible = false; continue; }
      s.mesh.position.addScaledVector(s.vel, dt);
      const progress = 1 - s.life / s.maxLife;
      s.mesh.scale.setScalar(0.6 + progress * 1.8);
      s.mesh.material.opacity = 0.65 * (1 - progress * 0.7);
    }
    for (const d of decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; continue; }
      if (d.life < 2) d.mesh.material.opacity = 0.85 * (d.life / 2);
    }
  }

  return { spawnTracer, spawnFlash, spawnSparks, spawnSmoke, spawnDecal, update };
}
