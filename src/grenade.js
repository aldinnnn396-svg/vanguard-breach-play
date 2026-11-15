// Tactical HE Grenade: Physics arc, bounce against colliders, blast radius damage
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { playExplosion } from './audio.js';

export function createGrenadeManager(scene, colliders) {
  const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x2b382d, roughness: 0.6, metalness: 0.3 });
  const grenadeGeo = new THREE.DodecahedronGeometry(0.12);
  const flashMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9 });
  const flashGeo = new THREE.SphereGeometry(1.2, 16, 12);

  const activeGrenades = [];
  const activeExplosions = [];
  const tempBox = new THREE.Box3();

  function spawnExplosion(pos) {
    const mesh = new THREE.Mesh(flashGeo, flashMat.clone());
    mesh.position.copy(pos);
    scene.add(mesh);
    const light = new THREE.PointLight(new THREE.Color(PALETTE.accent), 4, 14);
    light.position.copy(pos);
    scene.add(light);
    activeExplosions.push({ mesh, light, life: 0.35, maxLife: 0.35 });
    playExplosion();
  }

  function throwGrenade(origin, forward) {
    const mesh = new THREE.Mesh(grenadeGeo, grenadeMat);
    mesh.position.copy(origin);
    mesh.castShadow = true;
    scene.add(mesh);
    const vel = forward.clone().multiplyScalar(19).add(new THREE.Vector3(0, 4.5, 0));
    activeGrenades.push({
      mesh,
      velocity: vel,
      fuse: 1.8,
      alive: true,
    });
  }

  function step(dt, onDamageCallback) {
    for (let i = activeGrenades.length - 1; i >= 0; i--) {
      const g = activeGrenades[i];
      g.fuse -= dt;
      if (g.fuse <= 0) {
        spawnExplosion(g.mesh.position);
        if (onDamageCallback) onDamageCallback(g.mesh.position, 6.5, 95);
        scene.remove(g.mesh);
        activeGrenades.splice(i, 1);
        continue;
      }
      g.velocity.y -= 20 * dt;
      const nextPos = g.mesh.position.clone().addScaledVector(g.velocity, dt);

      // Simple collision bounce against colliders
      tempBox.min.set(nextPos.x - 0.12, nextPos.y - 0.12, nextPos.z - 0.12);
      tempBox.max.set(nextPos.x + 0.12, nextPos.y + 0.12, nextPos.z + 0.12);
      let collided = false;
      for (const col of colliders) {
        if (tempBox.intersectsBox(col)) {
          collided = true;
          g.velocity.y = Math.abs(g.velocity.y) * 0.45;
          g.velocity.x *= 0.65;
          g.velocity.z *= 0.65;
          break;
        }
      }
      if (!collided && nextPos.y > 0.1) {
        g.mesh.position.copy(nextPos);
      } else if (nextPos.y <= 0.1) {
        g.mesh.position.y = 0.12;
        g.velocity.y = Math.abs(g.velocity.y) * 0.35;
        g.velocity.x *= 0.7;
        g.velocity.z *= 0.7;
      }
      g.mesh.rotation.x += dt * 8;
      g.mesh.rotation.z += dt * 6;
    }

    // Update active visual explosions
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
      const exp = activeExplosions[i];
      exp.life -= dt;
      const progress = 1 - (exp.life / exp.maxLife);
      exp.mesh.scale.setScalar(1 + progress * 3.5);
      exp.mesh.material.opacity = Math.max(0, 1 - progress);
      exp.light.intensity = Math.max(0, (1 - progress) * 4);
      if (exp.life <= 0) {
        scene.remove(exp.mesh);
        scene.remove(exp.light);
        activeExplosions.splice(i, 1);
      }
    }
  }

  function reset() {
    for (const g of activeGrenades) scene.remove(g.mesh);
    activeGrenades.length = 0;
    for (const exp of activeExplosions) {
      scene.remove(exp.mesh);
      scene.remove(exp.light);
    }
    activeExplosions.length = 0;
  }

  return { throwGrenade, step, reset };
}
