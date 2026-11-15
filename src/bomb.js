// Tactical Objective: Bomb Plant & Defuse (One site per round, alternating A/B)
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { playBombBeep, playExplosion } from './audio.js';

export function createBomb(scene, waypoints) {
  const bombMat = new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.5, metalness: 0.6 });
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.danger) });
  const siteZoneMatA = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.siteA), wireframe: true, transparent: true, opacity: 0.35 });
  const siteZoneMatB = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.siteB), wireframe: true, transparent: true, opacity: 0.35 });

  const bombGroup = new THREE.Group();
  const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.24), bombMat);
  caseMesh.position.y = 0.08;
  const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ledMat);
  ledMesh.position.set(0.08, 0.17, 0.04);
  const ledLight = new THREE.PointLight(new THREE.Color(PALETTE.danger), 0, 4);
  ledLight.position.set(0.08, 0.22, 0.04);
  // Hologram beacon: vertical glow beam + floating ring, visible while planted.
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 2.2, 8, 1, true), beamMat);
  beam.position.y = 1.1;
  const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff5566, transparent: true, opacity: 0.8 }));
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.y = 0.6;
  bombGroup.add(caseMesh, ledMesh, ledLight, beam, holoRing);
  bombGroup.visible = false;
  scene.add(bombGroup);

  const zoneRingA = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 32), siteZoneMatA);
  zoneRingA.rotation.x = -Math.PI / 2;
  zoneRingA.position.set(-15, 0.03, -11);
  scene.add(zoneRingA);

  const zoneRingB = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 32), siteZoneMatB);
  zoneRingB.rotation.x = -Math.PI / 2;
  zoneRingB.position.set(15, 0.03, -11);
  scene.add(zoneRingB);

  const state = {
    activeSite: 'A', // 'A' or 'B'
    sitePos: waypoints.siteA.clone(),
    status: 'CARRIED', // 'CARRIED', 'PLANTED', 'DEFUSED', 'DETONATED'
    detonationTimer: 35.0,
    plantProgress: 0, // 0 to 3.0s
    defuseProgress: 0, // 0 to 5.0s
    beepTimer: 0,
    plantedPos: new THREE.Vector3(),
  };

  function resetRound(roundNumber) {
    state.activeSite = (roundNumber % 2 === 1) ? 'A' : 'B';
    state.sitePos.copy(state.activeSite === 'A' ? waypoints.siteA : waypoints.siteB);
    state.status = 'CARRIED';
    state.detonationTimer = 35.0;
    state.plantProgress = 0;
    state.defuseProgress = 0;
    state.beepTimer = 0;
    bombGroup.visible = false;
    zoneRingA.visible = state.activeSite === 'A';
    zoneRingB.visible = state.activeSite === 'B';
  }

  function plant(pos) {
    state.status = 'PLANTED';
    state.plantedPos.copy(pos);
    bombGroup.position.copy(pos);
    bombGroup.visible = true;
    state.detonationTimer = 35.0;
    state.beepTimer = 0;
  }

  function defuse() {
    state.status = 'DEFUSED';
    bombGroup.visible = false;
  }

  function step(dt) {
    if (state.status === 'PLANTED') {
      state.detonationTimer -= dt;
      state.beepTimer -= dt;
      const beepInterval = state.detonationTimer > 20 ? 1.0 : state.detonationTimer > 10 ? 0.6 : state.detonationTimer > 5 ? 0.35 : 0.18;
      if (state.beepTimer <= 0) {
        state.beepTimer = beepInterval;
        playBombBeep(state.detonationTimer <= 10);
        ledLight.intensity = 2.5;
      } else {
        ledLight.intensity = Math.max(0, ledLight.intensity - dt * 10);
      }
      beamMat.opacity = 0.22 + 0.16 * (0.5 + 0.5 * Math.sin(state.detonationTimer * 4));
      holoRing.rotation.z += dt * 1.5;
      if (state.detonationTimer <= 0) {
        state.status = 'DETONATED';
        bombGroup.visible = false;
        playExplosion();
      }
    }
  }

  return {
    state,
    resetRound,
    plant,
    defuse,
    step,
    inSiteZone(pos) {
      return pos.distanceTo(state.sitePos) <= 4.5;
    },
    inDefuseZone(pos) {
      return state.status === 'PLANTED' && pos.distanceTo(state.plantedPos) <= 2.8;
    },
  };
}
