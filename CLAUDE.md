# Three Timelines — Museo Marazzato AR Experience

## Project overview
WebAR museum experience for Fondazione Marazzato (Area 6 — Eroi su Ruote).
Visitors scan printed markers to trigger AR layers on domestic objects.
A rotary dial (ghiera) snaps to three positions: PASSATO / PRESENTE / FUTURO.
Each position swaps textures (or GLB models) on the active AR target.

**Deployed on GitHub Pages**: `sofials.github.io/Three-Timelines`

## Tech stack
- **MindAR.js** 1.2.5 + **A-Frame** 1.5.0
- **aframe-extras** 7.2.0 (animation-mixer for GLB)
- **Barlow Condensed** font (Google Fonts, weight 600/700)
- **Eruda** (mobile dev console, remove before production)
- No build system — plain HTML/JS/CSS, hosted on GitHub Pages

## File structure
```
MARAZZATO-AR-PROTOTYPE/
├── assets/
│   ├── logo.png          # Brand logo shown in intro card
│   └── targets.mind      # Compiled MindAR image targets (ALL markers must be here)
├── models/
│   ├── germoglio.glb     # Animated sprout (target 2) — rotation="90 0 0" scale="0.3 0.3 0.3"
│   ├── vaso-past.glb     # Vase — past state (target 1)
│   ├── vaso-present.glb  # Vase — present state (target 1)
│   └── vaso-future.glb   # Vase — future state (target 1)
├── textures/
│   ├── past.jpg / present.jpg / future.jpg           # Target 0 (photo)
│   ├── drawingpast.jpg / drawingpresent.jpg / drawingfuture.jpg  # Target 4 (drawing)
│   ├── calendario-past.png / calendario-present.png / calendario-future.png  # Target 3 ✅
│   └── [diario-past/present/future.jpg — ❌ da produrre]
│   └── [libro-past/present/future.jpg — ❌ da produrre]
├── index.html
├── script.js
└── style.css
```

## Target index map
| targetIndex | Marker label | Entity ID             | Pattern | Status        |
|-------------|--------------|----------------------|---------|---------------|
| 0           | 01 FOTO      | ar-target-photo      | A       | ✅ working    |
| 1           | 02 VASO      | ar-target-vase       | B (GLB) | ✅ working — calibrated per-GLB pos/rot/scale |
| 2           | 03 PIANTINA  | ar-target-piantina   | D (anim)| ✅ working — germoglio.glb, rot 90 0 0, scale 0.3 |
| 3           | 04 CALENDARIO| ar-target-calendario | A       | ✅ working — textures .png prodotte |
| 4           | 05 DISEGNO   | ar-target-disegno    | A       | ✅ working    |
| 5           | 06 POST-IT   | ar-target-postit     | A       | ⚠️ in sospeso — da decidere se implementare |
| 6           | 07 DIARIO    | ar-target-diario     | B (GLB) | ❌ da fare — 1 GLB (2 materiali: Cover+Pages) + 6 JPG texture (2×3 timeline) |
| 7           | 08 LIBRO     | ar-target-libro      | A       | ❌ da fare — textures mancanti (tutte e 3) |
| 8           | INFO CAMION 1| ar-target-camion1    | C       | ✅ working — card statica HTML |
| 9           | INFO CAMION 2| ar-target-camion2    | C       | ✅ working — card statica HTML |
| 10          | INFO CAMION 3| ar-target-camion3    | C       | ✅ working — card statica HTML |
| 11          | GERMOGLIO    | ar-target-germoglio  | D (hero)| ❌ not yet    |

**IMPORTANT**: `assets/targets.mind` è già compilato con tutti e 12 i marker (indici 0–11).
Per diario/libro/germoglio NON serve ricompilare — i marker sono già presenti nell'ordine corretto.
Ricompilare solo se si aggiunge un nuovo marker fisico che non era incluso.

## Implementation patterns

### Pattern A — Texture swap on plane (photo, disegno, calendario, postit, diario, libro)
- 3 JPG textures: `textures/<name>-past.jpg`, `<name>-present.jpg`, `<name>-future.jpg`
- Asset IDs: `tex-<name>-past`, `tex-<name>-present`, `tex-<name>-future`
- HTML: `<a-plane id="<name>-plane">` inside entity wrapper with `scale="2.5 2.5 2.5" position="0 1.0 0"`
- JS variable: `const <name>Plane = document.getElementById('<name>-plane')`
- `applyTimeline` branch: animateFade out → setAttribute src → animateFade in
- Listener: `targetFound` → `activeTarget = '<name>'` + `showUI()`

### Pattern B — GLB model swap (vaso)
- 3 GLB models, one per timeline state — each with calibrated position/rotation/scale
- Toggle `visible` + `model-opacity` component for fade
- `applyTimeline` branch: fade old model out → set visible false → set new visible true → fade in
- Wrapper `#vase-wrapper` at `position="0 0 0" scale="1 1 1"` — all transforms on individual models
- Calibrated values (from debug session): past `pos -4.10 -0.15 -0.35 rot 60 0 0 scale 3.8`, present `pos -7.80 0.45 -1.45 rot 70 0 0 scale 5.0`, future `pos -3.20 -0.15 -0.35 rot 60 0 0 scale 3.8`

### Pattern C — Factual card (info camion 1/2/3)
- NO ghiera/dial — these cards show static archival content
- On `targetFound`: hide scan-hint, show a static HTML overlay card (NOT the dial)
- On `targetLost`: hide card, show scan-hint
- Separate `#info-card` HTML div positioned fixed on screen
- `activeTarget = 'camionX'` but `applyTimeline` ignores it

### Pattern D — Ground trigger / animation (piantina, germoglio)
- Animation plays on marker scan, no timeline dial
- On `targetFound`: hide scan-hint only (do NOT call `showUI()`)
- On `targetLost`: show scan-hint again
- For germoglio: marker is placed on floor, target should be offset upward

## Key code variables (script.js)
```javascript
let currentTimeline = 'present';  // 'past' | 'present' | 'future'
let activeTarget = null;          // string matching entity type, e.g. 'photo', 'vase', 'calendario'
let isFading = false;             // prevents concurrent transitions
```

## `applyTimeline` structure (script.js)
```javascript
function applyTimeline(timeline) {
  if (currentTimeline === timeline || isFading) return;
  isFading = true;
  // ... update dial UI, photoCaption logic ...
  if (activeTarget === 'photo') { /* texture swap */ }
  else if (activeTarget === 'disegno') { /* texture swap */ }
  else if (activeTarget === 'vase') { /* GLB swap */ }
  else if (activeTarget === 'calendario') { /* texture swap — già implementato */ }
  // else if (activeTarget === 'diario') { /* da aggiungere — Pattern A + E */ }
  // else if (activeTarget === 'libro') { /* da aggiungere — Pattern A */ }
  else { isFading = false; }
}
```

## Brand / design constraints
- **Palette**: `--mm-cream: #f4f1eb`, `--mm-dark: #333333`, `--mm-red: #c93327`, `--mm-green: #bacd9c`
- **Font**: Barlow Condensed 600/700 only
- **No tap/dwell interaction** — the ONLY interaction is the rotary ghiera (drag or tap on tick marks) + tap sul diario per entrare in modalità lettura
- **No gamification** — the experience must feel contemplative, not game-like
- Physical experience must work WITHOUT AR; digital layers enrich but don't replace

## `model-opacity` custom A-Frame component
Registered in `script.js` before the scene loads. Traverses the GLB mesh and sets
`material.transparent = true` + `material.opacity = N`. Triggered by:
`el.setAttribute('model-opacity', 'opacity: 0.5')`

## Photo caption special case
`#photo-caption` ("Alassio, agosto — 1971") shows ONLY when:
`activeTarget === 'photo' && timeline === 'past'`
All other targets must keep it hidden.

## Adding a new Pattern A target — checklist
1. Add 3 texture files to `textures/`
2. Add 3 `<img>` tags in `<a-assets>` with IDs `tex-<name>-past/present/future`
3. Add `<a-entity mindar-image-target="targetIndex: N">` with inner `<a-plane>`
4. Declare `const targetX` and `const xPlane` variables in DOMContentLoaded
5. Add `if (targetX)` listener block (targetFound / targetLost)
6. Add `else if (activeTarget === '<name>')` branch in `applyTimeline`
7. **NON ricompilare** `assets/targets.mind` — i marker di diario (6) e libro (7) sono già inclusi
