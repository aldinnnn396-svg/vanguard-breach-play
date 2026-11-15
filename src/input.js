// Tactical Input Handler: Keyboard, Mouse, Pointer Lock, Edge-triggered key events
export function createInput(canvas, onLockChange) {
  const keys = new Set();
  const pressedKeys = new Set();
  const state = { keys, locked: false, firing: false, aiming: false, lookX: 0, lookY: 0 };
  let wheelDir = 0;

  function setKey(event, down) {
    if (down) {
      if (!keys.has(event.code)) pressedKeys.add(event.code);
      keys.add(event.code);
    } else {
      keys.delete(event.code);
    }
    if (event.code === 'Space' || event.code === 'Tab') event.preventDefault();
  }

  window.addEventListener('keydown', (event) => setKey(event, true));
  window.addEventListener('keyup', (event) => setKey(event, false));
  window.addEventListener('blur', () => {
    keys.clear();
    pressedKeys.clear();
  });

  window.addEventListener('mousemove', (event) => {
    if (!state.locked) return;
    state.lookX += event.movementX;
    state.lookY += event.movementY;
  });
  window.addEventListener('mousedown', (event) => {
    if (state.locked && event.button === 0) state.firing = true;
    if (state.locked && event.button === 2) state.aiming = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) state.firing = false;
    if (event.button === 2) state.aiming = false;
  });
  window.addEventListener('contextmenu', (event) => {
    if (state.locked) event.preventDefault();
  });
  window.addEventListener('wheel', (event) => {
    // No pointer-lock requirement: switching must work whenever the round
    // is live, even if the lock dropped.
    wheelDir = event.deltaY > 0 ? 1 : -1;
  }, { passive: true });

  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) {
      keys.clear();
      pressedKeys.clear();
      state.firing = false;
      state.aiming = false;
    }
    if (onLockChange) onLockChange(state.locked);
  });

  // ---- Touch controls (phones/tablets). Dormant on desktop: the UI only
  // shows on touch devices, and touch input feeds the same keys/look/firing
  // state the keyboard+mouse path uses, so the simulation is unchanged. ----
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const touchKeys = new Set();
  function setTouchKey(code, down) {
    if (down) {
      if (!keys.has(code)) pressedKeys.add(code);
      keys.add(code);
      touchKeys.add(code);
    } else {
      keys.delete(code);
      touchKeys.delete(code);
    }
  }
  if (isTouch) {
    document.body.classList.add('touch');
    const stickZone = document.getElementById('stick-zone');
    const stickNub = document.getElementById('stick-nub');
    let stickId = null;
    let stickCenter = null;
    const STICK_R = 48;
    function stickMove(t) {
      const dx = t.clientX - stickCenter.x;
      const dy = t.clientY - stickCenter.y;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, STICK_R);
      const nx = (dx / len) * cl;
      const ny = (dy / len) * cl;
      stickNub.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
      const jx = nx / STICK_R;
      const jy = ny / STICK_R;
      setTouchKey('KeyW', jy < -0.3);
      setTouchKey('KeyS', jy > 0.3);
      setTouchKey('KeyA', jx < -0.3);
      setTouchKey('KeyD', jx > 0.3);
    }
    function stickEnd() {
      stickId = null;
      stickNub.style.transform = 'translate(-50%, -50%)';
      for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) setTouchKey(code, false);
    }
    if (stickZone) {
      stickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        stickId = t.identifier;
        const r = stickZone.getBoundingClientRect();
        stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        stickMove(t);
      }, { passive: false });
      stickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) if (t.identifier === stickId) stickMove(t);
      }, { passive: false });
      stickZone.addEventListener('touchend', (e) => {
        for (const t of e.changedTouches) if (t.identifier === stickId) stickEnd();
      });
      stickZone.addEventListener('touchcancel', stickEnd);
    }

    // Look: drag anywhere that is not a control, menu, or overlay.
    let lookId = null;
    let lookLast = null;
    document.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.target.closest && t.target.closest('#touch-ui, #buy-menu, #slots, .overlay, #play')) continue;
        if (lookId === null) { lookId = t.identifier; lookLast = { x: t.clientX, y: t.clientY }; }
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        state.lookX += (t.clientX - lookLast.x) * 2.2;
        state.lookY += (t.clientY - lookLast.y) * 2.2;
        lookLast = { x: t.clientX, y: t.clientY };
      }
      if (lookId !== null) e.preventDefault();
    }, { passive: false });
    const lookEnd = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) { lookId = null; lookLast = null; }
    };
    document.addEventListener('touchend', lookEnd);
    document.addEventListener('touchcancel', lookEnd);

    // Buttons: hold-to-fire / hold-to-use, tap for edge actions.
    function bindHold(id, down, up) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
      el.addEventListener('touchcancel', up);
    }
    bindHold('btn-fire', () => { state.firing = true; }, () => { state.firing = false; });
    bindHold('btn-aim', () => { state.aiming = true; }, () => { state.aiming = false; });
    bindHold('btn-jump', () => setTouchKey('Space', true), () => setTouchKey('Space', false));
    bindHold('btn-use', () => setTouchKey('KeyE', true), () => setTouchKey('KeyE', false));
    bindHold('btn-crouch', () => setTouchKey('KeyC', true), () => setTouchKey('KeyC', false));
    bindHold('btn-reload', () => { if (!keys.has('KeyR')) pressedKeys.add('KeyR'); }, () => {});
    bindHold('btn-grenade', () => { if (!keys.has('KeyG')) pressedKeys.add('KeyG'); }, () => {});
    bindHold('btn-score', () => { if (!keys.has('Tab')) pressedKeys.add('Tab'); }, () => {});
  }

  return {
    state,
    isTouch,
    requestLock() { canvas.requestPointerLock(); },
    exitLock() { if (document.pointerLockElement) document.exitPointerLock(); },
    takeLook() {
      const x = state.lookX;
      const y = state.lookY;
      state.lookX = 0;
      state.lookY = 0;
      return { x, y };
    },
    justPressed(code) {
      if (pressedKeys.has(code)) {
        pressedKeys.delete(code);
        return true;
      }
      return false;
    },
    // Inject an edge-triggered key press (touch buttons, tappable HUD).
    queueKey(code) {
      if (!keys.has(code)) pressedKeys.add(code);
    },
    // Consumes the latest scroll-wheel direction: 1 = down, -1 = up, 0 = none.
    takeWheel() {
      const d = wheelDir;
      wheelDir = 0;
      return d;
    },
  };
}
