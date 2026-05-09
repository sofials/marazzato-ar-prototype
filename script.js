// === ELEMENTI DOM ===
const startBtn = document.getElementById('start-btn');
const intro = document.getElementById('intro');
const scanHint = document.getElementById('scan-hint');
const dial = document.getElementById('timeline-dial');
const dialSvg = document.getElementById('dial-svg');
const needle = document.getElementById('needle');
const dialLabel = document.getElementById('dial-label');
const sceneEl = document.querySelector('a-scene');
const placeholder = document.getElementById('placeholder');
const targetEntity = document.querySelector('[mindar-image-target]');

const tickPast = document.getElementById('tick-past');
const tickPresent = document.getElementById('tick-present');
const tickFuture = document.getElementById('tick-future');

// === STATO ===
const colors = {
  past: '#A3BCA0',
  present: '#C72A09',
  future: '#D34C3D'
};

// Angoli della lancetta per ogni timeline (gradi, 0 = verticale verso l'alto)
// -90 = sinistra (passato), 0 = alto (presente), 90 = destra (futuro)
const angles = {
  past: -90,
  present: 0,
  future: 90
};

const labels = {
  past: 'PASSATO',
  present: 'PRESENTE',
  future: 'FUTURO'
};

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

targetEntity.addEventListener('targetFound', () => {
  console.log('Marker trovato!');
  scanHint.classList.add('hidden');
  dial.classList.remove('hidden');
  applyTimeline('present');
});

// === LOGICA GHIERA ===

// Calcola l'angolo dato un punto (x,y) relativo al centro della ghiera (120,120)
function angleFromPoint(x, y) {
  // SVG ha y verso il basso, quindi invertiamo per avere "alto = 0°"
  const dx = x - 120;
  const dy = 120 - y;
  // Math.atan2 dà l'angolo in radianti rispetto all'asse x
  // Lo convertiamo in gradi e ruotiamo così che "alto" = 0°
  let angle = Math.atan2(dx, dy) * (180 / Math.PI);
  // Vincoliamo tra -90 e 90 (semicerchio superiore)
  if (angle < -90) angle = -90;
  if (angle > 90) angle = 90;
  return angle;
}

// Converte coordinate cliente del touch/mouse in coordinate SVG
function getSvgCoords(clientX, clientY) {
  const rect = dialSvg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 240;
  const y = ((clientY - rect.top) / rect.height) * 140;
  return { x, y };
}

// Applica un angolo alla lancetta (rotazione visiva)
function setNeedleAngle(angle, animate = true) {
  needle.style.transition = animate
    ? 'transform 0.25s cubic-bezier(0.4, 1.4, 0.6, 1)'
    : 'none';
  needle.style.transform = `rotate(${angle}deg)`;
  currentAngle = angle;
}

// Trova la timeline più vicina a un dato angolo
function timelineFromAngle(angle) {
  if (angle < -45) return 'past';
  if (angle > 45) return 'future';
  return 'present';
}

// Applica una timeline (cambia colore cubo + UI)
function applyTimeline(timeline) {
  currentTimeline = timeline;

  // Cambia colore del placeholder 3D
  placeholder.setAttribute('color', colors[timeline]);

  // Aggiorna label
  dialLabel.textContent = labels[timeline];

  // Aggiorna tacche attive
  tickPast.classList.toggle('active', timeline === 'past');
  tickPresent.classList.toggle('active', timeline === 'present');
  tickFuture.classList.toggle('active', timeline === 'future');
}

// === EVENT HANDLERS DRAG ===

function startDrag(clientX, clientY) {
  isDragging = true;
  const { x, y } = getSvgCoords(clientX, clientY);
  const angle = angleFromPoint(x, y);
  setNeedleAngle(angle, false);
}

function moveDrag(clientX, clientY) {
  if (!isDragging) return;
  const { x, y } = getSvgCoords(clientX, clientY);
  const angle = angleFromPoint(x, y);
  setNeedleAngle(angle, false);

  // Aggiornamento "live" dello stato mentre trascini
  const timeline = timelineFromAngle(angle);
  if (timeline !== currentTimeline) {
    applyTimeline(timeline);
  }
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;

  // Snap all'angolo della timeline più vicina
  const timeline = timelineFromAngle(currentAngle);
  setNeedleAngle(angles[timeline], true);
  applyTimeline(timeline);
}

// Mouse events (desktop / debug)
dialSvg.addEventListener('mousedown', (e) => {
  e.preventDefault();
  startDrag(e.clientX, e.clientY);
});
window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
window.addEventListener('mouseup', endDrag);

// Touch events (mobile)
dialSvg.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  startDrag(t.clientX, t.clientY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const t = e.touches[0];
  moveDrag(t.clientX, t.clientY);
}, { passive: false });

window.addEventListener('touchend', endDrag);

// Tap diretto su una tacca (fallback senza drag)
tickPast.addEventListener('click', () => {
  setNeedleAngle(angles.past, true);
  applyTimeline('past');
});
tickPresent.addEventListener('click', () => {
  setNeedleAngle(angles.present, true);
  applyTimeline('present');
});
tickFuture.addEventListener('click', () => {
  setNeedleAngle(angles.future, true);
  applyTimeline('future');
});