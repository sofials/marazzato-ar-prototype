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

  const photoPlane = document.getElementById('photo-plane');

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

  // === AVVIO AR ===
  startBtn.addEventListener('click', async () => {
    intro.classList.add('hidden');
    scanHint.classList.remove('hidden');
    const arSystem = sceneEl.systems['mindar-image-system'];
    await arSystem.start();
    console.log('📦 Target caricati nel .mind:', arSystem.controller?.imageTargets?.length);
  });

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
      if (activeTarget === 'photo') {
        activeTarget = null;
        hideUI();
      }
    });
  }
  if (targetVase) {
    targetVase.addEventListener('targetFound', () => {
      console.log('🎯 TARGET 1 (vase) trovato');
      activeTarget = 'vase';
      showUI();
    });
    targetVase.addEventListener('targetLost', () => {
      if (activeTarget === 'vase') {
        activeTarget = null;
        hideUI();
      }
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
    const angle = angleFromPoint(x, y);
    setNeedleAngle(angle, false);
    applyTimeline(timelineFromAngle(angle));
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