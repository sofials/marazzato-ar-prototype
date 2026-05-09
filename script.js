const startBtn = document.getElementById('start-btn');
const intro = document.getElementById('intro');
const scanHint = document.getElementById('scan-hint');
const controls = document.getElementById('timeline-controls');
const sceneEl = document.querySelector('a-scene');
const placeholder = document.getElementById('placeholder');
const targetEntity = document.querySelector('[mindar-image-target]');

// Colori per le 3 timeline (per ora cambia il colore del cubo,
// poi sostituiremo con texture vere)
const colors = {
  past: '#A3BCA0',
  present: '#C72A09',
  future: '#D34C3D'
};

// Avvio AR al click su INIZIA
startBtn.addEventListener('click', async () => {
  intro.classList.add('hidden');
  scanHint.classList.remove('hidden');

  const arSystem = sceneEl.systems['mindar-image-system'];
  await arSystem.start();
});

// Quando il marker viene riconosciuto la prima volta
targetEntity.addEventListener('targetFound', () => {
  console.log('Marker trovato!');
  scanHint.classList.add('hidden');
  controls.classList.remove('hidden');
});

// Switch timeline (per ora cambia colore del cubo)
document.querySelectorAll('.timeline-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const selected = btn.dataset.timeline;

    // Cambia colore del placeholder
    placeholder.setAttribute('color', colors[selected]);

    // Aggiorna stato attivo dei bottoni
    document.querySelectorAll('.timeline-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});