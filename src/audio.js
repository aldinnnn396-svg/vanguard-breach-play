// Procedural WebAudio sound synthesizer: zero assets, pure WebAudio API
let ctx = null;

function getAudioContext() {
  if (!ctx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// Unlock audio on the very first interaction: every pointer/key press makes
// sure the context exists and is running, so the first shot is never silent.
if (typeof window !== 'undefined') {
  const unlockAudio = () => { getAudioContext(); };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio);
}

function createNoiseBuffer(duration = 0.5) {
  const c = getAudioContext();
  if (!c) return null;
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Gunshot synthesis, tuned for phone speakers: the punch lives in the
// midrange (audible on small speakers), not only in sub-bass. Layers:
// (a) high crack snap, (b) broadband powder blast, (c) mid body thump,
// (d) sub-bass punch, (e) bolt click. Distance muffles the shot through
// a lowpass whose cutoff follows gainScale (bot shots get duller).
const GUN_PROFILES = {
  rifle: { blastCutoff: 3200, blastGain: 0.8, blastDur: 0.12, crackGain: 0.6 },
  smg: { blastCutoff: 4200, blastGain: 0.65, blastDur: 0.08, crackGain: 0.55 },
  pistol: { blastCutoff: 3800, blastGain: 0.7, blastDur: 0.09, crackGain: 0.6 },
};

export function playGunshot(type = 'rifle', pan = 0, gainScale = 1) {
  const c = getAudioContext();
  if (!c) return;
  const p = GUN_PROFILES[type] || GUN_PROFILES.rifle;
  const now = c.currentTime;
  // Distance muffle: close shots stay sharp, far shots go dull.
  const muffle = c.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.setValueAtTime(500 + gainScale * 5500, now);
  const out = c.createStereoPanner ? c.createStereoPanner() : null;
  if (out) {
    out.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    out.connect(muffle);
  }
  muffle.connect(c.destination);
  const dest = out || muffle;

  // (a) Crack: short high-frequency snap.
  const crack = c.createBufferSource();
  const crackBuf = createNoiseBuffer(0.035);
  if (crackBuf) {
    crack.buffer = crackBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2500, now);
    const g = c.createGain();
    g.gain.setValueAtTime(p.crackGain * gainScale, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    crack.connect(hp);
    hp.connect(g);
    g.connect(dest);
    crack.start(now);
  }

  // (b) Powder blast: broadband noise, 2ms attack, fast decay.
  const noise = c.createBufferSource();
  const noiseBuf = createNoiseBuffer(p.blastDur);
  if (noiseBuf) {
    noise.buffer = noiseBuf;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(p.blastCutoff, now);
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.linearRampToValueAtTime(p.blastGain * gainScale, now + 0.002);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + p.blastDur);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(dest);
    noise.start(now);
  }

  // (c) White-noise explosion: crisp broadband burst, cutoff sweeping down.
  const boom = c.createBufferSource();
  const boomBuf = createNoiseBuffer(0.15);
  if (boomBuf) {
    boom.buffer = boomBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.setValueAtTime(6000, now);
    bp.frequency.exponentialRampToValueAtTime(700, now + 0.14);
    const bGain = c.createGain();
    bGain.gain.setValueAtTime(0.0001, now);
    bGain.gain.linearRampToValueAtTime(0.3 * gainScale, now + 0.002);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    boom.connect(bp);
    bp.connect(bGain);
    bGain.connect(dest);
    boom.start(now);
  }

  // (d) Mid body thump: the punch phone speakers can actually play.
  const thump = c.createOscillator();
  const thumpGain = c.createGain();
  thump.type = 'triangle';
  thump.frequency.setValueAtTime(280, now);
  thump.frequency.exponentialRampToValueAtTime(80, now + 0.1);
  thumpGain.gain.setValueAtTime(0.55 * gainScale, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  thump.connect(thumpGain);
  thumpGain.connect(dest);
  thump.start(now);
  thump.stop(now + 0.12);

  // (e) Sub-bass punch: 120Hz dropping fast to 40Hz.
  const bass = c.createOscillator();
  const bassGain = c.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(120, now);
  bass.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  bassGain.gain.setValueAtTime(0.5 * gainScale, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  bass.connect(bassGain);
  bassGain.connect(dest);
  bass.start(now);
  bass.stop(now + 0.14);

  // (f) Bolt click: short metallic tick as the action cycles.
  const click = c.createBufferSource();
  const clickBuf = createNoiseBuffer(0.02);
  if (clickBuf) {
    click.buffer = clickBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4500, now + 0.045);
    const cGain = c.createGain();
    cGain.gain.setValueAtTime(0.12 * gainScale, now + 0.045);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    click.connect(hp);
    hp.connect(cGain);
    cGain.connect(dest);
    click.start(now + 0.045);
  }
}

// Bullet crack/whiz: a near miss whistling past the player.
export function playBulletWhiz(pan = 0, gainScale = 1) {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const noise = c.createBufferSource();
  const buf = createNoiseBuffer(0.14);
  if (!buf) return;
  noise.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3200, now);
  filter.frequency.exponentialRampToValueAtTime(700, now + 0.14);
  filter.Q.setValueAtTime(2.5, now);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.45 * gainScale, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  noise.connect(filter);
  filter.connect(gain);
  if (c.createStereoPanner) {
    const panner = c.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    gain.connect(panner);
    panner.connect(c.destination);
  } else {
    gain.connect(c.destination);
  }
  noise.start(now);
}

// Death cry: short pained groan (falling pitch) + body thud. Directional.
export function playBotDeath(pan = 0, gainScale = 1) {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const out = c.createStereoPanner ? c.createStereoPanner() : null;
  if (out) {
    out.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    out.connect(c.destination);
  }
  const dest = out || c.destination;
  // Guttural fall: deep sine drop, no sawtooth whine.
  const fall = c.createOscillator();
  const fallGain = c.createGain();
  fall.type = 'sine';
  fall.frequency.setValueAtTime(140, now);
  fall.frequency.exponentialRampToValueAtTime(45, now + 0.3);
  fallGain.gain.setValueAtTime(0.5 * gainScale, now);
  fallGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
  fall.connect(fallGain);
  fallGain.connect(dest);
  fall.start(now);
  fall.stop(now + 0.34);
  // Breath burst as the body drops.
  const breath = c.createBufferSource();
  const breathBuf = createNoiseBuffer(0.18);
  if (breathBuf) {
    breath.buffer = breathBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(320, now);
    bp.Q.setValueAtTime(1.2, now);
    const bGain = c.createGain();
    bGain.gain.setValueAtTime(0.25 * gainScale, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    breath.connect(bp);
    bp.connect(bGain);
    bGain.connect(dest);
    breath.start(now);
  }
  // Body hitting the ground, slightly delayed.
  const thud = c.createOscillator();
  const thudGain = c.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(75, now + 0.22);
  thud.frequency.exponentialRampToValueAtTime(35, now + 0.34);
  thudGain.gain.setValueAtTime(0.0001, now);
  thudGain.gain.exponentialRampToValueAtTime(0.5 * gainScale, now + 0.23);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
  thud.connect(thudGain);
  thudGain.connect(dest);
  thud.start(now + 0.22);
  thud.stop(now + 0.38);
  // Armor clatter as gear hits the floor.
  const clatter = c.createBufferSource();
  const clatterBuf = createNoiseBuffer(0.03);
  if (clatterBuf) {
    clatter.buffer = clatterBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(3500, now + 0.24);
    const cGain = c.createGain();
    cGain.gain.setValueAtTime(0.15 * gainScale, now + 0.24);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    clatter.connect(hp);
    hp.connect(cGain);
    cGain.connect(dest);
    clatter.start(now + 0.24);
  }
}

// Player death: heavier low tone + thud, no pan (it is you).
export function playPlayerDeath() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.5);
  gain.gain.setValueAtTime(0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

// Footsteps: short filtered noise burst, panned + attenuated by distance.
// gainValue ~0.12 at close range; callers scale it down with distance.
export function playFootstep(pan = 0, gainValue = 0.12) {
  const c = getAudioContext();
  if (!c || gainValue <= 0.005) return;
  const now = c.currentTime;
  const noise = c.createBufferSource();
  const buf = createNoiseBuffer(0.09);
  if (!buf) return;
  noise.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(420, now);
  const gain = c.createGain();
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noise.connect(filter);
  filter.connect(gain);
  if (c.createStereoPanner) {
    const panner = c.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    gain.connect(panner);
    panner.connect(c.destination);
  } else {
    gain.connect(c.destination);
  }
  noise.start(now);
}

// Loud events: the shared hearing channel. Movement and gunfire publish
// here; bot AI drains the list each step and reacts to nearby events.
const loudEvents = [];
export function emitLoudEvent(x, y, z, radius, kind) {
  if (loudEvents.length > 32) loudEvents.shift();
  loudEvents.push({ x, y, z, radius, kind });
}
export function drainLoudEvents() {
  return loudEvents.splice(0, loudEvents.length);
}

export function playHit(headshot = false, pan = 0, gainScale = 1) {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const out = c.createStereoPanner ? c.createStereoPanner() : null;
  if (out) {
    out.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    out.connect(c.destination);
  }
  const dest = out || c.destination;
  // Impact thud: dull noise burst, lowpassed.
  const noise = c.createBufferSource();
  const noiseBuf = createNoiseBuffer(0.07);
  if (noiseBuf) {
    noise.buffer = noiseBuf;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, now);
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.5 * gainScale, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(dest);
    noise.start(now);
  }
  // Flesh thump: low sine drop.
  const thump = c.createOscillator();
  const thumpGain = c.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(220, now);
  thump.frequency.exponentialRampToValueAtTime(70, now + 0.09);
  thumpGain.gain.setValueAtTime(0.4 * gainScale, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  thump.connect(thumpGain);
  thumpGain.connect(dest);
  thump.start(now);
  thump.stop(now + 0.1);
  if (headshot) {
    // Headshot: sharp crack + bright ping on top of the thud.
    const crack = c.createBufferSource();
    const crackBuf = createNoiseBuffer(0.04);
    if (crackBuf) {
      crack.buffer = crackBuf;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3000, now);
      const cGain = c.createGain();
      cGain.gain.setValueAtTime(0.35 * gainScale, now);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      crack.connect(hp);
      hp.connect(cGain);
      cGain.connect(dest);
      crack.start(now);
    }
    const ping = c.createOscillator();
    const pingGain = c.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(950, now);
    ping.frequency.exponentialRampToValueAtTime(600, now + 0.07);
    pingGain.gain.setValueAtTime(0.25 * gainScale, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    ping.connect(pingGain);
    pingGain.connect(dest);
    ping.start(now);
    ping.stop(now + 0.08);
  }
}

export function playReload() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.setValueAtTime(540, now + 0.12);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

export function playBuy() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(1320, now + 0.08);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playBombBeep(urgent = false) {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(urgent ? 1500 : 1000, now);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playExplosion() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
  gain.gain.setValueAtTime(0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 1.0);

  const noise = c.createBufferSource();
  const buf = createNoiseBuffer(0.9);
  if (buf) {
    noise.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(80, now + 0.8);
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.6, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(c.destination);
    noise.start(now);
  }
}

export function playWin() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.2, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.38);
  });
}

export function playLose() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  [440, 415.3, 392].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + i * 0.16);
    gain.gain.setValueAtTime(0.22, now + i * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.35);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + i * 0.16);
    osc.stop(now + i * 0.16 + 0.4);
  });
}

// Aegis Phase Blade: sci-fi energy swoosh + impact crack, pure WebAudio.
export function playBladeSwoosh() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  // High-velocity energy whoosh: bandpass sweeping DOWN fast, 1800 -> 250Hz.
  const noise = c.createBufferSource();
  const buf = createNoiseBuffer(0.22);
  if (buf) {
    noise.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.setValueAtTime(1.8, now);
    bp.frequency.setValueAtTime(1800, now);
    bp.frequency.exponentialRampToValueAtTime(250, now + 0.16);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.6, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(bp);
    bp.connect(g);
    g.connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.22);
  }
  // Low thump under the sweep.
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
  const og = c.createGain();
  og.gain.setValueAtTime(0.25, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc.connect(og);
  og.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

export function playBladeHit() {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  // (a) Electric plasma impact crack: LOUD highpassed noise burst.
  const noise = c.createBufferSource();
  const buf = createNoiseBuffer(0.12);
  if (buf) {
    noise.buffer = buf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2400, now);
    const g = c.createGain();
    g.gain.setValueAtTime(0.85, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    noise.connect(hp);
    hp.connect(g);
    g.connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.12);
  }
  // (b) Electric snap: very short ultra-high tick on top of the crack.
  const snap = c.createBufferSource();
  const snapBuf = createNoiseBuffer(0.03);
  if (snapBuf) {
    snap.buffer = snapBuf;
    const hp2 = c.createBiquadFilter();
    hp2.type = 'highpass';
    hp2.frequency.setValueAtTime(5000, now);
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.5, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    snap.connect(hp2);
    hp2.connect(sg);
    sg.connect(c.destination);
    snap.start(now);
    snap.stop(now + 0.03);
  }
  // (c) Energy discharge: square blip dropping fast + low boom.
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
  const og = c.createGain();
  og.gain.setValueAtTime(0.3, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc.connect(og);
  og.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.14);
  const boom = c.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(100, now);
  boom.frequency.exponentialRampToValueAtTime(45, now + 0.12);
  const bg = c.createGain();
  bg.gain.setValueAtTime(0.35, now);
  bg.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  boom.connect(bg);
  bg.connect(c.destination);
  boom.start(now);
  boom.stop(now + 0.14);
}

// Plasma hum while the Phase Blade is held: two detuned low saws beating
// through a lowpass, gently wobbling. Started/stopped by the holder.
let humNodes = null;
export function startBladeHum() {
  const c = getAudioContext();
  if (!c || humNodes) return;
  const o1 = c.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = 55;
  const o2 = c.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = 55.7;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  const g = c.createGain();
  g.gain.value = 0.045;
  const lfo = c.createOscillator();
  lfo.frequency.value = 6;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  o1.connect(lp);
  o2.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  o1.start();
  o2.start();
  lfo.start();
  humNodes = { o1, o2, lfo, g };
}

export function stopBladeHum() {
  if (!humNodes) return;
  try { humNodes.o1.stop(); humNodes.o2.stop(); humNodes.lfo.stop(); } catch { /* already stopped */ }
  try { humNodes.g.disconnect(); } catch { /* already disconnected */ }
  humNodes = null;
}
