// === COMPONENTE PER L'OPACITA' DEI MODELLI 3D ===
AFRAME.registerComponent('model-opacity', {
  schema: { opacity: { type: 'number', default: 1.0 } },
  init: function () {
    this.el.addEventListener('model-loaded', this.applyOpacity.bind(this));
  },
  update: function () {
    this.applyOpacity();
  },
  applyOpacity: function () {
    const mesh = this.el.getObject3D('mesh');
    const opacity = this.data.opacity;
    if (!mesh) return;
    mesh.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material.transparent = true;
        node.material.opacity = opacity;
        node.material.needsUpdate = true;
      }
    });
  }
});

// === GESTIONE UI E AR ===
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById('start-btn');
  const intro = document.getElementById('intro');
  const scanHint = document.getElementById('scan-hint');
  const dial = document.getElementById('timeline-dial');
  const dialSvg = document.getElementById('dial-svg');
  const needle = document.getElementById('needle');
  const dialLabel = document.getElementById('dial-label');
  const sceneEl = document.querySelector('a-scene');
  const photoCaption = document.getElementById('photo-caption');

  const targetPhoto = document.getElementById('ar-target-photo');
  const targetVase = document.getElementById('ar-target-vase');
  const targetDisegno = document.getElementById('ar-target-disegno');
  const targetPiantina = document.getElementById('ar-target-piantina');
  const plantModel = document.getElementById('plant-model');

  const photoPlane = document.getElementById('photo-plane');
  const drawingPlane = document.getElementById('drawing-plane');
  
  const introDenied  = document.getElementById('intro-denied');
  const introDefault = document.getElementById('intro-default');
  const retryBtn     = document.getElementById('retry-btn');

  const vases = {
    past:    document.getElementById('vase-past'),
    present: document.getElementById('vase-present'),
    future:  document.getElementById('vase-future')
  };

  const tickPast    = document.getElementById('tick-past');
  const tickPresent = document.getElementById('tick-present');
  const tickFuture  = document.getElementById('tick-future');

  const angles = { past: -90, present: 0, future: 90 };
  const labels = { past: 'PASSATO', present: 'PRESENTE', future: 'FUTURO' };

  let currentTimeline = 'present';
  let isDragging = false;
  let currentAngle = 0;
  let isFading = false;
  let activeTarget = null; // 'vase' | 'photo' | null

  // Reset stato iniziale
  dialLabel.textContent = labels['present'];
  currentTimeline = 'present';

  // === AVVIO AR E RICHIESTA FOTOCAMERA ===
  async function requestCameraAndStart() {
  try {
    introDefault.style.display = 'none';
    introDenied.style.display = 'none';
    intro.classList.add('hidden');
    scanHint.classList.remove('hidden');

    // Lascia che MindAR gestisca la camera direttamente
    const arSystem = sceneEl.systems['mindar-image-system'];
    if (!arSystem) throw new Error('MindAR system non trovato');

    if (!sceneEl.renderStarted) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('SceneTimeout')), 30000);
        sceneEl.addEventListener('renderstart', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }

    await arSystem.start(); // MindAR chiede la camera qui

  } catch (err) {
    console.warn('Errore avvio AR:', err.name, err.message);
    scanHint.classList.add('hidden');
    intro.classList.remove('hidden');
    introDenied.style.display = 'block';

    // Differenzia il messaggio per tipo di errore
    const instructions = introDenied.querySelector('.instructions');
    if (err.name === 'NotAllowedError') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      instructions.innerHTML = isIOS
        ? 'Fotocamera bloccata.<br>Vai in <strong>Impostazioni → Safari → Fotocamera → Consenti</strong>, poi torna qui.'
        : 'Fotocamera bloccata.<br>Tocca l\'icona 🔒 nella barra dell\'indirizzo e consenti la fotocamera.';
    } else if (err.message === 'SceneTimeout') {
      instructions.innerHTML = 'Caricamento lento.<br>Controlla la connessione e riprova.';
    } else {
      instructions.innerHTML = 'Fotocamera non accessibile.<br>Assicurati di usare <strong>HTTPS</strong> e un browser aggiornato.';
    }
  }
}
  startBtn.addEventListener('click', requestCameraAndStart);
  retryBtn.addEventListener('click', requestCameraAndStart);

  function showUI() {
    scanHint.classList.add('hidden');
    dial.classList.remove('hidden');
  }

  function hideUI() {
    dial.classList.add('hidden');
    photoCaption.classList.add('hidden');
    scanHint.classList.remove('hidden');
  }

  // === LISTENER TARGET CON TRACCIAMENTO ATTIVO ===
  if (targetPhoto) {
    targetPhoto.addEventListener('targetFound', () => {
      console.log('🎯 TARGET 0 (photo) trovato');
      activeTarget = 'photo';
      showUI();
    });
    targetPhoto.addEventListener('targetLost', () => {
      if (activeTarget === 'photo') { activeTarget = null; hideUI(); }
    });
  }
  if (targetVase) {
    targetVase.addEventListener('targetFound', () => {
      console.log('🎯 TARGET 1 (vase) trovato');
      activeTarget = 'vase';
      showUI();
      document.dispatchEvent(new CustomEvent('mm-target', { detail: 'vaso' }));
    });
    targetVase.addEventListener('targetLost', () => {
      if (activeTarget === 'vase') { activeTarget = null; hideUI(); document.dispatchEvent(new CustomEvent('mm-target', { detail: null })); }
    });
  }
  if (targetDisegno) {
    targetDisegno.addEventListener('targetFound', () => {
      console.log('🎯 TARGET 4 (disegno) trovato');
      activeTarget = 'disegno';
      showUI();
    });
    targetDisegno.addEventListener('targetLost', () => {
      if (activeTarget === 'disegno') { activeTarget = null; hideUI(); }
    });
  }
  if (targetPiantina) {
    targetPiantina.addEventListener('targetFound', () => {
      console.log('🌱 TARGET 2 (piantina) trovato');
      activeTarget = 'piantina';
      scanHint.classList.add('hidden');
      document.dispatchEvent(new CustomEvent('mm-target', { detail: 'germoglio' }));
      if (plantModel) {
        plantModel.removeAttribute('animation-mixer');
        setTimeout(() => {
          plantModel.setAttribute('animation-mixer', 'clip: *; loop: once; clampWhenFinished: true;');
        }, 100);
      }
    });
    targetPiantina.addEventListener('targetLost', () => {
      if (activeTarget === 'piantina') { activeTarget = null; hideUI(); document.dispatchEvent(new CustomEvent('mm-target', { detail: null })); }
    });
  }

  // === MOTORE DI FADE ===
  function setOpacity(el, opacity) {
    if (!el) return;
    if (el.tagName.toLowerCase() === 'a-plane') {
      el.setAttribute('material', 'opacity', opacity);
    } else {
      el.setAttribute('model-opacity', `opacity: ${opacity}`);
    }
  }

  function animateFade(el, isFadeOut, duration, callback) {
    if (!el) { if (callback) callback(); return; }
    const start = performance.now();

    function step(timestamp) {
      let progress = (timestamp - start) / duration;
      if (progress > 1) progress = 1;
      setOpacity(el, isFadeOut ? 1 - progress : progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (callback) callback();
      }
    }
    requestAnimationFrame(step);
  }

  // === LOGICA TIMELINE (agisce solo sul target attivo) ===
  function applyTimeline(timeline) {
    if (currentTimeline === timeline || isFading) return;
    isFading = true;

    const oldTimeline = currentTimeline;
    currentTimeline = timeline;
    document.dispatchEvent(new CustomEvent('mm-timeline', { detail: timeline }));
    const fadeTime = 250;

    // Aggiorna UI ghiera sempre
    dialLabel.textContent = labels[timeline];
    tickPast.classList.toggle('active',    timeline === 'past');
    tickPresent.classList.toggle('active', timeline === 'present');
    tickFuture.classList.toggle('active',  timeline === 'future');

    // Didascalia: solo nel passato E solo se siamo sulla foto
    if (timeline === 'past' && activeTarget === 'photo') {
      photoCaption.classList.remove('hidden');
    } else {
      photoCaption.classList.add('hidden');
    }

    // Agisci solo sull'elemento del target attivo
    if (activeTarget === 'photo') {
      animateFade(photoPlane, true, fadeTime);
      setTimeout(() => {
        photoPlane.setAttribute('src', `#tex-${timeline}`);
        animateFade(photoPlane, false, fadeTime, () => { isFading = false; });
      }, fadeTime);
    } else if (activeTarget === 'disegno') {
      animateFade(drawingPlane, true, fadeTime);
      setTimeout(() => {
        drawingPlane.setAttribute('src', `#tex-drawing-${timeline}`);
        animateFade(drawingPlane, false, fadeTime, () => { isFading = false; });
      }, fadeTime);
    } else if (activeTarget === 'vase') {
      const oldVase = vases[oldTimeline];
      const newVase = vases[timeline];
      animateFade(oldVase, true, fadeTime);
      setTimeout(() => {
        if (oldVase) oldVase.setAttribute('visible', 'false');
        if (newVase) {
          newVase.setAttribute('visible', 'true');
          setOpacity(newVase, 0);
          animateFade(newVase, false, fadeTime, () => { isFading = false; });
        } else {
          isFading = false;
        }
      }, fadeTime);
    } else {
      // Nessun target attivo: aggiorna solo lo stato logico
      isFading = false;
    }
  }

  // === LOGICA GHIERA (drag) ===
  function angleFromPoint(x, y) {
    const dx = x - 120;
    const dy = 120 - y;
    let angle = Math.atan2(dx, dy) * (180 / Math.PI);
    if (angle < -90) angle = -90;
    if (angle > 90) angle = 90;
    return angle;
  }

  function getSvgCoords(clientX, clientY) {
    const rect = dialSvg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 240;
    const y = ((clientY - rect.top) / rect.height) * 140;
    return { x, y };
  }

  function setNeedleAngle(angle, animate = true) {
    needle.style.transition = animate ? 'transform 0.25s cubic-bezier(0.4, 1.4, 0.6, 1)' : 'none';
    needle.style.transform = `rotate(${angle}deg)`;
    currentAngle = angle;
  }

  function timelineFromAngle(angle) {
    if (angle < -45) return 'past';
    if (angle > 45) return 'future';
    return 'present';
  }

  function startDrag(clientX, clientY) {
    if (isFading) return;
    isDragging = true;
    const { x, y } = getSvgCoords(clientX, clientY);
    setNeedleAngle(angleFromPoint(x, y), false);
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging || isFading) return;
    const { x, y } = getSvgCoords(clientX, clientY);
    const timeline = timelineFromAngle(angleFromPoint(x, y));
    setNeedleAngle(angles[timeline], false);
    applyTimeline(timeline);
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (!isFading) {
      const timeline = timelineFromAngle(currentAngle);
      setNeedleAngle(angles[timeline], true);
      applyTimeline(timeline);
    }
  }

  // Mouse
  dialSvg.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  // Touch
  dialSvg.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  window.addEventListener('touchmove', (e) => { if (!isDragging) return; e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  window.addEventListener('touchend', endDrag);

  // Tap diretto sulle tacche
  tickPast.addEventListener('click',    () => { if (!isFading) { setNeedleAngle(angles.past, true);    applyTimeline('past');    } });
  tickPresent.addEventListener('click', () => { if (!isFading) { setNeedleAngle(angles.present, true); applyTimeline('present'); } });
  tickFuture.addEventListener('click',  () => { if (!isFading) { setNeedleAngle(angles.future, true);  applyTimeline('future');  } });
});

// === DEBUG PANEL (rimuovere in produzione) ===
(function () {
  const steps    = { px: 0.05, py: 0.05, pz: 0.05, rx: 5, ry: 5, rz: 5, s: 0.1 };
  const decimals = { px: 2,    py: 2,    pz: 2,    rx: 0, ry: 0, rz: 0, s:   1 };

  const defaultState = (overrides) => Object.assign({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, s: 1 }, overrides);

  const germoglioState = defaultState({ rx: 90, s: 0.3 });
  const vasoStates = {
    past:    defaultState({ px: -4.10, py: -0.60, pz: -0.35, rx: 70, rz: 10, s: 3.8 }),
    present: defaultState({ px: -7.10, py: -0.25, pz: -1.45, rx: 70, rz: 10, s: 5.0 }),
    future:  defaultState({ px: -3.15, py: -0.60, pz: -0.35, rx: 70, rz: 10, s: 3.8 }),
  };

  try {
    const g = localStorage.getItem('germoglio-debug');
    if (g) Object.assign(germoglioState, JSON.parse(g));
    const v = localStorage.getItem('vaso-debug');
    if (v) Object.assign(vasoStates, JSON.parse(v));
  } catch (e) {}

  let activeDbgTarget = null;
  let activeTimeline  = 'present';

  const timelineLabels = { past: 'PASSATO', present: 'PRESENTE', future: 'FUTURO' };

  function currentState() {
    if (activeDbgTarget === 'germoglio') return germoglioState;
    if (activeDbgTarget === 'vaso')      return vasoStates[activeTimeline];
    return null;
  }

  function currentModel() {
    if (activeDbgTarget === 'germoglio') return document.getElementById('plant-model');
    if (activeDbgTarget === 'vaso')      return document.getElementById(`vase-${activeTimeline}`);
    return null;
  }

  function applyToModel() {
    const state = currentState();
    const model = currentModel();
    if (!state || !model) return;
    model.setAttribute('position', `${state.px} ${state.py} ${state.pz}`);
    model.setAttribute('rotation', `${state.rx} ${state.ry} ${state.rz}`);
    model.setAttribute('scale',    `${state.s} ${state.s} ${state.s}`);
  }

  function renderDisplay() {
    const state = currentState();
    if (!state) return;
    Object.keys(state).forEach(k => {
      const el = document.getElementById('dbg-' + k);
      if (el) el.textContent = state[k].toFixed(decimals[k]);
    });
  }

  function updateContext() {
    const label    = document.getElementById('dbg-ctx-label');
    const controls = document.getElementById('dbg-controls');
    if (activeDbgTarget === 'germoglio') {
      label.textContent    = '🌱 GERMOGLIO';
      controls.style.display = 'block';
      renderDisplay();
    } else if (activeDbgTarget === 'vaso') {
      label.textContent    = `🏺 VASO — ${timelineLabels[activeTimeline]}`;
      controls.style.display = 'block';
      renderDisplay();
    } else {
      label.textContent    = '— nessun marker —';
      controls.style.display = 'none';
    }
  }

  // Eventi dal sistema AR
  document.addEventListener('mm-target', e => {
    activeDbgTarget = e.detail;
    updateContext();
  });

  document.addEventListener('mm-timeline', e => {
    activeTimeline = e.detail;
    if (activeDbgTarget === 'vaso') {
      updateContext();
      applyToModel();
    }
  });

  // Toggle pannello
  document.getElementById('dbg-toggle-btn').addEventListener('click', () => {
    const c = document.getElementById('dbg-content');
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
  });

  // Pulsanti +/−
  document.querySelectorAll('.dbg-minus, .dbg-plus').forEach(btn => {
    const key  = btn.dataset.key;
    const sign = btn.classList.contains('dbg-plus') ? 1 : -1;
    let timer;

    const step = () => {
      const state = currentState();
      if (!state) return;
      state[key] = parseFloat((state[key] + sign * steps[key]).toFixed(4));
      renderDisplay();
      applyToModel();
    };

    btn.addEventListener('touchstart', e => { e.preventDefault(); step(); timer = setInterval(step, 150); }, { passive: false });
    btn.addEventListener('touchend',   () => clearInterval(timer));
    btn.addEventListener('mousedown',  () => { step(); timer = setInterval(step, 150); });
    btn.addEventListener('mouseup',    () => clearInterval(timer));
    btn.addEventListener('mouseleave', () => clearInterval(timer));
  });

  // Salva tutto
  document.getElementById('dbg-save-btn').addEventListener('click', () => {
    localStorage.setItem('germoglio-debug', JSON.stringify(germoglioState));
    localStorage.setItem('vaso-debug',      JSON.stringify(vasoStates));

    const fmt = (s) =>
      `position="${s.px.toFixed(2)} ${s.py.toFixed(2)} ${s.pz.toFixed(2)}"\n` +
      `rotation="${s.rx} ${s.ry} ${s.rz}"\n` +
      `scale="${s.s.toFixed(1)} ${s.s.toFixed(1)} ${s.s.toFixed(1)}"`;

    let text = `=== GERMOGLIO ===\n${fmt(germoglioState)}\n\n`;
    ['past', 'present', 'future'].forEach(t => {
      text += `=== VASO ${timelineLabels[t]} ===\n${fmt(vasoStates[t])}\n\n`;
    });

    document.getElementById('dbg-modal-text').textContent = text.trim();
    document.getElementById('dbg-modal-overlay').classList.add('visible');
  });

  document.getElementById('dbg-modal-close').addEventListener('click', () => {
    document.getElementById('dbg-modal-overlay').classList.remove('visible');
  });

  // Applica valori salvati al caricamento
  const plantModel = document.getElementById('plant-model');
  if (plantModel) {
    plantModel.setAttribute('position', `${germoglioState.px} ${germoglioState.py} ${germoglioState.pz}`);
    plantModel.setAttribute('rotation', `${germoglioState.rx} ${germoglioState.ry} ${germoglioState.rz}`);
    plantModel.setAttribute('scale',    `${germoglioState.s} ${germoglioState.s} ${germoglioState.s}`);
  }
  ['past', 'present', 'future'].forEach(t => {
    const model = document.getElementById(`vase-${t}`);
    const s = vasoStates[t];
    if (model) {
      model.setAttribute('position', `${s.px} ${s.py} ${s.pz}`);
      model.setAttribute('rotation', `${s.rx} ${s.ry} ${s.rz}`);
      model.setAttribute('scale',    `${s.s} ${s.s} ${s.s}`);
    }
  });

  updateContext();
})();