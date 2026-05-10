// === COMPONENTE A-FRAME PER MATERIAL MANAGEMENT ===
// Da registrare PRIMA del caricamento della scena
AFRAME.registerComponent('frame-state-manager', {
  schema: {
    state: { type: 'string', default: 'present' }
  },

  init: function () {
    this.meshLoaded = false;
    // Ascolta quando il .glb ha finito di caricare
    this.el.addEventListener('model-loaded', () => {
      this.meshLoaded = true;
      this.updateMaterials();
    });
  },

  update: function () {
    if (this.meshLoaded) {
      this.updateMaterials();
    }
  },

updateMaterials: function () {
    const state = this.data.state;
    const photoPlane = document.getElementById('photo-plane');

    // 1. CAMBIO FOTO ISTANTANEO (ora non si blocca più)
    switch (state) {
      case 'past':
        photoPlane.setAttribute('src', '#tex-past');
        break;
      case 'future':
        photoPlane.setAttribute('src', '#tex-future');
        break;
      case 'present':
      default:
        photoPlane.setAttribute('src', '#tex-present');
        break;
    }

    // 2. CAMBIO MATERIALE CORNICE (se il 3D è pronto)
    const gltfEl = this.el.querySelector('a-gltf-model');
    if (!gltfEl) return;
    
    const mesh = gltfEl.getObject3D('mesh');
    if (mesh) {
      let frameColor, frameRoughness;
      if (state === 'past') {
        frameColor = new THREE.Color('#6b4423');
        frameRoughness = 0.7;
      } else if (state === 'future') {
        frameColor = new THREE.Color('#c9a87c');
        frameRoughness = 0.5;
      } else {
        frameColor = new THREE.Color('#1a1a1a');
        frameRoughness = 1.0;
      }

      mesh.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.color = frameColor;
          node.material.roughness = frameRoughness;
          node.material.metalness = 0;
          node.material.needsUpdate = true;
        }
      });
    }
  }
});

// === GESTIONE UI DOM ===
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById('start-btn');
  const intro = document.getElementById('intro');
  const scanHint = document.getElementById('scan-hint');
  const dial = document.getElementById('timeline-dial');
  const dialSvg = document.getElementById('dial-svg');
  const needle = document.getElementById('needle');
  const dialLabel = document.getElementById('dial-label');
  const sceneEl = document.querySelector('a-scene');
  const targetEntity = document.getElementById('ar-target');
  const frameWrapper = document.getElementById('frame-wrapper');

  const tickPast = document.getElementById('tick-past');
  const tickPresent = document.getElementById('tick-present');
  const tickFuture = document.getElementById('tick-future');

  // Angoli lancetta (gradi)
  const angles = { past: -90, present: 0, future: 90 };
  const labels = { past: 'PASSATO', present: 'PRESENTE', future: 'FUTURO' };

  let currentTimeline = 'present';
  let isDragging = false;
  let currentAngle = 0;

  // === AVVIO AR ===
  startBtn.addEventListener('click', async () => {
    intro.classList.add('hidden');
    scanHint.classList.remove('hidden');

    const arSystem = sceneEl.systems['mindar-image-system'];
    await arSystem.start();
  });

  // Mostra UI solo al primo riconoscimento del marker
  targetEntity.addEventListener('targetFound', () => {
    scanHint.classList.add('hidden');
    dial.classList.remove('hidden');
  });

  targetEntity.addEventListener('targetLost', () => {
    // Opzionale: puoi rimettere l'hint se perde il target
    scanHint.classList.remove('hidden');
    dial.classList.add('hidden');
  });

  // === LOGICA GHIERA (Ottimizzata) ===
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

  function applyTimeline(timeline) {
    if (currentTimeline === timeline) return;
    currentTimeline = timeline;

    // Aggiorna l'entità A-Frame! Il componente reagirà e cambierà texture/material
    frameWrapper.setAttribute('frame-state-manager', `state: ${timeline}`);

    // Aggiorna Label e Classi
    dialLabel.textContent = labels[timeline];
    
    tickPast.classList.toggle('active', timeline === 'past');
    tickPresent.classList.toggle('active', timeline === 'present');
    tickFuture.classList.toggle('active', timeline === 'future');
  }

  // === EVENT HANDLERS DRAG ===
  function startDrag(clientX, clientY) {
    isDragging = true;
    const { x, y } = getSvgCoords(clientX, clientY);
    setNeedleAngle(angleFromPoint(x, y), false);
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    const { x, y } = getSvgCoords(clientX, clientY);
    const angle = angleFromPoint(x, y);
    setNeedleAngle(angle, false);
    
    // Feedback real-time opzionale: se l'utente supera la soglia, scatta lo swap in AR
    applyTimeline(timelineFromAngle(angle));
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    const timeline = timelineFromAngle(currentAngle);
    setNeedleAngle(angles[timeline], true);
    applyTimeline(timeline);
  }

  // Mouse
  dialSvg.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  // Touch
  dialSvg.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  window.addEventListener('touchmove', (e) => { if (!isDragging) return; e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  window.addEventListener('touchend', endDrag);

  // Fallback tap diretto sulle tacche
  tickPast.addEventListener('click', () => { setNeedleAngle(angles.past, true); applyTimeline('past'); });
  tickPresent.addEventListener('click', () => { setNeedleAngle(angles.present, true); applyTimeline('present'); });
  tickFuture.addEventListener('click', () => { setNeedleAngle(angles.future, true); applyTimeline('future'); });
});