// Tactical AI Bots: 5v5 (4 Friendly Assault + 5 Enemy Defenders)
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { playGunshot, playHit, playFootstep, playBotDeath, playBulletWhiz, emitLoudEvent, drainLoudEvents } from './audio.js';

export function createBotManager(scene, colliders, waypoints) {
  const assaultMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.assaultTeam), roughness: 0.5, metalness: 0.2 });
  const defenderMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.defenderTeam), roughness: 0.5, metalness: 0.2 });
  const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.4 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.6 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.55, metalness: 0.25 });
  const helmetMatAssault = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.55, metalness: 0.25 });
  const helmetMatDefender = new THREE.MeshStandardMaterial({ color: 0x2a3442, roughness: 0.55, metalness: 0.25 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.85, metalness: 0.05 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 0.9, metalness: 0.05 });

  const torsoGeo = new THREE.BoxGeometry(0.5, 0.75, 0.3);
  const headGeo = new THREE.SphereGeometry(0.16, 16, 12);
  const gunGeo = new THREE.BoxGeometry(0.08, 0.08, 0.38);
  const helmetGeo = new THREE.SphereGeometry(0.185, 16, 10);
  const visorGeo = new THREE.BoxGeometry(0.22, 0.08, 0.05);
  const visorMatAssault = new THREE.MeshStandardMaterial({ color: 0x0a0f14, emissive: 0x22d3ee, emissiveIntensity: 2.2, roughness: 0.3 });
  const visorMatDefender = new THREE.MeshStandardMaterial({ color: 0x0a0f14, emissive: 0xff2222, emissiveIntensity: 2.2, roughness: 0.3 });
  const vestGeo = new THREE.BoxGeometry(0.46, 0.55, 0.1);
  const padGeo = new THREE.BoxGeometry(0.14, 0.1, 0.2);
  const legGeo = new THREE.BoxGeometry(0.16, 0.58, 0.16);
  const armGeo = new THREE.BoxGeometry(0.1, 0.1, 0.32);
  const packGeo = new THREE.BoxGeometry(0.3, 0.4, 0.12);

  const bots = [];
  const hitMeshes = [];
  const losRay = new THREE.Ray();
  const losHit = new THREE.Vector3();
  const dirVector = new THREE.Vector3();
  const forwardVector = new THREE.Vector3();
  const _muzzle = new THREE.Vector3();
  const _end = new THREE.Vector3();
  const _soundPos = new THREE.Vector3();
  const lastEye = new THREE.Vector3();
  let lastYaw = 0;
  let simTime = 0;

  // Stereo pan + distance gain of a sound at fromPos, heard by a player at
  // playerPos facing playerYaw. Right vector = (cos yaw, 0, -sin yaw).
  function panAndGain(fromPos, playerPos, playerYaw) {
    const dx = fromPos.x - playerPos.x;
    const dz = fromPos.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    const pan = dist > 0.01
      ? (dx * Math.cos(playerYaw) + dz * -Math.sin(playerYaw)) / dist
      : 0;
    return { pan: Math.max(-1, Math.min(1, pan)), gain: Math.max(0.12, 1 - dist / 45), dist };
  }

  function createBotMesh(team, name) {
    const group = new THREE.Group();
    const torso = new THREE.Mesh(torsoGeo, team === 'assault' ? assaultMat : defenderMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.userData.part = 'torso';

    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.castShadow = true;
    head.receiveShadow = true;
    head.userData.part = 'head';

    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.24, 0.95, 0.28);
    gun.castShadow = true;

    // Soldier kit: helmet, visor, vest, legs, arms, backpack. Decorative
    // only — hit detection still uses the torso/head meshes above.
    const helmet = new THREE.Mesh(helmetGeo, team === 'assault' ? helmetMatAssault : helmetMatDefender);
    helmet.scale.y = 0.72;
    helmet.position.y = 1.57;
    helmet.castShadow = true;
    const visor = new THREE.Mesh(visorGeo, team === 'assault' ? visorMatAssault : visorMatDefender);
    visor.position.set(0, 1.52, 0.14);
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.set(0, 0.95, 0.15);
    const padL = new THREE.Mesh(padGeo, vestMat);
    padL.position.set(-0.29, 1.32, 0);
    const padR = new THREE.Mesh(padGeo, vestMat);
    padR.position.set(0.29, 1.32, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.13, 0.29, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.set(0.13, 0.29, 0);
    legR.castShadow = true;
    const armL = new THREE.Mesh(armGeo, team === 'assault' ? assaultMat : defenderMat);
    armL.position.set(-0.27, 0.98, 0.12);
    armL.rotation.y = -0.25;
    const armR = new THREE.Mesh(armGeo, team === 'assault' ? assaultMat : defenderMat);
    armR.position.set(0.27, 0.98, 0.16);
    armR.rotation.y = 0.15;
    const pack = new THREE.Mesh(packGeo, vestMat);
    pack.position.set(0, 1.0, -0.2);

    // Floating name tag: always faces the camera, occluded by walls.
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const lctx = labelCanvas.getContext('2d');
    lctx.font = 'bold 34px sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.lineWidth = 7;
    lctx.strokeStyle = 'rgba(0,0,0,0.85)';
    lctx.strokeText(name, 128, 32);
    lctx.fillStyle = team === 'assault' ? '#f5b04c' : '#6cb2ff';
    lctx.fillText(name, 128, 32);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, depthTest: true, transparent: true }));
    label.name = 'nametag';
    label.scale.set(1.5, 0.375, 1);
    label.position.y = 2.05;
    group.add(label);

    group.add(torso, head, gun, helmet, visor, vest, padL, padR, legL, legR, armL, armR, pack);
    // Proportional soldier height: ~1.85m.
    group.scale.setScalar(1.12);
    scene.add(group);
    return { group, torso, head, gun };
  }

  function initBots() {
    // 6 Friendly bots (Assault) + the player = 7v7
    for (let i = 0; i < 6; i++) {
      const meshObj = createBotMesh('assault', `Apex-${i + 1}`);
      const bot = {
        id: `friendly_${i}`,
        name: `Apex-${i + 1}`,
        team: 'assault',
        mesh: meshObj.group,
        torso: meshObj.torso,
        head: meshObj.head,
        health: 100,
        alive: true,
        spawnPos: waypoints.assaultSpawns[i + 1].clone(),
        currentWaypoints: [],
        wpIndex: 0,
        target: null,
        reactionTimer: 0.3,
        fireCooldown: 0,
        burstCount: 0,
        objTimer: 0,
        stepAcc: 0,
        investigatePos: null,
        investigateTimer: 0,
        pauseTimer: 0,
        holdYaw: 0,
        holdPhase: i * 1.1,
        deathT: 0,
      };
      meshObj.torso.userData.bot = bot;
      meshObj.head.userData.bot = bot;
      hitMeshes.push(meshObj.torso, meshObj.head);
      bots.push(bot);
    }

    // 7 Enemy bots (Defender)
    for (let i = 0; i < 7; i++) {
      const meshObj = createBotMesh('defender', `Viper-${i + 1}`);
      const bot = {
        id: `enemy_${i}`,
        name: `Viper-${i + 1}`,
        team: 'defender',
        mesh: meshObj.group,
        torso: meshObj.torso,
        head: meshObj.head,
        health: 100,
        alive: true,
        spawnPos: waypoints.defenderSpawns[i].clone(),
        currentWaypoints: [],
        wpIndex: 0,
        target: null,
        reactionTimer: 0.35,
        fireCooldown: 0,
        burstCount: 0,
        objTimer: 0,
        stepAcc: 0,
        investigatePos: null,
        investigateTimer: 0,
        pauseTimer: 0,
        holdYaw: 0,
        holdPhase: i * 1.3 + 0.5,
        deathT: 0,
      };
      meshObj.torso.userData.bot = bot;
      meshObj.head.userData.bot = bot;
      hitMeshes.push(meshObj.torso, meshObj.head);
      bots.push(bot);
    }
  }
  initBots();

  function resetRound(activeSite) {
    for (const b of bots) {
      b.health = 100;
      b.alive = true;
      b.target = null;
      b.reactionTimer = 0.3 + Math.random() * 0.15;
      b.fireCooldown = 0;
      b.burstCount = 0;
      b.objTimer = 0;
      b.stepAcc = 0;
      b.investigatePos = null;
      b.investigateTimer = 0;
      b.pauseTimer = 0;
      b.holdYaw = 0;
      b.deathT = 0;
      b.lastHitter = null;
      b.lastHitT = 0;
      b.mesh.rotation.set(0, 0, 0);
      const tag = b.mesh.getObjectByName('nametag');
      if (tag) tag.visible = true;
      b.mesh.position.copy(b.spawnPos);
      b.wpIndex = 0;

      if (b.team === 'assault') {
        const routes = activeSite === 'A' ? waypoints.routesToA : waypoints.routesToB;
        b.currentWaypoints = routes[Math.floor(Math.random() * routes.length)];
      } else {
        const patrol = Math.random() > 0.5 ? waypoints.defenderPatrolA : waypoints.defenderPatrolB;
        b.currentWaypoints = patrol;
      }
    }
  }

  function hasLineOfSight(fromPos, toPos, botRotY) {
    dirVector.subVectors(toPos, fromPos);
    const dist = dirVector.length();
    if (dist < 0.1 || dist > 45) return false;
    dirVector.normalize();

    // Field of view (FOV) check: ~90 degree view cone
    forwardVector.set(Math.sin(botRotY), 0, Math.cos(botRotY));
    const dot = forwardVector.dot(dirVector);
    if (dist > 3.5 && dot < 0.1) return false;

    losRay.set(fromPos, dirVector);
    for (const box of colliders) {
      const hit = losRay.intersectBox(box, losHit);
      if (hit && losHit.distanceTo(fromPos) < dist - 0.2) return false;
    }
    return true;
  }

  function findTarget(bot, playerPos, playerAlive) {
    const eyePos = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    if (bot.team === 'defender' && playerAlive) {
      if (hasLineOfSight(eyePos, playerPos, bot.mesh.rotation.y)) {
        return { isPlayer: true, pos: playerPos };
      }
    }
    const enemyTeam = bot.team === 'assault' ? 'defender' : 'assault';
    for (const other of bots) {
      if (other.alive && other.team === enemyTeam) {
        const otherEye = other.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        if (hasLineOfSight(eyePos, otherEye, bot.mesh.rotation.y)) {
          return { isPlayer: false, bot: other, pos: otherEye };
        }
      }
    }
    return null;
  }

  function step(dt, playerPos, playerAlive, onPlayerDamaged, onKillFeed, bombRef, playerYaw = 0, onBotShot = null) {
    simTime += dt;
    lastEye.copy(playerPos);
    lastYaw = playerYaw;
    const sounds = drainLoudEvents();
    for (const bot of bots) {
      if (!bot.alive) {
        // Death fall: ease the body to the ground over ~0.35s, then lie still.
        if (bot.deathT < 1) {
          bot.deathT = Math.min(1, bot.deathT + dt / 0.35);
          const e = 1 - (1 - bot.deathT) * (1 - bot.deathT);
          bot.mesh.rotation.x = (-Math.PI / 2) * e;
          bot.mesh.position.y = 0.2 * e;
        }
        continue;
      }
      bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);

      // If bomb is planted, defenders redirect waypoints to bomb position
      if (bot.team === 'defender' && bombRef && bombRef.state.status === 'PLANTED' && bot.currentWaypoints[bot.currentWaypoints.length - 1] !== bombRef.state.plantedPos) {
        bot.currentWaypoints = [bombRef.state.plantedPos];
        bot.wpIndex = 0;
      }
      // If bomb is planted, distant attackers rotate back to defend the site
      if (bot.team === 'assault' && bombRef && bombRef.state.status === 'PLANTED' && bot.currentWaypoints[bot.currentWaypoints.length - 1] !== bombRef.state.plantedPos) {
        if (bot.mesh.position.distanceTo(bombRef.state.plantedPos) > 12) {
          bot.currentWaypoints = [bombRef.state.plantedPos];
          bot.wpIndex = 0;
          bot.investigatePos = null;
        }
      }

      // Check vision / targeting
      const target = findTarget(bot, playerPos, playerAlive);
      if (target) {
        bot.objTimer = 0;
        const eyePos = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const aimDir = target.pos.clone().sub(eyePos).normalize();
        bot.mesh.rotation.y = Math.atan2(aimDir.x, aimDir.z);

        bot.reactionTimer -= dt;
        if (bot.reactionTimer <= 0 && bot.fireCooldown <= 0) {
          bot.fireCooldown = 0.12;
          bot.burstCount += 1;
          const dist = eyePos.distanceTo(target.pos);
          const heard = panAndGain(eyePos, playerPos, playerYaw);
          playGunshot('rifle', heard.pan, heard.gain);
          emitLoudEvent(eyePos.x, eyePos.y, eyePos.z, 30, 'shot');
          const hitChance = Math.max(0.2, 0.7 - dist * 0.015);
          const shotHit = Math.random() < hitChance;
          if (onBotShot) {
            _muzzle.copy(eyePos);
            _muzzle.y = bot.mesh.position.y + 1.0;
            _muzzle.addScaledVector(aimDir, 0.5);
            _end.copy(target.pos);
            if (!shotHit) {
              _end.x += (Math.random() - 0.5) * 1.6;
              _end.y += (Math.random() - 0.5) * 1.2;
              _end.z += (Math.random() - 0.5) * 1.6;
            }
            onBotShot(_muzzle, _end);
            // Near miss on the player: bullet crack/whiz past the ears.
            // Floor the gain: a miss this close must always be heard.
            if (!shotHit && target.isPlayer) {
              const whiz = panAndGain(_end, playerPos, playerYaw);
              playBulletWhiz(whiz.pan, Math.max(0.65, whiz.gain));
            }
          }
          if (shotHit) {
            const headshot = Math.random() < 0.25;
            const dmg = headshot ? 70 : 25;
            if (target.isPlayer) {
              onPlayerDamaged(dmg, bot.name, headshot);
            } else if (target.bot) {
              damageBot(target.bot, dmg, bot.name, 'Kestrel-7', headshot, onKillFeed);
            }
          }
          if (bot.burstCount >= 3) {
            bot.fireCooldown = 0.45;
            bot.burstCount = 0;
            bot.reactionTimer = 0.2;
          }
        }
      } else {
        bot.reactionTimer = 0.3;
        bot.burstCount = 0;

        // Hearing: no visual target, but a nearby sound raises alert and
        // sends the bot to investigate. Gunshots carry; footsteps only
        // register close by. Sounds within 1.5m are the bot's own noise.
        if (sounds.length > 0) {
          for (const s of sounds) {
            const dx = s.x - bot.mesh.position.x;
            const dz = s.z - bot.mesh.position.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < 2.25) continue;
            const hearR = s.kind === 'shot' ? s.radius : Math.min(s.radius, 8);
            if (d2 < hearR * hearR) {
              if (!bot.investigatePos) bot.investigatePos = new THREE.Vector3();
              bot.investigatePos.set(s.x, 0, s.z);
              bot.investigateTimer = 0;
              bot.holdYaw = bot.mesh.rotation.y;
              bot.reactionTimer = Math.min(bot.reactionTimer, 0.15);
              break;
            }
          }
        }

        // Bot tactical objective interaction
        if (bombRef) {
          if (bot.team === 'assault' && bombRef.state.status === 'CARRIED' && bombRef.inSiteZone(bot.mesh.position)) {
            bot.objTimer += dt;
            if (bot.objTimer >= 3.0) {
              bombRef.plant(bot.mesh.position);
              if (onKillFeed) onKillFeed(bot.name, 'Site ' + bombRef.state.activeSite, 'BOMB PLANT', false);
            }
          } else if (bot.team === 'defender' && bombRef.state.status === 'PLANTED' && bombRef.inDefuseZone(bot.mesh.position)) {
            bot.objTimer += dt;
            if (bot.objTimer >= 5.0) {
              bombRef.defuse();
              if (onKillFeed) onKillFeed(bot.name, 'Defuse Kit', 'BOMB DEFUSE', false);
            }
          }
        }

        // Investigate a heard sound first: walk to it, look around 2s, resume.
        if (bot.investigatePos) {
          _soundPos.copy(bot.investigatePos).sub(bot.mesh.position);
          _soundPos.y = 0;
          const sDist = _soundPos.length();
          if (sDist < 1.5) {
            bot.investigateTimer += dt;
            bot.mesh.rotation.y = bot.holdYaw + Math.sin(bot.investigateTimer * 2.2) * 0.6;
            if (bot.investigateTimer >= 2.0) bot.investigatePos = null;
          } else {
            _soundPos.normalize();
            bot.mesh.position.addScaledVector(_soundPos, dt * 3.6);
            bot.mesh.rotation.y = Math.atan2(_soundPos.x, _soundPos.z);
            bot.stepAcc += dt * 3.6;
            if (bot.stepAcc >= 2.2) {
              bot.stepAcc = 0;
              const bp = bot.mesh.position;
              const d = Math.hypot(bp.x - playerPos.x, bp.z - playerPos.z);
              if (d < 30) {
                const heard = panAndGain(bp, playerPos, playerYaw);
                playFootstep(heard.pan, 0.12 * (1 - d / 30));
              }
              emitLoudEvent(bp.x, bp.y, bp.z, 14, 'step');
            }
          }
        } else if (bot.currentWaypoints && bot.wpIndex < bot.currentWaypoints.length) {
          // Route pause: attackers advance route-by-route with short holds.
          if (bot.pauseTimer > 0) {
            bot.pauseTimer -= dt;
          } else {
            const wp = bot.currentWaypoints[bot.wpIndex];
            const toWp = wp.clone().sub(bot.mesh.position);
            toWp.y = 0;
            const dist = toWp.length();
            if (dist < 1.0) {
              bot.wpIndex += 1;
              if (bot.team === 'assault' && bot.wpIndex < bot.currentWaypoints.length) {
                bot.pauseTimer = 1.2;
              } else if (bot.wpIndex >= bot.currentWaypoints.length) {
                bot.holdYaw = bot.mesh.rotation.y;
              }
            } else {
              toWp.normalize();
              bot.mesh.position.addScaledVector(toWp, dt * 3.6);
              bot.mesh.rotation.y = Math.atan2(toWp.x, toWp.z);
              bot.stepAcc += dt * 3.6;
              if (bot.stepAcc >= 2.2) {
                bot.stepAcc = 0;
                const bp = bot.mesh.position;
                const d = Math.hypot(bp.x - playerPos.x, bp.z - playerPos.z);
                if (d < 30) {
                  const heard = panAndGain(bp, playerPos, playerYaw);
                  playFootstep(heard.pan, 0.12 * (1 - d / 30));
                }
                emitLoudEvent(bp.x, bp.y, bp.z, 14, 'step');
              }
            }
          }
        } else {
          // End of route: hold the angle with a slow sweep.
          bot.mesh.rotation.y = bot.holdYaw + Math.sin(simTime * 0.6 + bot.holdPhase) * 0.5;
        }
      }
    }
  }

  function damageBot(bot, amount, killerName, weaponName, headshot, onKillFeed) {
    if (!bot || !bot.alive) return false;
    const heard = panAndGain(bot.mesh.position, lastEye, lastYaw);
    bot.health -= amount;
    playHit(headshot, heard.pan, heard.gain);
    if (bot.health <= 0) {
      bot.alive = false;
      bot.deathT = 0;
      const tag = bot.mesh.getObjectByName('nametag');
      if (tag) tag.visible = false;
      playBotDeath(heard.pan, heard.gain);
      // Assist: a different attacker damaged this bot within the last 5s.
      const assist = (bot.lastHitter && bot.lastHitter !== killerName && simTime - (bot.lastHitT || 0) < 5)
        ? bot.lastHitter : null;
      if (onKillFeed) onKillFeed(killerName, bot.name, weaponName, headshot, assist);
      return true;
    }
    bot.lastHitter = killerName;
    bot.lastHitT = simTime;
    return false;
  }

  function applyRadiusDamage(center, radius, maxDmg, killerName, onKillFeed) {
    for (const b of bots) {
      if (!b.alive) continue;
      const d = b.mesh.position.distanceTo(center);
      if (d <= radius) {
        const dmg = Math.floor(maxDmg * (1 - d / radius));
        damageBot(b, dmg, killerName, 'FRAG-4', false, onKillFeed);
      }
    }
  }

  return {
    bots,
    hitMeshes,
    resetRound,
    step,
    damageBot,
    applyRadiusDamage,
    aliveAssaultCount() { return bots.filter(b => b.alive && b.team === 'assault').length; },
    aliveDefenderCount() { return bots.filter(b => b.alive && b.team === 'defender').length; },
  };
}
