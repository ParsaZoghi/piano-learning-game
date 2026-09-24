import * as THREE from 'three';

// ---------- STEP 1: scene, camera, renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14110f);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- STEP 2: lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xfff1dc, 0.9);
sun.position.set(-10, 30, 20);
scene.add(sun);

// ---------- STEP 3: build the 88 keys (MIDI 21 = A0 ... 108 = C8) ----------
// Rounded key: extrude a rounded-rectangle footprint, then lay it flat (front corners rounded, bevelled top edge)
function roundedKey(w, h, L) {
  const b = 0.03, r = w > 0.7 ? 0.14 : 0.09;
  w -= 2 * b; L -= 2 * b;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, L / 2); sh.lineTo(w / 2, L / 2); sh.lineTo(w / 2, -L / 2 + r);
  sh.quadraticCurveTo(w / 2, -L / 2, w / 2 - r, -L / 2); sh.lineTo(-w / 2 + r, -L / 2);
  sh.quadraticCurveTo(-w / 2, -L / 2, -w / 2, -L / 2 + r); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 5 });
  g.rotateX(-Math.PI / 2);                 // extrusion now points up, shape's front edge faces +z
  g.translate(0, -(h - 2 * b) / 2, 0);
  return g;
}
// Note-name labels: one small canvas texture per white key, parented to the key so it moves with it
const labels = [];
function addLabel(group, m) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = m % 12 === 0 ? '#b5651d' : '#6b6258';
  g.font = 'bold 28px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(NAMES[m % 12] + (Math.floor(m / 12) - 1), 32, 32);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  p.rotation.x = -Math.PI / 2; p.position.set(0, 0.4, WHITE_L - 0.8); p.visible = false;
  group.add(p); labels.push(p);
}
const WHITE_L = 6, BLACK_L = 3.8;
const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const keys = {};            // midi -> { group, mesh, mat, baseColor, pressColor, target }
const keyMeshes = [];
const isBlack = m => [1, 3, 6, 8, 10].includes(m % 12);
const OFFSET = 51 / 2;      // 52 white keys, centred on x = 0
let whiteCount = 0;

for (let m = 21; m <= 108; m++) {
  const black = isBlack(m);
  const x = black ? whiteCount - OFFSET - 0.5 : whiteCount - OFFSET;
  const baseColor = new THREE.Color(black ? 0x1b1b20 : 0xf6f2e8);
  const pressColor = new THREE.Color(black ? 0x7a4e2a : 0xe3b877);
  const mat = new THREE.MeshStandardMaterial({ color: baseColor.clone(), roughness: black ? 0.35 : 0.5 });
  const geo = roundedKey(black ? 0.58 : 0.94, black ? 0.9 : 0.7, black ? BLACK_L : WHITE_L);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = (black ? BLACK_L : WHITE_L) / 2;      // pivot sits at the back edge
  const group = new THREE.Group();
  group.position.set(x, black ? 0.55 : 0, -WHITE_L / 2);
  group.add(mesh);
  scene.add(group);
  mesh.userData.midi = m;
  keys[m] = { group, mat, baseColor, pressColor, target: 0 };
  keyMeshes.push(mesh);
  if (!black) addLabel(group, m);
  if (!black) whiteCount++;
}

// case around the keys
const wood = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.6 });
const add = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); b.position.set(x, y, z); scene.add(b); };
add(54, 0.6, 7, 0, -0.75, 0);            // base under keys
add(54, 3, 1.6, 0, 0.9, -3.8);           // fallboard behind keys
add(1.4, 2.2, 7, -26.7, -0.1, 0);        // left cheek
add(1.4, 2.2, 7, 26.7, -0.1, 0);         // right cheek

// ---------- STEP 4: camera orbit (no OrbitControls needed) ----------
let theta = 0, phi = 0.85, radius = 40;
const fitRadius = () => Math.min(95, 42 * Math.max(1, 1.9 / (innerWidth / innerHeight)));
radius = fitRadius();
function placeCamera() {
  camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
  camera.lookAt(0, 0, 0);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); radius = fitRadius();
});
addEventListener('wheel', e => { radius = Math.min(100, Math.max(12, radius * (1 + e.deltaY * 0.001))); }, { passive: true });

// ---------- STEP 5: audio engine (samples or synth), sustain pedal, MIDI ----------
let ctx, master, pedal = false;
const voices = {}, down = new Set(), sustained = new Set();
const samples = [];                                   // { midi, buffer }
const setStatus = t => { document.getElementById('status').textContent = t; };
function audio() {
  if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 5a. Samples: fetch + decodeAudioData. File names carry the note, e.g. "C4.mp3", "F#3.wav".
const parseNote = n => {
  const mm = /([A-G])([#b])?(-?\d)/.exec(n); if (!mm) return null;
  return 12 * (+mm[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[mm[1]] + (mm[2] === '#' ? 1 : mm[2] === 'b' ? -1 : 0);
};
async function addSample(name, arrayBuffer) {
  const midi = parseNote(name); if (midi === null) return false;
  samples.push({ midi, buffer: await audio().decodeAudioData(arrayBuffer) });
  return true;
}
// Host your own files, e.g. loadSamplesFromUrls('samples/', ['A1.mp3', 'C3.mp3', 'C5.mp3', 'C7.mp3'])
async function loadSamplesFromUrls(baseUrl, names) {
  let n = 0;
  for (const nm of names) {
    try { const r = await fetch(baseUrl + nm); if (r.ok && await addSample(nm, await r.arrayBuffer())) n++; } catch (e) {}
  }
  setStatus(n + ' samples loaded'); return n;
}
document.getElementById('files').addEventListener('change', async e => {
  let n = 0;
  for (const f of e.target.files) { try { if (await addSample(f.name, await f.arrayBuffer())) n++; } catch (err) {} }
  setStatus(n ? n + ' samples loaded (pitch-shifted between them)' : 'No usable files. Name them like C4.mp3 or F#3.wav');
});

// 5b. Voices: nearest sample re-pitched with playbackRate, or the built-in synth as fallback
function startVoice(m, vel) {
  const c = audio(), t = c.currentTime, out = c.createGain(); out.connect(master);
  if (samples.length) {
    const s = samples.reduce((p, q) => Math.abs(q.midi - m) < Math.abs(p.midi - m) ? q : p);
    const src = c.createBufferSource(); src.buffer = s.buffer;
    src.playbackRate.value = Math.pow(2, (m - s.midi) / 12);
    out.gain.setValueAtTime(vel, t); src.connect(out); src.start(t);
    return { out, nodes: [src] };
  }
  const f = 440 * Math.pow(2, (m - 69) / 12);
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.35 * vel, t + 0.005);
  out.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.6);
  const o1 = c.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
  const g2 = c.createGain(); g2.gain.value = 0.3;
  o1.connect(out); o2.connect(g2); g2.connect(out); o1.start(t); o2.start(t);
  return { out, nodes: [o1, o2] };
}
function stopVoice(m, rel = 0.35) {
  const v = voices[m]; if (!v) return;
  const t = ctx.currentTime;
  v.out.gain.cancelScheduledValues(t);
  v.out.gain.setValueAtTime(Math.max(v.out.gain.value, 0.0001), t);
  v.out.gain.exponentialRampToValueAtTime(0.0001, t + rel);
  v.nodes.forEach(n => n.stop(t + rel + 0.05));
  delete voices[m];
}

// 5c. Key on/off + sustain pedal. The key always rises visually; the sound waits for the pedal.
function noteOn(m, vel = 0.8) {
  if (!keys[m]) return;
  down.add(m); sustained.delete(m);
  if (voices[m]) stopVoice(m, 0.05);                  // re-strike
  voices[m] = startVoice(m, vel);
  keys[m].target = 0.07; keys[m].mat.color.copy(keys[m].pressColor);
  document.getElementById('note').textContent = NAMES[m % 12] + (Math.floor(m / 12) - 1);
}
function noteOff(m) {
  if (!keys[m]) return;
  down.delete(m);
  keys[m].target = 0; keys[m].mat.color.copy(keys[m].baseColor);
  if (pedal) sustained.add(m); else stopVoice(m);
}
function setPedal(on) {
  if (pedal === on) return;
  pedal = on; setStatus(on ? 'Sustain pedal down' : '');
  if (!on) { sustained.forEach(m => { if (!down.has(m)) stopVoice(m, 0.5); }); sustained.clear(); }
}

// 5d. Hardware MIDI keyboard (Web MIDI). Note on/off, velocity and CC64 (sustain).
async function initMIDI() {
  if (!navigator.requestMIDIAccess) { setStatus('Web MIDI is not supported in this browser (try Chrome or Edge).'); return; }
  try {
    const access = await navigator.requestMIDIAccess();
    const hook = () => {
      access.inputs.forEach(inp => {
        inp.onmidimessage = e => {
          const [st, d1, d2] = e.data, cmd = st & 0xf0;
          if (cmd === 0x90 && d2 > 0) noteOn(d1, d2 / 127);
          else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) noteOff(d1);
          else if (cmd === 0xb0 && d1 === 64) setPedal(d2 >= 64);
        };
      });
      setStatus(access.inputs.size ? 'MIDI: ' + [...access.inputs.values()].map(i => i.name).join(', ') : 'MIDI ready, no device found');
    };
    hook(); access.onstatechange = hook;
  } catch (err) { setStatus('MIDI unavailable: ' + err.message); }
}

// 5e. Buttons
document.getElementById('lbl').addEventListener('click', e => { const on = !labels[0].visible; labels.forEach(p => p.visible = on); e.currentTarget.blur(); });
document.getElementById('midiBtn').addEventListener('click', e => { initMIDI(); e.currentTarget.blur(); });

// ---------- STEP 6: input (raycasting + computer keyboard) ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const held = {};          // pointerId -> midi
let orbit = null;
const cv = renderer.domElement;
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(keyMeshes)[0];
  return hit ? hit.object.userData.midi : null;
}
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const m = pick(e);
  if (m !== null) { held[e.pointerId] = m; noteOn(m); }
  else orbit = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
cv.addEventListener('pointermove', e => {
  if (orbit && orbit.id === e.pointerId) {
    theta -= (e.clientX - orbit.x) * 0.005;
    phi = Math.min(1.45, Math.max(0.15, phi - (e.clientY - orbit.y) * 0.005));
    orbit.x = e.clientX; orbit.y = e.clientY;
  } else if (held[e.pointerId] !== undefined) {   // glissando: slide across keys
    const m = pick(e);
    if (m !== null && m !== held[e.pointerId]) { noteOff(held[e.pointerId]); held[e.pointerId] = m; noteOn(m); }
  }
});
const release = e => {
  if (held[e.pointerId] !== undefined) { noteOff(held[e.pointerId]); delete held[e.pointerId]; }
  if (orbit && orbit.id === e.pointerId) orbit = null;
};
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);

const KEYMAP = { a:60, w:61, s:62, e:63, d:64, f:65, t:66, g:67, y:68, h:69, u:70, j:71, k:72, o:73, l:74, p:75, ';':76 };
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); setPedal(true); return; }
  const m = KEYMAP[e.key.toLowerCase()]; if (m && !e.repeat) noteOn(m);
});
addEventListener('keyup', e => {
  if (e.code === 'Space') { setPedal(false); return; }
  const m = KEYMAP[e.key.toLowerCase()]; if (m) noteOff(m);
});

// ---------- STEP 7: render loop (animate key rotation) ----------
(function loop() {
  requestAnimationFrame(loop);
  for (const k of Object.values(keys)) k.group.rotation.x += (k.target - k.group.rotation.x) * 0.35;
  placeCamera();
  renderer.render(scene, camera);
})();

