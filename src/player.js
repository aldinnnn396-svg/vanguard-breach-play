// Tactical Player: Movement, Collision, Health (100 HP), Armor, Economy ($800 start)
import * as THREE from 'three';

const RADIUS = 0.35;
const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const WALK_SPEED = 5.2;
const CROUCH_SPEED = 2.4;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 9;
const FRICTION = 9;
const GRAVITY = 20;
const JUMP_SPEED = 6.2;

export function createPlayer(colliders) {
  const player = {
    position: new THREE.Vector3(0, 0, 30),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    eye: STAND_EYE,
    onGround: true,
    crouching: false,
    height: STAND_HEIGHT,
    health: 100,
    armor: 0,
    money: 800,
    alive: true,
    grenades: 0,
  };
  const probe = new THREE.Box3();
  const stepProbe = new THREE.Box3();
  const wish = new THREE.Vector3();

  function overlaps(x, y, z, height, lift) {
    probe.min.set(x - RADIUS, y + lift, z - RADIUS);
    probe.max.set(x + RADIUS, y + height - lift, z + RADIUS);
    for (const collider of colliders) {
      if (probe.intersectsBox(collider)) return collider;
    }
    return null;
  }

  // Highest walkable top within step height (0.55m) at (x, z), or -Infinity.
  // Lets the player walk up stairs: each step's top is a legal new footing.
  function stepUpTarget(x, z) {
    let top = -Infinity;
    stepProbe.min.set(x - RADIUS, player.position.y + 0.04, z - RADIUS);
    stepProbe.max.set(x + RADIUS, player.position.y + 0.55, z + RADIUS);
    for (const collider of colliders) {
      if (stepProbe.intersectsBox(collider) && collider.max.y > player.position.y && collider.max.y <= player.position.y + 0.55) {
        top = Math.max(top, collider.max.y);
      }
    }
    return top;
  }

  function tryStepUp(x, z) {
    const top = stepUpTarget(x, z);
    if (top === -Infinity) return false;
    if (overlaps(x, top, z, player.height, 0.02)) return false;
    player.position.y = top;
    player.velocity.y = 0;
    player.onGround = true;
    return true;
  }

  function look(dx, dy, sensitivity = 0.0022) {
    player.yaw -= dx * sensitivity;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - dy * sensitivity));
  }

  function recoil(pitchKick, yawKick) {
    player.pitch = Math.min(1.45, player.pitch + pitchKick);
    player.yaw += yawKick;
  }

  function step(dt, keys, speedBonus = 1) {
    if (!player.alive) {
      player.eye += (0.2 - player.eye) * Math.min(1, dt * 8);
      return;
    }

    const crouching = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    if (crouching && !player.crouching) {
      player.crouching = true;
      player.height = CROUCH_HEIGHT;
    } else if (!crouching && player.crouching && !overlaps(player.position.x, player.position.y, player.position.z, STAND_HEIGHT, 0.02)) {
      player.crouching = false;
      player.height = STAND_HEIGHT;
    }
    const eyeTarget = player.crouching ? CROUCH_EYE : STAND_EYE;
    player.eye += (eyeTarget - player.eye) * Math.min(1, dt * 12);

    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    wish.set(0, 0, 0);
    if (forward || strafe) {
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe).normalize();
    }

    const sprinting = !player.crouching && keys.has('ShiftLeft') && forward > 0;
    const speed = (player.crouching ? CROUCH_SPEED : sprinting ? WALK_SPEED * 1.35 : WALK_SPEED) * speedBonus;
    const blend = Math.min(1, (player.onGround ? GROUND_ACCEL : AIR_ACCEL) * dt / speed);
    player.velocity.x += (wish.x * speed - player.velocity.x) * blend;
    player.velocity.z += (wish.z * speed - player.velocity.z) * blend;
    if (player.onGround && !wish.lengthSq()) {
      const damp = Math.max(0, 1 - FRICTION * dt);
      player.velocity.x *= damp;
      player.velocity.z *= damp;
    }

    if (keys.has('Space') && player.onGround) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
    }
    player.velocity.y -= GRAVITY * dt;

    const nextX = player.position.x + player.velocity.x * dt;
    if (!overlaps(nextX, player.position.y, player.position.z, player.height, 0.04)) player.position.x = nextX;
    else if (player.onGround && tryStepUp(nextX, player.position.z)) player.position.x = nextX;
    else player.velocity.x = 0;
    const nextZ = player.position.z + player.velocity.z * dt;
    if (!overlaps(player.position.x, player.position.y, nextZ, player.height, 0.04)) player.position.z = nextZ;
    else if (player.onGround && tryStepUp(player.position.x, nextZ)) player.position.z = nextZ;
    else player.velocity.z = 0;

    player.position.y += player.velocity.y * dt;
    player.onGround = false;
    const hit = overlaps(player.position.x, player.position.y, player.position.z, player.height, 0);
    if (hit && player.velocity.y <= 0) {
      player.position.y = hit.max.y;
      player.velocity.y = 0;
      player.onGround = true;
    } else if (hit) {
      player.position.y = hit.min.y - player.height;
      player.velocity.y = 0;
    }
    if (player.position.y < 0) {
      player.position.y = 0;
      player.velocity.y = 0;
      player.onGround = true;
    }
    player.velocity.y = Math.max(-30, player.velocity.y);
  }

  function takeDamage(amount, headshot = false) {
    if (!player.alive) return false;
    let actualDmg = amount;
    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, Math.floor(amount * 0.5));
      player.armor -= absorbed;
      actualDmg -= absorbed;
    }
    player.health -= actualDmg;
    if (player.health <= 0) {
      player.health = 0;
      player.alive = false;
      return true;
    }
    return false;
  }

  function respawn(spawnPos) {
    player.position.copy(spawnPos);
    player.velocity.set(0, 0, 0);
    player.health = 100;
    player.alive = true;
    player.crouching = false;
    player.height = STAND_HEIGHT;
    player.eye = STAND_EYE;
  }

  return {
    state: player,
    step,
    look,
    recoil,
    takeDamage,
    respawn,
    addMoney(amt) { player.money = Math.min(16000, player.money + amt); },
    spendMoney(amt) {
      if (player.money >= amt) {
        player.money -= amt;
        return true;
      }
      return false;
    },
    groundSpeed() { return Math.hypot(player.velocity.x, player.velocity.z); },
  };
}
