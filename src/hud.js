// Tactical HUD Controller
// Shot mode (?shot=...) renders a frozen diorama for screenshots: timed HUD
// elements never expire there, because software rendering can take seconds
// per frame and the capture happens long after the timers would fire.
const shotMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('shot');

export function createHud() {
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayCopy = document.getElementById('overlay-copy');
  const playBtn = document.getElementById('play');
  const scoreAssault = document.getElementById('score-assault');
  const scoreDefender = document.getElementById('score-defender');
  const roundTimer = document.getElementById('round-timer');
  const roundNum = document.getElementById('round-num');
  const killfeed = document.getElementById('killfeed');
  const radio = document.getElementById('radio');
  const pipsAssault = document.getElementById('pips-assault');
  const pipsDefender = document.getElementById('pips-defender');
  const slotBar = document.getElementById('slots');
  const banner = document.getElementById('banner');
  const healthStat = document.getElementById('health-stat');
  const armorStat = document.getElementById('armor-stat');
  const moneyStat = document.getElementById('money-stat');
  const weaponName = document.getElementById('weapon-name');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoRes = document.getElementById('ammo-res');
  const ammoBox = document.getElementById('ammo-box');
  const ammoMode = document.getElementById('ammo-mode');
  const ammoFill = document.getElementById('ammo-fill');
  const healthFill = document.getElementById('health-fill');
  const armorFill = document.getElementById('armor-fill');
  const grenadeStat = document.getElementById('grenade-stat');
  const hitmarker = document.getElementById('hitmarker');
  const buyMenu = document.getElementById('buy-menu');
  const scoreboard = document.getElementById('scoreboard');
  const scoreboardBody = document.getElementById('scoreboard-body');

  // Sharp weapon glyphs for the kill feed (inline SVG, currentColor).
  const WEAPON_ICONS = {
    rifle: '<svg viewBox="0 0 20 12" class="kf-icon"><path d="M1 6h11l2-2h4v2h2v2h-3l-2 2H8l-1-2H1z" fill="currentColor"/></svg>',
    smg: '<svg viewBox="0 0 20 12" class="kf-icon"><path d="M1 6h8l2-2h4v2h4v2h-4l-2 2H8l-1-2H1z" fill="currentColor"/></svg>',
    blade: '<svg viewBox="0 0 20 12" class="kf-icon"><path d="M3 11L15 1l2 1L6 12l-3-1z" fill="currentColor"/><path d="M2 10l2 2M4 8l1 1" stroke="currentColor" stroke-width="1.4"/></svg>',
    frag: '<svg viewBox="0 0 20 12" class="kf-icon"><circle cx="10" cy="7" r="4.5" fill="currentColor"/><path d="M10 2V0M8 0h4" stroke="currentColor" stroke-width="1.6"/></svg>',
    bomb: '<svg viewBox="0 0 20 12" class="kf-icon"><circle cx="9" cy="7" r="4.5" fill="currentColor"/><path d="M13 4l3-3M15 1h3" stroke="currentColor" stroke-width="1.6"/></svg>',
  };
  function iconFor(weapon) {
    const w = String(weapon || '');
    if (w.includes('Spectre')) return WEAPON_ICONS.smg;
    if (w.includes('Aegis')) return WEAPON_ICONS.blade;
    if (w.includes('FRAG')) return WEAPON_ICONS.frag;
    if (w.includes('BOMB')) return WEAPON_ICONS.bomb;
    return WEAPON_ICONS.rifle;
  }

  let hitTimer = 0;
  let bannerTimer = 0;
  let playCb = null;
  let buyCb = null;
  let slotCb = null;
  let lastPips = '';
  let lastSlots = '';

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playCb) playCb();
    });
  }

  // Hook buy menu item clicks
  const buyItems = document.querySelectorAll('.buy-item');
  buyItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const buyType = item.getAttribute('data-buy');
      if (buyCb && buyType) buyCb(buyType);
    });
  });

  return {
    setScore(assault, defender, round) {
      if (scoreAssault) scoreAssault.textContent = String(assault);
      if (scoreDefender) scoreDefender.textContent = String(defender);
      if (roundNum) roundNum.textContent = `ROUND ${round}/15`;
    },
    setTimer(seconds, urgent = false, label = '') {
      if (!roundTimer) return;
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      roundTimer.textContent = label ? `${label} ${s}s` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      roundTimer.classList.toggle('urgent', urgent);
    },
    setHealth(hp, armor) {
      const h = Math.max(0, hp);
      const a = Math.max(0, armor);
      if (healthStat) healthStat.textContent = String(h);
      if (armorStat) armorStat.textContent = String(a);
      if (healthFill) {
        healthFill.style.width = `${h}%`;
        healthFill.style.background = h > 50 ? 'var(--health)' : h > 25 ? '#e2b028' : 'var(--danger)';
      }
      if (armorFill) armorFill.style.width = `${Math.min(100, a)}%`;
    },
    setMoney(amt) {
      if (moneyStat) moneyStat.textContent = `$${amt}`;
    },
    setAmmo(mag, res, type) {
      if (type && type.id === 'blade') {
        if (ammoMag) ammoMag.textContent = '—';
        if (ammoRes) ammoRes.textContent = '';
        if (weaponName) weaponName.textContent = type.name || type;
        if (ammoBox) ammoBox.classList.remove('empty');
        if (ammoMode) ammoMode.textContent = 'MELEE';
        if (ammoFill) {
          ammoFill.style.width = '100%';
          ammoFill.style.background = '#00e5ff';
        }
        return;
      }
      if (ammoMag) ammoMag.textContent = String(mag);
      if (ammoRes) ammoRes.textContent = `/ ${res}`;
      if (weaponName && type) weaponName.textContent = type.name || type;
      if (ammoBox) ammoBox.classList.toggle('empty', mag === 0);
      if (ammoMode && type && type.id) ammoMode.textContent = 'AUTO';
      if (ammoFill && type && type.magSize) {
        const frac = Math.max(0, mag / type.magSize);
        ammoFill.style.width = `${frac * 100}%`;
        ammoFill.style.background = frac > 0.25 ? 'var(--accent)' : 'var(--danger)';
      }
    },
    setGrenades(count) {
      if (grenadeStat) grenadeStat.textContent = `HE: ${count} (G to throw)`;
    },

    hitMarker(headshot = false, holdMs = 90) {
      if (!hitmarker) return;
      clearTimeout(hitTimer);
      hitmarker.classList.toggle('headshot', headshot);
      hitmarker.classList.add('on');
      hitTimer = setTimeout(() => {
        hitmarker.classList.remove('on');
        hitmarker.classList.remove('headshot');
      }, holdMs);
    },
    showDamageNumber(x, y, text, crit = false) {
      const layer = document.getElementById('dmg-numbers');
      if (!layer) return;
      const el = document.createElement('span');
      el.className = crit ? 'dmg-num crit' : 'dmg-num';
      el.textContent = text;
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      layer.appendChild(el);
      while (layer.children.length > 12) layer.removeChild(layer.firstChild);
      // In shot mode the capture runs slower than the fade: freeze the
      // number on screen so the dossier shot shows the damage.
      if (shotMode) {
        el.style.animation = 'none';
      } else {
        setTimeout(() => el.remove(), 950);
      }
    },
    showBanner(text, duration = 3000) {
      if (!banner) return;
      banner.textContent = text;
      banner.classList.add('show');
      clearTimeout(bannerTimer);
      if (duration > 0 && !shotMode) {
        bannerTimer = setTimeout(() => {
          banner.classList.remove('show');
        }, duration);
      }
    },
    hideBanner() {
      if (banner) banner.classList.remove('show');
    },
    addKillFeed(killer, victim, weapon, headshot = false) {
      if (!killfeed) return;
      const item = document.createElement('div');
      item.className = `feed-item ${headshot ? 'headshot' : ''}`;
      item.innerHTML = `<span class="kf-killer"></span>${iconFor(weapon)}<span class="kf-victim"></span>${headshot ? '<span class="kf-hs">⌖</span>' : ''}`;
      item.querySelector('.kf-killer').textContent = killer;
      item.querySelector('.kf-victim').textContent = victim;
      killfeed.appendChild(item);
      while (killfeed.children.length > 5) killfeed.removeChild(killfeed.firstChild);
      if (!shotMode) {
        setTimeout(() => {
          if (item.parentNode) item.parentNode.removeChild(item);
        }, 5000);
      }
    },
    addRadioCallout(speaker, text) {
      if (!radio) return;
      const item = document.createElement('div');
      item.className = 'radio-item';
      item.textContent = `[RADIO] ${speaker}: ${text}`;
      radio.appendChild(item);
      while (radio.children.length > 4) radio.removeChild(radio.firstChild);
      if (!shotMode) {
        setTimeout(() => {
          if (item.parentNode) item.parentNode.removeChild(item);
        }, 6000);
      }
    },
    setAlivePips(assaultAlive, defenderAlive) {
      const key = `${assaultAlive}/${defenderAlive}`;
      if (key === lastPips) return;
      lastPips = key;
      if (pipsAssault) pipsAssault.textContent = '●'.repeat(Math.max(0, assaultAlive));
      if (pipsDefender) pipsDefender.textContent = '●'.repeat(Math.max(0, defenderAlive));
    },
    setWeaponSlots(currentId, grenades, ownedIds = ['rifle', 'smg', 'blade']) {
      const key = `${currentId}/${grenades}/${ownedIds.join(',')}`;
      if (key === lastSlots || !slotBar) return;
      lastSlots = key;
      const slots = [
        ['rifle', '1 Kestrel-7'],
        ['smg', '2 Spectre-11'],
        ['blade', '3 Phase Blade'],
        ['he', grenades > 0 ? '4 FRAG ✓' : '4 FRAG'],
        ['kit', '5 KIT'],
      ];
      slotBar.textContent = '';
      for (const [id, label] of slots) {
        const s = document.createElement('span');
        const owned = id === 'he' || id === 'kit' ? true : ownedIds.includes(id);
        s.className = `slot ${id === currentId ? 'active' : ''} ${owned ? '' : 'dim'}`;
        s.textContent = label;
        s.addEventListener('click', (e) => {
          e.stopPropagation();
          if (slotCb) slotCb(id);
        });
        // Touch: direct tap handling — the click event alone is unreliable
        // when touch buttons overlap the bar, and preventDefault here
        // suppresses the synthetic click so the tap fires exactly once.
        s.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (slotCb) slotCb(id);
        }, { passive: false });
        slotBar.appendChild(s);
      }
    },

    toggleBuyMenu(open) {
      if (!buyMenu) return;
      buyMenu.classList.toggle('open', open);
    },
    showScoreboard(assaultRows, defenderRows) {
      if (!scoreboard || !scoreboardBody) return;
      const table = (title, cls, rows) => `
        <div class="sb-team">
          <h3 class="${cls}">${title}</h3>
          <table>
            <tr><th>OPERATIVE</th><th>K</th><th>D</th><th>A</th><th>$</th></tr>
            ${rows.map((r) => `<tr><td></td><td>${r.k}</td><td>${r.d}</td><td>${r.a}</td><td>${r.money}</td></tr>`).join('')}
          </table>
        </div>`;
      scoreboardBody.innerHTML = table('ASSAULT', 'sb-assault', assaultRows) + table('DEFENDER', 'sb-defender', defenderRows);
      const cells = scoreboardBody.querySelectorAll('td:first-child');
      [...assaultRows, ...defenderRows].forEach((r, i) => { if (cells[i]) cells[i].textContent = r.name; });
      scoreboard.classList.add('open');
    },
    hideScoreboard() {
      if (scoreboard) scoreboard.classList.remove('open');
    },
    isBuyMenuOpen() {
      return buyMenu ? buyMenu.classList.contains('open') : false;
    },
    onBuy(cb) {
      buyCb = cb;
    },
    onSlotSelect(cb) {
      slotCb = cb;
    },
    onPlay(cb) {
      playCb = cb;
    },
    showOverlay(title, desc, buttonText = 'Continue') {
      if (!overlay) return;
      overlay.hidden = false;
      if (overlayTitle) overlayTitle.textContent = title;
      if (overlayCopy) overlayCopy.textContent = desc;
      if (playBtn) playBtn.textContent = buttonText;
    },
    hideOverlay() {
      if (overlay) overlay.hidden = true;
    },
  };
}
