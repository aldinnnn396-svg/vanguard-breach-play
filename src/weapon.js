// Tactical Weapons: Aegis Phase Blade, Spectre-11 SMG, Kestrel-7 Carbine
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export const WEAPON_TYPES = {
  blade: {
    id: 'blade',
    name: 'Aegis Phase Blade',
    price: 0,
    magSize: 1,
    reserveMax: 0,
    fireGap: 0.45,
    reloadTime: 0,
    damageHead: 120,
    damageTorso: 70,
    spreadStill: 0,
    spreadMoving: 0,
    kickAmt: 0,
    melee: true,
  },
  smg: {
    id: 'smg',
    name: 'Spectre-11 SMG',
    price: 1200,
    magSize: 30,
    reserveMax: 90,
    fireGap: 0.076,
    reloadTime: 1.6,
    damageHead: 65,
    damageTorso: 22,
    spreadStill: 0.0045,
    spreadMoving: 0.022,
    kickAmt: 0.06,
  },
  rifle: {
    id: 'rifle',
    name: 'Kestrel-7 Carbine',
    price: 2700,
    magSize: 30,
    reserveMax: 90,
    fireGap: 0.096,
    reloadTime: 1.9,
    damageHead: 100,
    damageTorso: 34,
    spreadStill: 0.002,
    spreadMoving: 0.032,
    kickAmt: 0.09,
  },
};

export function createWeapon(camera) {
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x3d4454, roughness: 0.5, metalness: 0.4 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 0.55, metalness: 0.45 });
  const shinyMetal = new THREE.MeshStandardMaterial({ color: 0x8a929e, roughness: 0.22, metalness: 0.9 });
  const holoMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.3 });
  const holoDotMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.45, metalness: 0.2 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.85, metalness: 0.05 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x3b4454, roughness: 0.85, metalness: 0.05 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc99e7c, roughness: 0.8 });

  const model = new THREE.Group();
  const addPart = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    model.add(m);
    return m;
  };
  addPart(new THREE.BoxGeometry(0.064, 0.068, 0.28), gunmetal, 0, 0.015, -0.02);
  addPart(new THREE.BoxGeometry(0.058, 0.055, 0.22), darkMetal, 0, -0.032, 0);
  addPart(new THREE.BoxGeometry(0.038, 0.014, 0.36), darkMetal, 0, 0.054, -0.08);
  addPart(new THREE.BoxGeometry(0.056, 0.056, 0.22), gunmetal, 0, 0.018, -0.25);
  addPart(new THREE.BoxGeometry(0.062, 0.012, 0.19), darkMetal, 0, 0.018, -0.25);
  addPart(new THREE.BoxGeometry(0.028, 0.012, 0.19), darkMetal, 0, -0.012, -0.25);
  addPart(new THREE.CylinderGeometry(0.013, 0.014, 0.28, 10), shinyMetal, 0, 0.024, -0.45, Math.PI / 2);
  addPart(new THREE.CylinderGeometry(0.018, 0.016, 0.055, 10), shinyMetal, 0, 0.024, -0.59, Math.PI / 2);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.name = 'muzzleTip';
  muzzleTip.position.set(0, 0.024, -0.62);
  model.add(muzzleTip);
  addPart(new THREE.BoxGeometry(0.036, 0.09, 0.068), accentMat, 0, -0.085, -0.075, 0.14);
  addPart(new THREE.BoxGeometry(0.035, 0.085, 0.066), accentMat, 0, -0.155, -0.095, 0.34);
  addPart(new THREE.BoxGeometry(0.04, 0.11, 0.052), accentMat, 0, -0.085, 0.075, -0.32);
  addPart(new THREE.BoxGeometry(0.02, 0.028, 0.055), darkMetal, 0, -0.062, 0.02);
  addPart(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), darkMetal, 0, 0.008, 0.19, Math.PI / 2);
  addPart(new THREE.BoxGeometry(0.048, 0.105, 0.14), gunmetal, 0, -0.018, 0.25);

  const rearEarGeo = new THREE.BoxGeometry(0.008, 0.022, 0.024);
  addPart(new THREE.BoxGeometry(0.036, 0.018, 0.03), darkMetal, 0, 0.068, 0.065);
  addPart(rearEarGeo, gunmetal, -0.013, 0.082, 0.065);
  addPart(rearEarGeo, gunmetal, 0.013, 0.082, 0.065);
  addPart(new THREE.BoxGeometry(0.026, 0.018, 0.026), darkMetal, 0, 0.056, -0.34);
  addPart(new THREE.BoxGeometry(0.005, 0.024, 0.006), accentMat, 0, 0.074, -0.34);
  // Holographic optic: mount + transparent lens + glowing reticle dot.
  addPart(new THREE.BoxGeometry(0.03, 0.012, 0.05), darkMetal, 0, 0.068, -0.1);
  addPart(new THREE.BoxGeometry(0.026, 0.028, 0.04), holoMat, 0, 0.088, -0.1);
  addPart(new THREE.BoxGeometry(0.005, 0.005, 0.005), holoDotMat, 0, 0.088, -0.1);
  addPart(new THREE.BoxGeometry(0.056, 0.068, 0.065), gloveMat, 0.006, -0.082, 0.078, -0.32);
  addPart(new THREE.BoxGeometry(0.068, 0.068, 0.26), sleeveMat, 0.065, -0.145, 0.21, 0.32, -0.28);
  addPart(new THREE.BoxGeometry(0.066, 0.055, 0.075), gloveMat, -0.01, -0.01, -0.24);
  addPart(new THREE.BoxGeometry(0.058, 0.055, 0.07), gloveMat, -0.06, -0.055, -0.19, 0.35, 0.45);
  addPart(new THREE.BoxGeometry(0.072, 0.068, 0.24), sleeveMat, -0.15, -0.14, -0.08, 0.45, 0.55);
  // Fingers: right hand wraps the grip, left hand cups the handguard.
  for (let f = 0; f < 4; f++) {
    addPart(new THREE.BoxGeometry(0.011, 0.032, 0.016), gloveMat, -0.018 + f * 0.012, -0.052, 0.052, -0.35);
  }
  addPart(new THREE.BoxGeometry(0.012, 0.03, 0.016), gloveMat, 0.03, -0.055, 0.062, -0.3, 0, 0.5);
  for (let f = 0; f < 4; f++) {
    addPart(new THREE.BoxGeometry(0.011, 0.014, 0.03), gloveMat, -0.0195 + f * 0.013, -0.048, -0.245, 0.15);
  }
  addPart(new THREE.BoxGeometry(0.012, 0.014, 0.032), gloveMat, 0.028, -0.038, -0.25, 0, 0, -0.4);

  // Ammo counter display: tiny screen on the receiver showing rounds left.
  const ammoCanvas = document.createElement('canvas');
  ammoCanvas.width = 64;
  ammoCanvas.height = 32;
  const ammoCtx = ammoCanvas.getContext('2d');
  const ammoTex = new THREE.CanvasTexture(ammoCanvas);
  let lastShownMag = -1;
  function drawAmmoDisplay(mag) {
    ammoCtx.fillStyle = '#0a0f14';
    ammoCtx.fillRect(0, 0, 64, 32);
    ammoCtx.strokeStyle = '#e29b28';
    ammoCtx.lineWidth = 2;
    ammoCtx.strokeRect(1, 1, 62, 30);
    ammoCtx.font = 'bold 20px monospace';
    ammoCtx.textAlign = 'center';
    ammoCtx.textBaseline = 'middle';
    ammoCtx.fillStyle = mag === 0 ? '#ea5455' : '#ffd875';
    ammoCtx.fillText(String(mag).padStart(2, '0'), 32, 17);
    ammoTex.needsUpdate = true;
    lastShownMag = mag;
  }
  const ammoScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.034, 0.017),
    new THREE.MeshBasicMaterial({ map: ammoTex })
  );
  ammoScreen.position.set(0, 0.056, 0.13);
  ammoScreen.rotation.x = -0.6;
  model.add(ammoScreen);
  drawAmmoDisplay(30);

  model.position.set(0.24, -0.2, -0.42);
  model.rotation.y = 0.05;
  camera.add(model);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.25),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })
  );
  flash.position.set(0.21, -0.17, -1.03);
  flash.visible = false;
  camera.add(flash);
  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 6);
  flashLight.position.set(0.21, -0.16, -0.7);
  camera.add(flashLight);

  // Aegis Phase Blade: vertical build — hilt below, flat energy blade rising
  // up-forward. Local +Y runs along the blade; the rest pose leans it forward.
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x062a33, emissive: 0x00e5ff, emissiveIntensity: 3.5, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85 });
  const bladeCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bladeGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x003344, emissive: 0x00e5ff, emissiveIntensity: 3.0, roughness: 0.2, metalness: 0.1 });
  const bladeModel = new THREE.Group();
  const addBladePart = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    bladeModel.add(m);
    return m;
  };
  // Hilt (below the guard) + pommel + emitter ring.
  addBladePart(new THREE.CylinderGeometry(0.016, 0.018, 0.16, 10), darkMetal, 0, -0.1, 0);
  addBladePart(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), darkMetal, 0, -0.19, 0);
  addBladePart(new THREE.TorusGeometry(0.019, 0.004, 8, 16), shinyMetal, 0, -0.05, 0, Math.PI / 2);
  // Angular crossguard: hexagonal bar + sharp end caps + plasma crystal.
  addBladePart(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), shinyMetal, 0, 0, 0, 0, 0, Math.PI / 2);
  addBladePart(new THREE.ConeGeometry(0.011, 0.035, 4), shinyMetal, -0.095, 0, 0, 0, 0, Math.PI / 2);
  addBladePart(new THREE.ConeGeometry(0.011, 0.035, 4), shinyMetal, 0.095, 0, 0, 0, 0, -Math.PI / 2);
  addBladePart(new THREE.OctahedronGeometry(0.024), crystalMat, 0, 0.02, 0);
  // Flat tapered blade: one extruded outline (wide base, sharp point),
  // white-hot core inside a cyan sheath, plus an additive glow shell.
  function bladeShape(scale) {
    const s = new THREE.Shape();
    s.moveTo(-0.028 * scale, 0);
    s.lineTo(0.028 * scale, 0);
    s.lineTo(0.02 * scale, 0.55);
    s.lineTo(0, 0.85);
    s.lineTo(-0.02 * scale, 0.55);
    s.closePath();
    return s;
  }
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape(1), { depth: 0.008, bevelEnabled: false });
  bladeGeo.translate(0, 0, -0.004);
  addBladePart(bladeGeo, bladeMat, 0, 0.04, 0);
  const coreGeo = new THREE.ExtrudeGeometry(bladeShape(0.45), { depth: 0.01, bevelEnabled: false });
  coreGeo.translate(0, 0, -0.005);
  addBladePart(coreGeo, bladeCoreMat, 0, 0.04, 0);
  const glowGeo = new THREE.ExtrudeGeometry(bladeShape(1.4), { depth: 0.02, bevelEnabled: false });
  glowGeo.translate(0, 0, -0.01);
  addBladePart(glowGeo, bladeGlowMat, 0, 0.04, 0);
  // Gloved right hand gripping the hilt + sleeve.
  addBladePart(new THREE.BoxGeometry(0.07, 0.08, 0.07), gloveMat, 0, -0.09, 0.025);
  for (let f = 0; f < 4; f++) {
    addBladePart(new THREE.BoxGeometry(0.015, 0.016, 0.034), gloveMat, -0.021 + f * 0.014, -0.09, 0.038, 0.3);
  }
  addBladePart(new THREE.BoxGeometry(0.014, 0.034, 0.018), gloveMat, 0.036, -0.07, 0.018, 0, 0, -0.5);
  addBladePart(new THREE.BoxGeometry(0.08, 0.26, 0.075), sleeveMat, 0.08, -0.26, 0.06, 0.3, 0, -0.3);
  const bladeLight = new THREE.PointLight(0x00e5ff, 1.5, 3.5);
  bladeLight.position.set(0, 0.35, 0.05);
  bladeModel.add(bladeLight);
  bladeModel.position.set(0.42, -0.35, -0.55);
  bladeModel.rotation.set(0.35, -0.25, 0.25);
  bladeModel.visible = false;
  camera.add(bladeModel);

  // Slash trail: a straight diagonal light band (outer glow + white core)
  // that sweeps with the blade, same direction as the cut.
  const trailOuterMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const trailInnerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const trail = new THREE.Group();
  const trailOuter = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), trailOuterMat);
  const trailInner = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.045), trailInnerMat);
  trailInner.position.z = 0.002;
  trail.add(trailOuter, trailInner);
  trail.position.set(0, -0.08, -0.7);
  trail.rotation.z = -0.65;
  trail.visible = false;
  camera.add(trail);

  let currentType = WEAPON_TYPES.rifle;
  let primaryId = 'rifle';
  let aimT = 0;
  let swingT = 0;
  let thrustT = 0;
  let raiseT = 0;
  const SWING_DUR = 0.3;
  const THRUST_DUR = 0.35;
  const RAISE_DUR = 0.22;
  // Per-weapon ammo persists across switches; the blade is always owned.
  const ammoStore = {};
  for (const [id, cfg] of Object.entries(WEAPON_TYPES)) {
    ammoStore[id] = { mag: cfg.magSize, reserve: cfg.reserveMax };
  }
  const state = {
    type: currentType,
    mag: currentType.magSize,
    reserve: currentType.reserveMax,
    cooldown: 0,
    reloadLeft: 0,
    flash: 0,
    kick: 0,
  };

  function equip(weaponId) {
    if (!WEAPON_TYPES[weaponId]) return;
    ammoStore[currentType.id].mag = state.mag;
    ammoStore[currentType.id].reserve = state.reserve;
    currentType = WEAPON_TYPES[weaponId];
    state.type = currentType;
    state.mag = ammoStore[weaponId].mag;
    state.reserve = ammoStore[weaponId].reserve;
    state.cooldown = 0;
    state.reloadLeft = 0;
    if (state.mag !== lastShownMag) drawAmmoDisplay(state.mag);
    const isBlade = weaponId === 'blade';
    model.visible = !isBlade;
    bladeModel.visible = isBlade;
    trail.visible = false;
    swingT = 0;
    thrustT = 0;
    raiseT = RAISE_DUR;
    const s = weaponId === 'smg' ? 0.85 : 1.0;
    model.scale.set(s, s, s);
  }

  function startSwing() {
    if (!currentType.melee || state.cooldown > 0) return false;
    swingT = SWING_DUR;
    state.cooldown = currentType.fireGap;
    return true;
  }

  function startThrust() {
    if (!currentType.melee || state.cooldown > 0) return false;
    thrustT = THRUST_DUR;
    state.cooldown = 0.8;
    return true;
  }

  function getSpeedBonus() {
    return currentType.melee ? 1.15 : 1;
  }

  // Buying gives fresh full ammo and (for rifle/smg) replaces the primary.
  function buy(weaponId) {
    if (!WEAPON_TYPES[weaponId]) return;
    const cfg = WEAPON_TYPES[weaponId];
    ammoStore[weaponId].mag = cfg.magSize;
    ammoStore[weaponId].reserve = cfg.reserveMax;
    if (weaponId !== 'blade') primaryId = weaponId;
    equip(weaponId);
  }

  function isOwned(weaponId) {
    return weaponId === 'blade' || weaponId === primaryId;
  }

  function switchTo(weaponId) {
    if (!isOwned(weaponId) || weaponId === currentType.id) return false;
    equip(weaponId);
    state.cooldown = Math.max(state.cooldown, 0.25);
    return true;
  }

  function getOwnedIds() {
    return [primaryId, 'blade'];
  }

  function step(dt, aiming = false) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 16);
    raiseT = Math.max(0, raiseT - dt);
    const raiseDip = (raiseT / RAISE_DUR) * (raiseT / RAISE_DUR) * 0.12;
    if (state.mag !== lastShownMag) drawAmmoDisplay(state.mag);
    // Aim-down-sights: slide the model to center so the sights line up.
    aimT += ((aiming ? 1 : 0) - aimT) * Math.min(1, dt * 14);
    model.position.x = 0.24 * (1 - aimT);
    model.position.y = -0.2 + 0.126 * aimT - raiseDip;
    model.position.z = -0.42 + state.kick;
    model.rotation.y = 0.05 * (1 - aimT);
    model.rotation.x = state.kick * 2.2;
    flash.position.x = 0.21 * (1 - aimT);
    flash.position.y = -0.17 + 0.096 * aimT;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 3.0 : 0;
    // Phase Blade: 3-phase slash (wind-up 40ms / slash 110ms / recovery
    // 150ms), heavy thrust lunge, and the ready pose. Trail follows the arc.
    if (currentType.melee) {
      if (thrustT > 0) {
        thrustT = Math.max(0, thrustT - dt);
        const q = 1 - thrustT / THRUST_DUR;
        const e = q < 0.3 ? (q / 0.3) * (q / 0.3) : 1 - ((q - 0.3) / 0.7) * ((q - 0.3) / 0.7);
        bladeModel.position.set(0.42 - 0.24 * e, -0.35, -0.55 - 0.33 * e);
        bladeModel.rotation.set(0.35 + 0.8 * e, -0.25 + 0.2 * e, 0.25 - 0.2 * e);
        trail.visible = false;
      } else if (swingT > 0) {
        swingT = Math.max(0, swingT - dt);
        const p = 1 - swingT / SWING_DUR;
        let px; let py; let pz; let rx; let ry; let rz;
        if (p < 0.133) {
          const t = p / 0.133;
          const e = 1 - (1 - t) * (1 - t);
          px = 0.42 + 0.08 * e; py = -0.35 + 0.15 * e; pz = -0.55;
          rx = 0.35 + 0.2 * e; ry = -0.25 - 0.1 * e; rz = 0.25 + 0.25 * e;
          trail.visible = false;
        } else if (p < 0.5) {
          const t = (p - 0.133) / 0.367;
          const e = t * t;
          px = 0.5 - 0.62 * e; py = -0.2 - 0.3 * e; pz = -0.55 + 0.05 * e;
          rx = 0.55 - 0.7 * e; ry = -0.35 + 0.3 * e; rz = 0.5 - 1.65 * e;
          trail.visible = true;
          const env = Math.sin(Math.PI * Math.min(1, t * 1.15));
          trailOuterMat.opacity = 0.5 * env;
          trailInnerMat.opacity = 0.85 * env;
          trail.position.set(0.12 - 0.24 * t, 0.06 - 0.28 * t, -0.7);
        } else {
          const t = (p - 0.5) / 0.5;
          const e = 1 - Math.pow(1 - t, 3);
          px = -0.12 + 0.54 * e; py = -0.5 + 0.15 * e; pz = -0.5 - 0.05 * e;
          rx = -0.15 + 0.5 * e; ry = -0.05 - 0.2 * e; rz = -1.15 + 1.4 * e;
          trail.visible = t < 0.4;
          const fade = t < 0.4 ? 1 - t / 0.4 : 0;
          trailOuterMat.opacity = 0.5 * fade;
          trailInnerMat.opacity = 0.85 * fade;
        }
        bladeModel.position.set(px, py, pz);
        bladeModel.rotation.set(rx, ry, rz);
      } else {
        bladeModel.position.set(0.42, -0.35, -0.55);
        bladeModel.rotation.set(0.35, -0.25, 0.25);
        trail.visible = false;
        trailOuterMat.opacity = 0;
        trailInnerMat.opacity = 0;
      }
      bladeModel.position.y -= raiseDip;
    }
    if (state.reloadLeft > 0) {
      state.reloadLeft -= dt;
      if (state.reloadLeft <= 0) finishReload();
    }
  }

  function finishReload() {
    const needed = currentType.magSize - state.mag;
    const taken = Math.min(needed, state.reserve);
    state.mag += taken;
    state.reserve -= taken;
    state.reloadLeft = 0;
  }

  function reload() {
    if (state.reloadLeft > 0 || state.mag === currentType.magSize || state.reserve <= 0) return false;
    state.reloadLeft = currentType.reloadTime;
    return true;
  }

  function pullTrigger() {
    state.cooldown = currentType.fireGap;
    state.flash = 0.055;
    state.kick = Math.min(0.12, state.kick + currentType.kickAmt);
  }

  function takeRound() {
    if (state.reloadLeft > 0 || state.cooldown > 0) return false;
    if (state.mag <= 0) {
      if (state.reserve > 0) reload();
      return false;
    }
    state.mag -= 1;
    if (state.mag !== lastShownMag) drawAmmoDisplay(state.mag);
    return true;
  }

  function ready() {
    return state.cooldown <= 0 && state.reloadLeft <= 0 && state.mag > 0;
  }

  function spread(moveSpeed) {
    const factor = Math.min(1, moveSpeed / 5.2);
    return currentType.spreadStill + (currentType.spreadMoving - currentType.spreadStill) * factor;
  }

  function refill() {
    for (const [id, cfg] of Object.entries(WEAPON_TYPES)) {
      ammoStore[id].mag = cfg.magSize;
      ammoStore[id].reserve = cfg.reserveMax;
    }
    state.mag = currentType.magSize;
    state.reserve = currentType.reserveMax;
    state.cooldown = 0;
    state.reloadLeft = 0;
  }

  function getMuzzleWorldPosition(out) {
    return muzzleTip.getWorldPosition(out);
  }

  return {
    state,
    equip,
    buy,
    switchTo,
    isOwned,
    getOwnedIds,
    getPrimary() { return primaryId; },
    step,
    pullTrigger,
    takeRound,
    ready,
    reload,
    refill,
    spread,
    getMuzzleWorldPosition,
    getType() { return currentType; },
    startSwing,
    startThrust,
    getSpeedBonus,
  };
}
