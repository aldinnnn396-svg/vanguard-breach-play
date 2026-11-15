// Tactical Minimap Overlay
const SCALE = 2.0;
const HALF = 90;
const TWO_PI = Math.PI * 2;

export function createMinimap(world, player, bots, bomb) {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 180;
  canvas.id = 'minimap';
  Object.assign(canvas.style, {
    position: 'absolute',
    top: '12px',
    left: '12px',
    right: 'auto',
    bottom: 'auto',
    width: '180px',
    height: '180px',
    zIndex: '10',
    pointerEvents: 'none',
    border: '2px solid rgba(255, 255, 255, 0.35)',
    background: 'rgba(10, 15, 24, 0.75)',
    borderRadius: '50%',
  });
  document.getElementById('game').appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colliders = world.colliders;
  const numColliders = colliders.length;
  const botList = bots.bots;

  function update(now) {
    ctx.clearRect(0, 0, 180, 180);
    // Circular clip: the map draws inside the round frame.
    ctx.save();
    ctx.beginPath();
    ctx.arc(90, 90, 88, 0, TWO_PI);
    ctx.clip();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let i = 0; i < numColliders; i++) {
      const b = colliders[i];
      const minX = HALF + b.min.x * SCALE;
      const minZ = HALF + b.min.z * SCALE;
      const w = (b.max.x - b.min.x) * SCALE;
      const h = (b.max.z - b.min.z) * SCALE;
      ctx.fillRect(minX, minZ, w, h);
    }

    // Tactical radar dressing: concentric range rings + rotating sweep.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(HALF, HALF, 45, 0, TWO_PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(HALF, HALF, 87, 0, TWO_PI);
    ctx.stroke();
    const sweepA = (now / 1400) % TWO_PI;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.beginPath();
    ctx.moveTo(HALF, HALF);
    ctx.arc(HALF, HALF, 88, sweepA - 0.5, sweepA);
    ctx.closePath();
    ctx.fill();
    for (let s = 0; s < 3; s++) {
      const a = sweepA - s * 0.16;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 - s * 0.17})`;
      ctx.beginPath();
      ctx.moveTo(HALF, HALF);
      ctx.lineTo(HALF + Math.cos(a) * 88, HALF + Math.sin(a) * 88);
      ctx.stroke();
    }

    if (world.waypoints) {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (world.waypoints.siteA) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('A', HALF + world.waypoints.siteA.x * SCALE, HALF + world.waypoints.siteA.z * SCALE);
      }
      if (world.waypoints.siteB) {
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('B', HALF + world.waypoints.siteB.x * SCALE, HALF + world.waypoints.siteB.z * SCALE);
      }
    }

    if (bomb && bomb.state && bomb.state.status === 'PLANTED' && bomb.state.plantedPos) {
      if (Math.floor(now / 250) % 2 === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(HALF + bomb.state.plantedPos.x * SCALE, HALF + bomb.state.plantedPos.z * SCALE, 5, 0, TWO_PI);
        ctx.fill();
      }
    }

    const botCount = botList.length;
    for (let i = 0; i < botCount; i++) {
      const bot = botList[i];
      if (!bot.alive) continue;
      ctx.fillStyle = bot.team === 'assault' ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.arc(HALF + bot.mesh.position.x * SCALE, HALF + bot.mesh.position.z * SCALE, 3.5, 0, TWO_PI);
      ctx.fill();
    }

    const pState = player.state;
    if (pState && pState.alive) {
      ctx.save();
      ctx.translate(HALF + pState.position.x * SCALE, HALF + pState.position.z * SCALE);
      ctx.rotate(-pState.yaw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  return { update };
}
