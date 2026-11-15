// Vanguard Breach: Tactical FPS - Core Simulation & Round Loop
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon, WEAPON_TYPES } from './weapon.js';
import { createBotManager } from './bots.js';
import { createBomb } from './bomb.js';
import { createGrenadeManager } from './grenade.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createFx } from './fx.js';
import { playGunshot, playHit, playReload, playBuy, playWin, playLose, playFootstep, playPlayerDeath, emitLoudEvent, playBladeSwoosh, playBladeHit, startBladeHum, stopBladeHum } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb84a39);
scene.fog = new THREE.Fog(0xb84a39, 30, 200);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);

const world = createWorld(scene);
const bomb = createBomb(scene, world.waypoints);
const bots = createBotManager(scene, world.colliders, world.waypoints);
const grenadeManager = createGrenadeManager(scene, world.colliders);
const player = createPlayer(world.colliders);
const weapon = createWeapon(camera);
const hud = createHud();
const minimap = createMinimap(world, player, bots, bomb);
const fx = createFx(scene);
const input = createInput(renderer.domElement, onLockChange);
let aimingNow = false;
const crosshairEl = document.getElementById('crosshair');

const raycaster = new THREE.Raycaster();
raycaster.far = 80;
const direction = new THREE.Vector3();
const muzzlePos = new THREE.Vector3();
const endPos = new THREE.Vector3();
const _meleeChest = new THREE.Vector3();
const _meleePush = new THREE.Vector3();
const _proj = new THREE.Vector3();
let stepTimer = 0;
let stepSide = 1;
const body = player.state;

let roundNumber = 1;
let scoreAssault = 0;
let scoreDefender = 0;
let roundPhase = 'FREEZE'; // 'FREEZE', 'LIVE', 'ROUND_OVER', 'MATCH_OVER'
let freezeTimer = 5.0;
let roundTimer = 100.0;
let roundOverTimer = 3.5;
let started = false;
let frozen = false;
let accumulator = 0;
let hitstopT = 0;
let prevAiming = false;
let lastTime = performance.now();

hud.setScore(scoreAssault, scoreDefender, roundNumber);
hud.setHealth(body.health, body.armor);
hud.setMoney(body.money);
hud.setAmmo(weapon.state.mag, weapon.state.reserve, weapon.getType());
hud.setGrenades(body.grenades);
hud.setWeaponSlots(weapon.getType().id, body.grenades, weapon.getOwnedIds());
hud.setAlivePips(7, 7);

hud.onPlay(() => {
  if (shot) return;
  if (input.isTouch) {
    started = true;
    hud.hideOverlay();
  } else {
    input.requestLock();
  }
});

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    hud.hideOverlay();
  } else if (roundPhase !== 'MATCH_OVER') {
    hud.showOverlay(started ? 'Paused' : 'Vanguard Breach', 'Click Deploy to engage combat.');
  }
}

function syncCamera() {
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
}

function startRound() {
  roundPhase = 'FREEZE';
  freezeTimer = 5.0;
  roundTimer = 100.0;
  roundOverTimer = 3.5;

  player.respawn(world.waypoints.assaultSpawns[0]);
  weapon.refill();
  grenadeManager.reset();
  bomb.resetRound(roundNumber);
  bots.resetRound(bomb.state.activeSite);

  hud.setScore(scoreAssault, scoreDefender, roundNumber);
  hud.setHealth(body.health, body.armor);
  hud.setMoney(body.money);
  hud.setAmmo(weapon.state.mag, weapon.state.reserve, weapon.getType());
  hud.setGrenades(body.grenades);
  syncBladeHum();
  hud.setWeaponSlots(weapon.getType().id, body.grenades, weapon.getOwnedIds());
  hud.setAlivePips(7, 7);
  hud.addRadioCallout('Apex-1', `Attacking Site ${bomb.state.activeSite} - stay together`);
  stepTimer = 0;
  hud.showBanner(`FREEZE TIME (5s) - BUY PHASE [B] - SITE ${bomb.state.activeSite} ACTIVE`, 4500);
  hud.toggleBuyMenu(true);
}

function endRound(winner, reason) {
  if (roundPhase === 'ROUND_OVER' || roundPhase === 'MATCH_OVER') return;
  roundPhase = 'ROUND_OVER';
  roundOverTimer = 3.5;
  hud.toggleBuyMenu(false);

  if (winner === 'assault') {
    scoreAssault += 1;
    player.addMoney(3250);
    playWin();
    hud.showBanner(`ROUND WON - ${reason.toUpperCase()} (+ $3250)`, 3500);
  } else {
    scoreDefender += 1;
    player.addMoney(1900);
    playLose();
    hud.showBanner(`ROUND LOST - ${reason.toUpperCase()} (+ $1900)`, 3500);
  }
  hud.setScore(scoreAssault, scoreDefender, roundNumber);
  hud.setMoney(body.money);

  if (scoreAssault >= 8 || scoreDefender >= 8) {
    roundPhase = 'MATCH_OVER';
    const matchWon = scoreAssault >= 8;
    hud.showOverlay(
      matchWon ? 'MATCH VICTORY!' : 'MATCH DEFEAT',
      `Final Score: Assault ${scoreAssault} - ${scoreDefender} Defenders.`,
      'Play Again'
    );
    input.exitLock();
  }
}

function buyAction(itemKey) {
  if (roundPhase !== 'FREEZE') {
    hud.showBanner('BUY PERIOD CLOSED', 1500);
    return;
  }
  if (itemKey === 'rifle' || itemKey === 'smg' || itemKey === 'blade') {
    const cfg = WEAPON_TYPES[itemKey];
    if (player.spendMoney(cfg.price)) {
      weapon.buy(itemKey);
      playBuy();
      hud.setAmmo(weapon.state.mag, weapon.state.reserve, cfg);
      hud.setMoney(body.money);
    }
  } else if (itemKey === 'he') {
    if (body.grenades < 1 && player.spendMoney(300)) {
      body.grenades = 1;
      playBuy();
      hud.setGrenades(body.grenades);
      hud.setMoney(body.money);
    }
  } else if (itemKey === 'kevlar') {
    if (body.armor < 100 && player.spendMoney(650)) {
      body.armor = 100;
      playBuy();
      hud.setHealth(body.health, body.armor);
      hud.setMoney(body.money);
    }
  }
  hud.setWeaponSlots(weapon.getType().id, body.grenades, weapon.getOwnedIds());
  syncBladeHum();
}
hud.onBuy(buyAction);

function refreshWeaponHud() {
  hud.setAmmo(weapon.state.mag, weapon.state.reserve, weapon.getType());
  hud.setWeaponSlots(weapon.getType().id, body.grenades, weapon.getOwnedIds());
  syncBladeHum();
}

function syncBladeHum() {
  if (weapon.getType().melee) startBladeHum();
  else stopBladeHum();
}

hud.onSlotSelect((id) => {
  if (roundPhase === 'FREEZE') {
    if (id === 'kit') buyAction('kevlar');
    else buyAction(id);
    return;
  }
  if (roundPhase !== 'LIVE' || !body.alive) return;
  if (id === 'he') { input.queueKey('KeyG'); return; }
  if (id === 'kit') return;
  if (weapon.switchTo(id)) refreshWeaponHud();
});

function checkRoundEnd() {
  if (roundPhase !== 'LIVE') return;
  if (bomb.state.status === 'DETONATED') {
    endRound('assault', 'Bomb Detonated');
    return;
  }
  if (bomb.state.status === 'DEFUSED') {
    endRound('defender', 'Bomb Defused');
    return;
  }
  const livingAssault = bots.aliveAssaultCount() + (body.alive ? 1 : 0);
  const livingDefenders = bots.aliveDefenderCount();

  if (livingDefenders === 0) {
    endRound('assault', 'Defenders Eliminated');
    return;
  }
  if (livingAssault === 0 && bomb.state.status !== 'PLANTED') {
    endRound('defender', 'Assault Eliminated');
    return;
  }
  if (roundTimer <= 0 && bomb.state.status !== 'PLANTED') {
    endRound('defender', 'Time Expired');
    return;
  }
}

// Match stats for the Tab scoreboard: K/D/A per operative.
const matchStats = new Map();
function statFor(name) {
  let s = matchStats.get(name);
  if (!s) { s = { k: 0, d: 0, a: 0 }; matchStats.set(name, s); }
  return s;
}
function isCombatant(name) {
  return name === 'You' || /^Apex-\d+$/.test(name) || /^Viper-\d+$/.test(name);
}
function recordKill(killer, victim, weapon, headshot, assist = null) {
  hud.addKillFeed(killer, victim, weapon, headshot);
  if (String(weapon).includes('BOMB') || !isCombatant(victim) || !isCombatant(killer)) return;
  statFor(killer).k += 1;
  statFor(victim).d += 1;
  if (assist && isCombatant(assist)) statFor(assist).a += 1;
}
let scoreboardOpen = false;
function buildRows(team) {
  const names = team === 'assault'
    ? ['You', 'Apex-1', 'Apex-2', 'Apex-3', 'Apex-4', 'Apex-5', 'Apex-6']
    : ['Viper-1', 'Viper-2', 'Viper-3', 'Viper-4', 'Viper-5', 'Viper-6', 'Viper-7'];
  return names
    .map((name) => {
      const s = statFor(name);
      return { name, k: s.k, d: s.d, a: s.a, money: name === 'You' ? `$${body.money}` : '—' };
    })
    .sort((a, b) => b.k - a.k || a.d - b.d);
}

function shootWeapon(spread) {
  if (weapon.getType().melee) return meleeAttack();
  if (!body.alive || !weapon.takeRound()) return false;
  camera.getWorldDirection(direction);
  direction.x += (random() * 2 - 1) * spread;
  direction.y += (random() * 2 - 1) * spread;
  direction.z += (random() * 2 - 1) * spread;
  direction.normalize();
  scene.updateMatrixWorld(true);

  raycaster.set(camera.position, direction);
  const shootables = world.shootables.concat(bots.hitMeshes);
  const hits = raycaster.intersectObjects(shootables, false);

  weapon.getMuzzleWorldPosition(muzzlePos);
  if (hits.length > 0) endPos.copy(hits[0].point);
  else endPos.copy(camera.position).addScaledVector(direction, 80);
  fx.spawnTracer(muzzlePos, endPos);
  fx.spawnFlash(muzzlePos);

  if (hits.length > 0) {
    const hitObj = hits[0].object;
    fx.spawnSparks(hits[0].point, hitObj.userData.bot ? 8 : 5);
    if (hitObj.userData.bot) {
      const targetBot = hitObj.userData.bot;
      const isHead = hitObj.userData.part === 'head';
      const dmg = isHead ? weapon.getType().damageHead : weapon.getType().damageTorso;
      const killed = bots.damageBot(
        targetBot,
        dmg,
        'You',
        weapon.getType().name,
        isHead,
        recordKill
      );
      if (killed) {
        player.addMoney(300);
        hud.setMoney(body.money);
      }
      hud.hitMarker(isHead, shot ? 3000 : 90);
    } else {
      fx.spawnDecal(hits[0].point, direction);
    }
  }

  weapon.pullTrigger();
  playGunshot(weapon.getType().id);
  player.recoil(0.012 + random() * 0.005, (random() * 2 - 1) * 0.004);
  hud.setAmmo(weapon.state.mag, weapon.state.reserve, weapon.getType());
  return true;
}

// Aegis Phase Blade: FLAT 2D cone sweep — horizontal XZ distance and the
// horizontal facing dot only, so the eye-height vs feet-height gap can
// never make a point-blank swing miss. Every enemy within 4.0m and
// dot > 0.45 (~63-degree half-angle) takes flat damage: 85 slash,
// 160 heavy thrust (1-hit kill). Floating damage numbers included.
function meleeAttack(heavy = false) {
  if (!body.alive) return false;
  if (heavy ? !weapon.startThrust() : !weapon.startSwing()) return false;
  playBladeSwoosh();
  camera.getWorldDirection(direction);
  scene.updateMatrixWorld(true);
  const eye = camera.position;
  const fwdLen = Math.hypot(direction.x, direction.z) || 1;
  const fwdX = direction.x / fwdLen;
  const fwdZ = direction.z / fwdLen;
  const dmg = heavy ? 160 : 85;
  let hitAny = false;
  for (const bot of bots.bots) {
    if (!bot.alive || bot.team !== 'defender') continue;
    const dx = bot.mesh.position.x - eye.x;
    const dz = bot.mesh.position.z - eye.z;
    const dist2d = Math.hypot(dx, dz);
    if (dist2d > 4.0) continue;
    const dot = dist2d < 0.01 ? 1 : (dx * fwdX + dz * fwdZ) / dist2d;
    if (dot <= 0.45) continue;
    const chest = _meleeChest.set(bot.mesh.position.x, bot.mesh.position.y + 1.06, bot.mesh.position.z);
    fx.spawnSparks(chest, 10, 0x00e5ff);
    const killed = bots.damageBot(bot, dmg, 'You', weapon.getType().name, false, recordKill);
    if (killed) {
      player.addMoney(300);
      hud.setMoney(body.money);
    }
    _proj.copy(chest).project(camera);
    if (_proj.z < 1) {
      hud.showDamageNumber(
        (_proj.x * 0.5 + 0.5) * window.innerWidth,
        (-_proj.y * 0.5 + 0.5) * window.innerHeight,
        heavy ? '-160 CRIT!' : '-85',
        heavy
      );
    }
    // Light knockback, clamped inside the arena.
    _meleePush.set(dx / (dist2d || 1), 0, dz / (dist2d || 1)).multiplyScalar(0.35);
    bot.mesh.position.x = Math.max(-24, Math.min(24, bot.mesh.position.x + _meleePush.x));
    bot.mesh.position.z = Math.max(-24, Math.min(24, bot.mesh.position.z + _meleePush.z));
    hitAny = true;
  }
  if (hitAny) {
    hud.hitMarker(true, shot ? 3000 : 120);
    playBladeHit();
    hitstopT = heavy ? 0.09 : 0.07;
  } else {
    raycaster.set(eye, direction);
    const wallHits = raycaster.intersectObjects(world.shootables, false);
    if (wallHits.length > 0 && wallHits[0].distance < 3.5) {
      fx.spawnSparks(wallHits[0].point, 6, 0x00e5ff);
    }
  }
  hud.setAmmo(weapon.state.mag, weapon.state.reserve, weapon.getType());
  return true;
}

function step(dt) {
  if (roundPhase === 'FREEZE') {
    freezeTimer -= dt;
    hud.setTimer(Math.ceil(freezeTimer), false, 'FREEZE');
    if (freezeTimer <= 0) {
      roundPhase = 'LIVE';
      hud.toggleBuyMenu(false);
      hud.showBanner(`ROUND LIVE - ATTACK SITE ${bomb.state.activeSite}`, 2500);
    }
  } else if (roundPhase === 'LIVE') {
    if (bomb.state.status !== 'PLANTED') {
      roundTimer = Math.max(0, roundTimer - dt);
      hud.setTimer(Math.ceil(roundTimer), roundTimer <= 15);
    } else {
      hud.setTimer(Math.ceil(bomb.state.detonationTimer), true, 'BOMB');
    }
  } else if (roundPhase === 'ROUND_OVER') {
    roundOverTimer -= dt;
    if (roundOverTimer <= 0) {
      roundNumber += 1;
      startRound();
    }
  }

  // Player input actions during round
  if (roundPhase === 'LIVE' && body.alive) {
    // Bomb planting (Assault) or Defusing (Defender)
    if (input.state.keys.has('KeyE')) {
      if (bomb.state.status === 'CARRIED' && bomb.inSiteZone(body.position)) {
        bomb.state.plantProgress += dt;
        hud.showBanner(`PLANTING BOMB... ${Math.floor((bomb.state.plantProgress / 3.0) * 100)}%`, 200);
        if (bomb.state.plantProgress >= 3.0) {
          bomb.plant(body.position);
          hud.showBanner('BOMB HAS BEEN PLANTED!', 3000);
          hud.addKillFeed('You', 'Site ' + bomb.state.activeSite, 'BOMB PLANT', false);
          hud.addRadioCallout('You', 'Bomb planted - hold the site!');
        }
      } else if (bomb.state.status === 'PLANTED' && bomb.inDefuseZone(body.position)) {
        bomb.state.defuseProgress += dt;
        hud.showBanner(`DEFUSING BOMB... ${Math.floor((bomb.state.defuseProgress / 5.0) * 100)}%`, 200);
        if (bomb.state.defuseProgress >= 5.0) {
          bomb.defuse();
          hud.showBanner('BOMB HAS BEEN DEFUSED!', 3000);
          hud.addKillFeed('You', 'Defuse Kit', 'BOMB DEFUSE', false);
          hud.addRadioCallout('You', 'Bomb defused - site clear!');
        }
      }
    } else {
      bomb.state.plantProgress = 0;
      bomb.state.defuseProgress = 0;
    }
  }

  if (roundPhase === 'LIVE' || roundPhase === 'ROUND_OVER') {
    player.step(dt, input.state.keys, weapon.getSpeedBonus());
    weapon.step(dt, aimingNow);
    bomb.step(dt);
    fx.update(dt);

    // Player footsteps: rhythmic thud every 380ms while moving (330ms
    // with the blade's +15% speed), quieter + slower crouched.
    if (body.alive && body.onGround && player.groundSpeed() > 1) {
      stepTimer += dt;
      const stepInterval = body.crouching ? 0.5 : weapon.getType().melee ? 0.33 : 0.38;
      if (stepTimer >= stepInterval) {
        stepTimer = 0;
        stepSide = -stepSide;
        playFootstep(stepSide * 0.15, body.crouching ? 0.12 : 0.3);
        emitLoudEvent(body.position.x, body.position.y, body.position.z, body.crouching ? 6 : 14, 'step');
      }
    } else {
      stepTimer = 0;
    }

    const eyePos = body.position.clone().add(new THREE.Vector3(0, body.eye, 0));
    bots.step(
      dt,
      eyePos,
      body.alive,
      (dmg, botName, headshot) => {
        const dead = player.takeDamage(dmg, headshot);
        hud.setHealth(body.health, body.armor);
        hud.hitMarker(headshot, 150);
        if (dead) {
          playPlayerDeath();
          recordKill(botName, 'You', 'Kestrel-7', headshot, null);
          hud.showBanner('YOU WERE ELIMINATED', 2500);
          hud.addRadioCallout('Apex-2', 'Man down - You are eliminated');
        }
      },
      (k, v, w, hs, assist) => recordKill(k, v, w, hs, assist),
      bomb,
      body.yaw,
      (from, to) => { fx.spawnTracer(from, to); fx.spawnFlash(from, 0.8); }
    );
    hud.setAlivePips(bots.aliveAssaultCount() + (body.alive ? 1 : 0), bots.aliveDefenderCount());

    grenadeManager.step(dt, (blastPos, rad, maxDmg) => {
      fx.spawnSmoke(blastPos, 6);
      fx.spawnSparks(blastPos, 10);
      // Radius damage to bots and player
      bots.applyRadiusDamage(blastPos, rad, maxDmg, 'You', (k, v, w, hs) => hud.addKillFeed(k, v, w, hs));
      const distToPlayer = body.position.distanceTo(blastPos);
      if (distToPlayer <= rad) {
        const pDmg = Math.floor(maxDmg * (1 - distToPlayer / rad));
        if (player.takeDamage(pDmg)) {
          hud.addKillFeed('Blast', 'You', 'FRAG-4', false);
        }
        hud.setHealth(body.health, body.armor);
      }
    });

    checkRoundEnd();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dtRaw = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  // Hitstop: a melee kill briefly freezes the simulation for impact.
  let dt = dtRaw;
  if (hitstopT > 0) {
    hitstopT -= dtRaw;
    dt = dtRaw * 0.1;
  }

  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);

    // Aim-down-sights: zoom FOV, hide the crosshair (the sights are the aim).
    // The blade has no ADS: right-click is the heavy thrust instead.
    aimingNow = input.state.aiming && body.alive && (roundPhase === 'LIVE' || roundPhase === 'ROUND_OVER') && !weapon.getType().melee;
    const aimingEdge = input.state.aiming && !prevAiming;
    prevAiming = input.state.aiming;
    if (aimingEdge && weapon.getType().melee && roundPhase === 'LIVE' && body.alive) {
      meleeAttack(true);
    }
    const targetFov = aimingNow ? 50 : 74;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14);
      camera.updateProjectionMatrix();
    }
    if (crosshairEl) crosshairEl.style.opacity = aimingNow ? '0' : '';

    // Weapon switching (LIVE only): Q / scroll wheel cycle, 1-3 direct, 4 = frag.
    if (roundPhase === 'LIVE' && body.alive) {
      const cycleOther = () => {
        const owned = weapon.getOwnedIds();
        return owned.find((id) => id !== weapon.getType().id);
      };
      if (input.justPressed('KeyQ')) {
        const other = cycleOther();
        if (other && weapon.switchTo(other)) refreshWeaponHud();
      }
      if (input.takeWheel() !== 0) {
        const other = cycleOther();
        if (other && weapon.switchTo(other)) refreshWeaponHud();
      }
      if (input.justPressed('Digit1') && weapon.switchTo('rifle')) refreshWeaponHud();
      if (input.justPressed('Digit2') && weapon.switchTo('smg')) refreshWeaponHud();
      if (input.justPressed('Digit3') && weapon.switchTo('blade')) refreshWeaponHud();
      if (input.justPressed('Digit4')) input.queueKey('KeyG');
    }

    if (input.justPressed('KeyB') && roundPhase === 'FREEZE') {
      hud.toggleBuyMenu(!hud.isBuyMenuOpen());
    }
    // Tab scoreboard.
    if (input.justPressed('Tab')) {
      scoreboardOpen = !scoreboardOpen;
      if (scoreboardOpen) hud.showScoreboard(buildRows('assault'), buildRows('defender'));
      else hud.hideScoreboard();
    }
    if (roundPhase === 'FREEZE') {
      if (input.justPressed('Digit1')) buyAction('rifle');
      if (input.justPressed('Digit2')) buyAction('smg');
      if (input.justPressed('Digit3')) buyAction('blade');
      if (input.justPressed('Digit4')) buyAction('he');
      if (input.justPressed('Digit5')) buyAction('kevlar');
    }

    if (input.justPressed('KeyG') && body.grenades > 0) {
      body.grenades -= 1;
      camera.getWorldDirection(direction);
      grenadeManager.throwGrenade(camera.position, direction);
      hud.setGrenades(body.grenades);
    }

    if (input.state.firing && weapon.ready()) {
      shootWeapon(weapon.spread(player.groundSpeed()) * (aimingNow ? 0.35 : 1));
    }
    if (input.justPressed('KeyR')) {
      if (weapon.reload()) playReload();
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }
  minimap.update(now);
  renderer.render(scene, camera);
}

function settle(steps) {
  for (let i = 0; i < steps; i++) step(FIXED_STEP);
}

function runShot(name) {
  hud.hideOverlay();
  body.pitch = 0;
  body.yaw = 0;

  if (name === 'buy') {
    // Scene 1: Buy Menu & team in spawn
    body.position.set(0, 0, 29);
    body.yaw = 0; // Face north down lane
    syncCamera();
    hud.toggleBuyMenu(true);
    hud.showBanner('FREEZE TIME — BUY PHASE [B]', 9999);
    hud.setScore(0, 0, 1);
    settle(10);
  } else if (name === 'combat' || name === 'play') {
    // Scene 2: Wide firefight down open Mid — bridge, lanes, horizon.
    roundPhase = 'LIVE';
    hud.toggleBuyMenu(false);
    body.position.set(0, 0, 18);
    body.yaw = 0;
    body.pitch = -0.03;
    syncCamera();
    settle(5);
    // Stage three defenders across the width: mid pair + east lane.
    const foes = bots.bots.filter((b) => b.team === 'defender');
    const staged = [[-4, -8], [4, -10], [14, -4]];
    staged.forEach(([sx, sz], i) => {
      const b = foes[i];
      if (!b) return;
      b.mesh.position.set(sx, 0, sz);
      b.mesh.rotation.y = Math.atan2(body.position.x - sx, body.position.z - sz);
    });
    const friend = bots.bots.find((b) => b.team === 'assault');
    if (friend) {
      friend.mesh.position.set(-2.5, 0, 13);
      friend.mesh.rotation.y = Math.PI;
    }
    shootWeapon(0);
    hud.hitMarker(true, 5000);
    hud.showBanner('ROUND LIVE — ATTACK SITE A', 9999);
    hud.addKillFeed('You', 'Viper-2', 'Kestrel-7', true);
    hud.addKillFeed('Apex-1', 'Viper-5', 'Kestrel-7', false);
    hud.setScore(2, 1, 4);
  } else if (name === 'plant') {
    // Scene 3: Bomb planted at Site A, beacon glowing, defender closing in
    roundPhase = 'LIVE';
    hud.toggleBuyMenu(false);
    body.position.set(-11.5, 0, -6.5);
    body.yaw = 0.66;
    body.pitch = -0.12;
    syncCamera();
    bomb.plant(new THREE.Vector3(-14, 0, -9.5));
    settle(20);
    const guard = bots.bots.filter((b) => b.team === 'defender')[2];
    if (guard) {
      guard.mesh.position.set(-17.5, 0, -13);
      guard.mesh.rotation.y = Math.atan2(body.position.x + 17.5, body.position.z + 13);
    }
    hud.setTimer(28, true, 'BOMB');
    hud.showBanner('BOMB PLANTED AT SITE A', 9999);
    hud.addKillFeed('You', 'Viper-3', 'Kestrel-7', false);
    hud.setScore(4, 3, 8);
  } else if (name === 'overview') {
    // Scene 4: High-ground overwatch from the climbable west balcony.
    roundPhase = 'LIVE';
    hud.toggleBuyMenu(false);
    body.position.set(-25, 0, -16);
    body.yaw = 0;
    syncCamera();
    settle(45);
    // Stage both teams on the WEST ground in the balcony's real sightline:
    // the 5m x=-8 wall hides anything staged in mid from this vantage.
    const ovFoes = bots.bots.filter((b) => b.team === 'defender');
    [[-14, -2], [-17, 3], [-11, -8]].forEach(([sx, sz], i) => {
      const b = ovFoes[i];
      if (!b) return;
      b.mesh.position.set(sx, 0, sz);
      b.mesh.rotation.y = Math.atan2(-24 - sx, -6 - sz);
    });
    const ovFriends = bots.bots.filter((b) => b.team === 'assault');
    [[-19, -4], [-13, 6]].forEach(([sx, sz], i) => {
      const b = ovFriends[i];
      if (!b) return;
      b.mesh.position.set(sx, 0, sz);
      b.mesh.rotation.y = Math.PI / 2;
    });
    // Vantage above the balcony deck: the deck railing stays in the
    // foreground while the eye clears the 5m interior walls, so the
    // whole arena, the staged battle and the horizon read in one frame.
    body.position.set(-24, 6, -6);
    body.yaw = -1.7;
    body.pitch = -0.28;
    syncCamera();
    hud.showBanner('HIGH GROUND — BALCONY OVERWATCH', 9999);
    hud.addKillFeed('Apex-2', 'Viper-4', 'Spectre-11', false);
    hud.addKillFeed('You', 'Viper-1', 'Kestrel-7', true);
    hud.setScore(2, 1, 4);
  } else if (name === 'blade') {
    // Hero variant: Aegis Phase Blade mid-slash against a close defender.
    // Two real swings: 85 + 85 = the staged foe dies and the kill feed
    // records a genuine blade kill.
    roundPhase = 'LIVE';
    hud.toggleBuyMenu(false);
    body.position.set(0, 0, 6);
    body.yaw = 0;
    body.pitch = -0.05;
    syncCamera();
    settle(5);
    weapon.equip('blade');
    refreshWeaponHud();
    const foe = bots.bots.filter((b) => b.team === 'defender')[0];
    if (foe) {
      foe.mesh.position.set(0.4, 0, 3.8);
      foe.mesh.rotation.y = Math.atan2(body.position.x - 0.4, body.position.z - 3.8);
    }
    shootWeapon(0);
    weapon.step(0.5, false);
    shootWeapon(0);
    weapon.step(0.12, false);
    hud.showBanner('ROUND LIVE — ATTACK SITE A', 9999);
    hud.setScore(2, 1, 4);
  } else if (name === 'win' || name === 'end') {
    // Scene 4: Match victory banner & score
    hud.toggleBuyMenu(false);
    body.position.set(0, 0, 10);
    body.yaw = 0;
    syncCamera();
    scoreAssault = 8;
    scoreDefender = 5;
    roundNumber = 13;
    hud.setScore(8, 5, 13);
    hud.showBanner('MATCH VICTORY! ASSAULT FORCES WIN 8 - 5', 9999);
    settle(10);
  }

  paintTwiceThenReady();
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint(now) {
    syncCamera();
    minimap.update(now);
    renderer.render(scene, camera);
    painted += 1;
    if (painted === 2) {
      window.__shotReady = true;
      frozen = true;
    } else {
      requestAnimationFrame(paint);
    }
  }
  requestAnimationFrame(paint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startRound();
syncCamera();
if (shot) runShot(shot);
else requestAnimationFrame(frame);
