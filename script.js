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
  const tutorialEl = document.getElementById('tutorial');
  const helpBtn = document.getElementById('help-btn');

  function openTutorial() { tutorialEl.classList.remove('hidden'); }
  function closeTutorial() { tutorialEl.classList.add('hidden'); }

  document.getElementById('tutorial-open-btn').addEventListener('click', openTutorial);
  document.getElementById('tutorial-close-btn').addEventListener('click', closeTutorial);
  document.getElementById('tutorial-close-btn2').addEventListener('click', closeTutorial);
  helpBtn.addEventListener('click', openTutorial);
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
  const targetCalendario = document.getElementById('ar-target-calendario');
  const targetCamion1   = document.getElementById('ar-target-camion1');
  const infoCamion1     = document.getElementById('info-card-camion1');
  const targetCamion2   = document.getElementById('ar-target-camion2');
  const infoCamion2     = document.getElementById('info-card-camion2');
  const targetCamion3   = document.getElementById('ar-target-camion3');
  const infoCamion3     = document.getElementById('info-card-camion3');
  const targetPiantina  = document.getElementById('ar-target-piantina');
  const plantModel = document.getElementById('plant-model');
  const targetDiario = document.getElementById('ar-target-diario');
  const diaryOverlay = document.getElementById('diary-overlay');
  const diaries = {
    past:    [document.getElementById('diario-past-model')],
    present: [document.getElementById('diario-present-model')],
    future:  [document.getElementById('diario-future-model')],
  };

  const targetPostit = document.getElementById('ar-target-postit');
  const postits = {
    past:    [document.getElementById('postit-past-model-a'),    document.getElementById('postit-past-model-b')],
    present: [document.getElementById('postit-present-model-a'), document.getElementById('postit-present-model-b')],
    future:  [document.getElementById('postit-future-model-a'),  document.getElementById('postit-future-model-b')],
  };

  const targetLibro = document.getElementById('ar-target-libro');
  const libros = {
    past:    [document.getElementById('libro-past-model')],
    present: [document.getElementById('libro-present-model')],
    future:  [document.getElementById('libro-future-model-a'), document.getElementById('libro-future-model-b')],
  };

  const photoPlane = document.getElementById('photo-plane');
  const drawingPlane = document.getElementById('drawing-plane');
  const calendarioPlane = document.getElementById('calendario-plane');
  
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

  function getCameraInstructions(reason) {
    if (reason === 'timeout') return 'Caricamento lento.<br>Controlla la connessione e riprova.';
    if (reason !== 'denied')  return 'Fotocamera non accessibile.<br>Assicurati di usare <strong>HTTPS</strong> e un browser aggiornato.';

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      if (/CriOS/.test(ua))  return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Vai in <strong>Impostazioni → Chrome</strong></li><li>Tocca <strong>Fotocamera → Consenti</strong></li><li>Torna qui e <strong>ricarica</strong></li></ol>';
      if (/FxiOS/.test(ua))  return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Vai in <strong>Impostazioni → Firefox</strong></li><li>Tocca <strong>Fotocamera → Consenti</strong></li><li>Torna qui e <strong>ricarica</strong></li></ol>';
      if (/EdgiOS/.test(ua)) return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Vai in <strong>Impostazioni → Edge</strong></li><li>Tocca <strong>Fotocamera → Consenti</strong></li><li>Torna qui e <strong>ricarica</strong></li></ol>';
      // Safari iOS (default)
      return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Vai in <strong>Impostazioni → Safari</strong></li><li>Tocca <strong>Fotocamera → Consenti</strong></li><li>Torna qui e <strong>ricarica</strong></li></ol>';
    }

    // Android
    if (/SamsungBrowser/.test(ua)) return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Tocca <strong>🔒</strong> nella barra → <strong>Autorizzazioni → Fotocamera → Consenti</strong></li><li>Oppure: <strong>Impostazioni → App → Samsung Internet → Autorizzazioni → Fotocamera</strong></li><li><strong>Ricarica</strong> la pagina</li></ol>';
    if (/Firefox/.test(ua))       return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Tocca <strong>🔒</strong> nella barra → <strong>Autorizzazioni sito → Fotocamera → Consenti</strong></li><li>Oppure: <strong>Impostazioni Firefox → Autorizzazioni sito → Fotocamera</strong></li><li><strong>Ricarica</strong> la pagina</li></ol>';
    if (/EdgA/.test(ua))          return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Tocca <strong>🔒</strong> nella barra → <strong>Autorizzazioni → Fotocamera → Consenti</strong></li><li>Oppure: <strong>Impostazioni → App → Edge → Autorizzazioni → Fotocamera</strong></li><li><strong>Ricarica</strong> la pagina</li></ol>';
    // Chrome Android (default Android)
    return 'Fotocamera bloccata.<br><br><ol class="permission-steps"><li>Tocca <strong>🔒</strong> nella barra dell\'indirizzo → <strong>Autorizzazioni → Fotocamera → Consenti</strong></li><li>Oppure: <strong>Impostazioni → App → Chrome → Autorizzazioni → Fotocamera</strong></li><li><strong>Ricarica</strong> la pagina</li></ol>';
  }

  function showDeniedInstructions(reason) {
    introDefault.style.display = 'none';
    introDenied.style.display = 'block';
    intro.classList.remove('hidden');
    introDenied.querySelector('.instructions').innerHTML = getCameraInstructions(reason);
  }

  // Controlla subito se la camera è già bloccata — funziona su Chrome/Android, non su iOS (Safari non supporta permissions API per camera)
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'camera' }).then(status => {
      if (status.state === 'denied') showDeniedInstructions('denied');
      status.onchange = () => {
        if (status.state === 'denied') showDeniedInstructions('denied');
      };
    }).catch(() => {});
  }

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
    if (err.name === 'NotAllowedError') {
      showDeniedInstructions('denied');
    } else if (err.message === 'SceneTimeout') {
      showDeniedInstructions('timeout');
    } else {
      showDeniedInstructions('other');
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

  function openDiaryOverlay() {
    if (currentTimeline === 'present') return;
    document.getElementById('diary-content-past').classList.toggle('hidden', currentTimeline !== 'past');
    document.getElementById('diary-content-future').classList.toggle('hidden', currentTimeline !== 'future');
    diaryOverlay.classList.remove('hidden');
  }

  function closeDiaryOverlay() {
    diaryOverlay.classList.add('hidden');
  }

  document.getElementById('diary-close-btn').addEventListener('click', closeDiaryOverlay);

  // === LISTENER TARGET CON TRACCIAMENTO ATTIVO ===
  if (targetPhoto) {
    targetPhoto.addEventListener('targetFound', () => {
      console.log('🎯 TARGET 0 (photo) trovato');
      activeTarget = 'photo';
      showUI();
      syncActiveTarget();
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
      syncActiveTarget();
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
      syncActiveTarget();
    });
    targetDisegno.addEventListener('targetLost', () => {
      if (activeTarget === 'disegno') { activeTarget = null; hideUI(); }
    });
  }
  if (targetCalendario) {
    targetCalendario.addEventListener('targetFound', () => {
      console.log('🎯 TARGET 3 (calendario) trovato');
      activeTarget = 'calendario';
      showUI();
      syncActiveTarget();
      document.dispatchEvent(new CustomEvent('mm-target', { detail: 'calendario' }));
    });
    targetCalendario.addEventListener('targetLost', () => {
      if (activeTarget === 'calendario') { activeTarget = null; hideUI(); document.dispatchEvent(new CustomEvent('mm-target', { detail: null })); }
    });
  }
  if (targetCamion1 && infoCamion1) {
    targetCamion1.addEventListener('targetFound', () => {
      console.log('🚒 TARGET 8 (camion1) trovato');
      activeTarget = 'camion1';
      scanHint.classList.add('hidden');
      infoCamion1.classList.remove('hidden');
    });
    targetCamion1.addEventListener('targetLost', () => {
      if (activeTarget === 'camion1') {
        activeTarget = null;
        infoCamion1.classList.add('hidden');
        infoCamion1.classList.remove('collapsed');
        scanHint.classList.remove('hidden');
      }
    });
  }
  if (targetCamion2 && infoCamion2) {
    targetCamion2.addEventListener('targetFound', () => {
      console.log('🚒 TARGET 9 (camion2) trovato');
      activeTarget = 'camion2';
      scanHint.classList.add('hidden');
      infoCamion2.classList.remove('hidden');
    });
    targetCamion2.addEventListener('targetLost', () => {
      if (activeTarget === 'camion2') {
        activeTarget = null;
        infoCamion2.classList.add('hidden');
        infoCamion2.classList.remove('collapsed');
        scanHint.classList.remove('hidden');
      }
    });
  }
  if (targetCamion3 && infoCamion3) {
    targetCamion3.addEventListener('targetFound', () => {
      console.log('🚒 TARGET 10 (camion3) trovato');
      activeTarget = 'camion3';
      scanHint.classList.add('hidden');
      infoCamion3.classList.remove('hidden');
    });
    targetCamion3.addEventListener('targetLost', () => {
      if (activeTarget === 'camion3') {
        activeTarget = null;
        infoCamion3.classList.add('hidden');
        infoCamion3.classList.remove('collapsed');
        scanHint.classList.remove('hidden');
      }
    });
  }

  // Toggle apertura/chiusura card info (generico per tutti i camion)
  document.querySelectorAll('.info-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.info-card').classList.toggle('collapsed');
    });
  });
  if (targetDiario) {
    targetDiario.addEventListener('targetFound', () => {
      console.log('📓 TARGET 6 (diario) trovato');
      activeTarget = 'diario';
      showUI();
      syncActiveTarget();
      document.dispatchEvent(new CustomEvent('mm-target', { detail: 'diario' }));
    });
    targetDiario.addEventListener('targetLost', () => {
      if (activeTarget === 'diario') {
        activeTarget = null;
        closeDiaryOverlay();
        hideUI();
        document.dispatchEvent(new CustomEvent('mm-target', { detail: null }));
      }
    });
  }

  if (targetPostit) {
    targetPostit.addEventListener('targetFound', () => {
      console.log('📌 TARGET 5 (postit) trovato');
      activeTarget = 'postit';
      showUI();
      syncActiveTarget();
      document.dispatchEvent(new CustomEvent('mm-target', { detail: 'postit' }));
    });
    targetPostit.addEventListener('targetLost', () => {
      if (activeTarget === 'postit') {
        activeTarget = null;
        hideUI();
        document.dispatchEvent(new CustomEvent('mm-target', { detail: null }));
      }
    });
  }

  if (targetLibro) {
    targetLibro.addEventListener('targetFound', () => {
      console.log('📚 TARGET 7 (libro) trovato');
      activeTarget = 'libro';
      showUI();
      syncActiveTarget();
      document.dispatchEvent(new CustomEvent('mm-target', { detail: 'libro' }));
    });
    targetLibro.addEventListener('targetLost', () => {
      if (activeTarget === 'libro') {
        activeTarget = null;
        hideUI();
        document.dispatchEvent(new CustomEvent('mm-target', { detail: null }));
      }
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

  // Sincronizza l'oggetto appena trovato allo stato corrente della ghiera (senza fade)
  function syncActiveTarget() {
    const tl = currentTimeline;
    // Aggiorna UI ghiera
    dialLabel.textContent = labels[tl];
    tickPast.classList.toggle('active',    tl === 'past');
    tickPresent.classList.toggle('active', tl === 'present');
    tickFuture.classList.toggle('active',  tl === 'future');

    if (activeTarget === 'photo') {
      photoPlane.setAttribute('src', `#tex-${tl}`);
      setOpacity(photoPlane, 1);
      if (tl === 'past') photoCaption.classList.remove('hidden');
      else photoCaption.classList.add('hidden');
    } else if (activeTarget === 'disegno') {
      drawingPlane.setAttribute('src', `#tex-drawing-${tl}`);
      setOpacity(drawingPlane, 1);
    } else if (activeTarget === 'calendario') {
      calendarioPlane.setAttribute('src', `#tex-calendario-${tl}`);
      setOpacity(calendarioPlane, 1);
    } else if (activeTarget === 'vase') {
      ['past', 'present', 'future'].forEach(t => {
        if (vases[t]) vases[t].setAttribute('visible', t === tl ? 'true' : 'false');
      });
      if (vases[tl]) setOpacity(vases[tl], 1);
    } else if (activeTarget === 'diario') {
      ['past', 'present', 'future'].forEach(t => {
        diaries[t].forEach(m => { if (m) m.setAttribute('visible', t === tl ? 'true' : 'false'); });
      });
      diaries[tl].forEach(m => { if (m) setOpacity(m, 1); });
    } else if (activeTarget === 'postit') {
      ['past', 'present', 'future'].forEach(t => {
        postits[t].forEach(m => { if (m) m.setAttribute('visible', t === tl ? 'true' : 'false'); });
      });
      postits[tl].forEach(m => { if (m) setOpacity(m, 1); });
    } else if (activeTarget === 'libro') {
      ['past', 'present', 'future'].forEach(t => {
        libros[t].forEach(m => { if (m) m.setAttribute('visible', t === tl ? 'true' : 'false'); });
      });
      libros[tl].forEach(m => { if (m) setOpacity(m, 1); });
    }
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
    } else if (activeTarget === 'calendario') {
      animateFade(calendarioPlane, true, fadeTime);
      setTimeout(() => {
        calendarioPlane.setAttribute('src', `#tex-calendario-${timeline}`);
        animateFade(calendarioPlane, false, fadeTime, () => { isFading = false; });
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
    } else if (activeTarget === 'diario') {
      if (!diaryOverlay.classList.contains('hidden')) closeDiaryOverlay();
      const oldPieces = diaries[oldTimeline];
      const newPieces = diaries[timeline];
      oldPieces.forEach(m => animateFade(m, true, fadeTime));
      setTimeout(() => {
        oldPieces.forEach(m => { if (m) m.setAttribute('visible', 'false'); });
        const last = newPieces[newPieces.length - 1];
        newPieces.forEach(m => {
          if (!m) return;
          m.setAttribute('visible', 'true');
          setOpacity(m, 0);
          animateFade(m, false, fadeTime, m === last ? () => { isFading = false; } : null);
        });
        if (!last) isFading = false;
      }, fadeTime);
    } else if (activeTarget === 'postit') {
      const oldPieces = postits[oldTimeline];
      const newPieces = postits[timeline];
      oldPieces.forEach(m => animateFade(m, true, fadeTime));
      setTimeout(() => {
        oldPieces.forEach(m => { if (m) m.setAttribute('visible', 'false'); });
        const last = newPieces[newPieces.length - 1];
        newPieces.forEach(m => {
          if (!m) return;
          m.setAttribute('visible', 'true');
          setOpacity(m, 0);
          animateFade(m, false, fadeTime, m === last ? () => { isFading = false; } : null);
        });
        if (!last) isFading = false;
      }, fadeTime);
    } else if (activeTarget === 'libro') {
      const oldPieces = libros[oldTimeline];
      const newPieces = libros[timeline];
      oldPieces.forEach(m => animateFade(m, true, fadeTime));
      setTimeout(() => {
        oldPieces.forEach(m => { if (m) m.setAttribute('visible', 'false'); });
        const last = newPieces[newPieces.length - 1];
        newPieces.forEach(m => {
          if (!m) return;
          m.setAttribute('visible', 'true');
          setOpacity(m, 0);
          animateFade(m, false, fadeTime, m === last ? () => { isFading = false; } : null);
        });
        if (!last) isFading = false;
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
    const timeline = timelineFromAngle(currentAngle);
    setNeedleAngle(angles[timeline], true);
    if (!isFading) applyTimeline(timeline);
  }

  // Mouse
  dialSvg.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  // Touch
  dialSvg.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  window.addEventListener('touchmove', (e) => { if (!isDragging) return; e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  window.addEventListener('touchend', endDrag);

  // Tap su canvas AR per aprire overlay diario
  sceneEl.addEventListener('touchstart', (e) => {
    if (activeTarget !== 'diario') return;
    if (!diaryOverlay.classList.contains('hidden')) return;
    if (dial.contains(e.target)) return;
    openDiaryOverlay();
  }, { passive: true });

  // Tap diretto sulle tacche
  tickPast.addEventListener('click',    () => { if (!isFading) { setNeedleAngle(angles.past, true);    applyTimeline('past');    } });
  tickPresent.addEventListener('click', () => { if (!isFading) { setNeedleAngle(angles.present, true); applyTimeline('present'); } });
  tickFuture.addEventListener('click',  () => { if (!isFading) { setNeedleAngle(angles.future, true);  applyTimeline('future');  } });
});

// === DEBUG PANEL (rimuovere in produzione) ===
(function () {
  const steps    = { px: 0.05, py: 0.05, pz: 0.05, rx: 5, ry: 5, rz: 5, s: 0.1, w: 0.05, h: 0.05 };
  const decimals = { px: 2,    py: 2,    pz: 2,    rx: 0, ry: 0, rz: 0, s:   1, w: 2,    h: 2    };

  const defaultState = (overrides) => Object.assign({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, s: 1 }, overrides);

  const germoglioState = defaultState({ rx: 90, s: 0.3 });
  const vasoStates = {
    past:    defaultState({ px: -4.10, py: -0.15, pz: -0.35, rx: 60, s: 3.8 }),
    present: defaultState({ px: -7.80, py:  0.45, pz: -1.45, rx: 70, s: 5.0 }),
    future:  defaultState({ px: -3.20, py: -0.15, pz: -0.35, rx: 60, s: 3.8 }),
  };
  const calendarioStates = {
    past:    Object.assign(defaultState({ py: 0.60, s: 1.8 }), { w: 1.05, h: 1.55 }),
    present: Object.assign(defaultState({ py: 0.60, s: 1.9 }), { w: 1.25, h: 1.70 }),
    future:  Object.assign(defaultState({ py: 1.0,  s: 2.0 }), { w: 1.25, h: 1.40 }),
  };
  const diarioStates = {
    past:    defaultState(),
    present: defaultState(),
    future:  defaultState(),
  };
  const libroStates = {
    past:    defaultState(),
    present: defaultState(),
    future:  defaultState(),
  };
  const postitStates = {
    past:    defaultState(),
    present: defaultState(),
    future:  defaultState(),
  };

  try {
    const g = localStorage.getItem('germoglio-debug');
    if (g) Object.assign(germoglioState, JSON.parse(g));
    const v = localStorage.getItem('vaso-debug');
    if (v) Object.assign(vasoStates, JSON.parse(v));
    const c = localStorage.getItem('calendario-debug');
    if (c) Object.assign(calendarioStates, JSON.parse(c));
    const d = localStorage.getItem('diario-debug');
    if (d) Object.assign(diarioStates, JSON.parse(d));
    const l = localStorage.getItem('libro-debug');
    if (l) Object.assign(libroStates, JSON.parse(l));
    const p = localStorage.getItem('postit-debug');
    if (p) Object.assign(postitStates, JSON.parse(p));
  } catch (e) {}

  let activeDbgTarget = null;
  let activeTimeline  = 'present';

  const timelineLabels = { past: 'PASSATO', present: 'PRESENTE', future: 'FUTURO' };

  function currentState() {
    if (activeDbgTarget === 'germoglio') return germoglioState;
    if (activeDbgTarget === 'vaso')      return vasoStates[activeTimeline];
    if (activeDbgTarget === 'calendario') return calendarioStates[activeTimeline];
    if (activeDbgTarget === 'diario')    return diarioStates[activeTimeline];
    if (activeDbgTarget === 'libro')     return libroStates[activeTimeline];
    if (activeDbgTarget === 'postit')    return postitStates[activeTimeline];
    return null;
  }

  function currentModel() {
    if (activeDbgTarget === 'germoglio') return document.getElementById('plant-model');
    if (activeDbgTarget === 'vaso')      return document.getElementById(`vase-${activeTimeline}`);
    if (activeDbgTarget === 'calendario') return document.getElementById('calendario-wrapper');
    if (activeDbgTarget === 'diario') {
      const ids = activeTimeline === 'present'
        ? [`diario-present-model`]
        : activeTimeline === 'past'
          ? [`diario-past-model`]
          : [`diario-future-model`];
      return ids.map(id => document.getElementById(id)).filter(Boolean);
    }
    if (activeDbgTarget === 'libro') {
      const ids = activeTimeline === 'future'
        ? [`libro-future-model-a`, `libro-future-model-b`]
        : [`libro-${activeTimeline}-model`];
      return ids.map(id => document.getElementById(id)).filter(Boolean);
    }
    if (activeDbgTarget === 'postit') {
      return [`postit-${activeTimeline}-model-a`, `postit-${activeTimeline}-model-b`]
        .map(id => document.getElementById(id)).filter(Boolean);
    }
    return null;
  }

  function applyToModel() {
    const state = currentState();
    const models = currentModel();
    if (!state || !models) return;
    const list = Array.isArray(models) ? models : [models];
    list.forEach(model => {
      model.setAttribute('position', `${state.px} ${state.py} ${state.pz}`);
      model.setAttribute('rotation', `${state.rx} ${state.ry} ${state.rz}`);
      model.setAttribute('scale',    `${state.s} ${state.s} ${state.s}`);
    });
    if (activeDbgTarget === 'calendario') {
      const plane = document.getElementById('calendario-plane');
      if (plane) {
        plane.setAttribute('width',  state.w);
        plane.setAttribute('height', state.h);
      }
    }
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
    const planeDims = document.getElementById('dbg-plane-dims');
    if (activeDbgTarget === 'germoglio') {
      label.textContent       = '🌱 GERMOGLIO';
      controls.style.display  = 'block';
      planeDims.style.display = 'none';
      renderDisplay();
    } else if (activeDbgTarget === 'vaso') {
      label.textContent       = `🏺 VASO — ${timelineLabels[activeTimeline]}`;
      controls.style.display  = 'block';
      planeDims.style.display = 'none';
      renderDisplay();
    } else if (activeDbgTarget === 'calendario') {
      label.textContent       = `📅 CALENDARIO — ${timelineLabels[activeTimeline]}`;
      controls.style.display  = 'block';
      planeDims.style.display = 'block';
      renderDisplay();
    } else if (activeDbgTarget === 'diario') {
      label.textContent       = `📓 DIARIO — ${timelineLabels[activeTimeline]}`;
      controls.style.display  = 'block';
      planeDims.style.display = 'none';
      renderDisplay();
    } else if (activeDbgTarget === 'libro') {
      label.textContent       = `📚 LIBRO — ${timelineLabels[activeTimeline]}`;
      controls.style.display  = 'block';
      planeDims.style.display = 'none';
      renderDisplay();
    } else if (activeDbgTarget === 'postit') {
      label.textContent       = `📌 POST-IT — ${timelineLabels[activeTimeline]}`;
      controls.style.display  = 'block';
      planeDims.style.display = 'none';
      renderDisplay();
    } else {
      label.textContent       = '— nessun marker —';
      controls.style.display  = 'none';
    }
  }

  // Eventi dal sistema AR
  document.addEventListener('mm-target', e => {
    if (e.detail !== null) activeDbgTarget = e.detail;
    updateContext();
  });

  document.addEventListener('mm-timeline', e => {
    activeTimeline = e.detail;
    if (activeDbgTarget === 'vaso' || activeDbgTarget === 'calendario' || activeDbgTarget === 'diario' || activeDbgTarget === 'libro' || activeDbgTarget === 'postit') {
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
    localStorage.setItem('germoglio-debug',  JSON.stringify(germoglioState));
    localStorage.setItem('vaso-debug',       JSON.stringify(vasoStates));
    localStorage.setItem('calendario-debug', JSON.stringify(calendarioStates));
    localStorage.setItem('diario-debug',     JSON.stringify(diarioStates));
    localStorage.setItem('libro-debug',      JSON.stringify(libroStates));
    localStorage.setItem('postit-debug',     JSON.stringify(postitStates));

    const fmt = (s) =>
      `position="${s.px.toFixed(2)} ${s.py.toFixed(2)} ${s.pz.toFixed(2)}"\n` +
      `rotation="${s.rx} ${s.ry} ${s.rz}"\n` +
      `scale="${s.s.toFixed(1)} ${s.s.toFixed(1)} ${s.s.toFixed(1)}"`;

    const fmtPlane = (s) =>
      `position="${s.px.toFixed(2)} ${s.py.toFixed(2)} ${s.pz.toFixed(2)}"\n` +
      `rotation="${s.rx} ${s.ry} ${s.rz}"\n` +
      `scale="${s.s.toFixed(1)} ${s.s.toFixed(1)} ${s.s.toFixed(1)}"\n` +
      `width="${s.w.toFixed(2)}" height="${s.h.toFixed(2)}"`;

    let text = `=== GERMOGLIO ===\n${fmt(germoglioState)}\n\n`;
    ['past', 'present', 'future'].forEach(t => {
      text += `=== VASO ${timelineLabels[t]} ===\n${fmt(vasoStates[t])}\n\n`;
    });
    ['past', 'present', 'future'].forEach(t => {
      text += `=== CALENDARIO ${timelineLabels[t]} ===\n${fmtPlane(calendarioStates[t])}\n\n`;
    });
    ['past', 'present', 'future'].forEach(t => {
      text += `=== DIARIO ${timelineLabels[t]} ===\n${fmt(diarioStates[t])}\n\n`;
    });
    ['past', 'present', 'future'].forEach(t => {
      text += `=== LIBRO ${timelineLabels[t]} ===\n${fmt(libroStates[t])}\n\n`;
    });
    ['past', 'present', 'future'].forEach(t => {
      text += `=== POST-IT ${timelineLabels[t]} ===\n${fmt(postitStates[t])}\n\n`;
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
  const calWrapper = document.getElementById('calendario-wrapper');
  if (calWrapper) {
    const cs = calendarioStates['present'];
    calWrapper.setAttribute('position', `${cs.px} ${cs.py} ${cs.pz}`);
    calWrapper.setAttribute('rotation', `${cs.rx} ${cs.ry} ${cs.rz}`);
    calWrapper.setAttribute('scale',    `${cs.s} ${cs.s} ${cs.s}`);
    const plane = document.getElementById('calendario-plane');
    if (plane) {
      plane.setAttribute('width',  cs.w);
      plane.setAttribute('height', cs.h);
    }
  }

  ['past', 'present', 'future'].forEach(t => {
    const ids = t === 'present'
      ? [`diario-present-model`]
      : t === 'past'
        ? [`diario-past-model`]
        : [`diario-future-model`];
    const s = diarioStates[t];
    ids.forEach(id => {
      const model = document.getElementById(id);
      if (model) {
        model.setAttribute('position', `${s.px} ${s.py} ${s.pz}`);
        model.setAttribute('rotation', `${s.rx} ${s.ry} ${s.rz}`);
        model.setAttribute('scale',    `${s.s} ${s.s} ${s.s}`);
      }
    });
  });

  ['past', 'present', 'future'].forEach(t => {
    const ids = t === 'future'
      ? [`libro-future-model-a`, `libro-future-model-b`]
      : [`libro-${t}-model`];
    const s = libroStates[t];
    ids.forEach(id => {
      const model = document.getElementById(id);
      if (model) {
        model.setAttribute('position', `${s.px} ${s.py} ${s.pz}`);
        model.setAttribute('rotation', `${s.rx} ${s.ry} ${s.rz}`);
        model.setAttribute('scale',    `${s.s} ${s.s} ${s.s}`);
      }
    });
  });

  ['past', 'present', 'future'].forEach(t => {
    const ids = [`postit-${t}-model-a`, `postit-${t}-model-b`];
    const s = postitStates[t];
    ids.forEach(id => {
      const model = document.getElementById(id);
      if (model) {
        model.setAttribute('position', `${s.px} ${s.py} ${s.pz}`);
        model.setAttribute('rotation', `${s.rx} ${s.ry} ${s.rz}`);
        model.setAttribute('scale',    `${s.s} ${s.s} ${s.s}`);
      }
    });
  });

  updateContext();
})();