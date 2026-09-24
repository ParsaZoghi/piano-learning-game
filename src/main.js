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
  const geo = black ? new THREE.BoxGeometry(0.58, 0.9, BLACK_L) : new THREE.BoxGeometry(0.94, 0.7, WHITE_L);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = (black ? BLACK_L : WHITE_L) / 2;      // pivot sits at the back edge
  const group = new THREE.Group();
  group.position.set(x, black ? 0.55 : 0, -WHITE_L / 2);
  group.add(mesh);
  scene.add(group);
  mesh.userData.midi = m;
  keys[m] = { group, mat, baseColor, pressColor, target: 0 };
  keyMeshes.push(mesh);
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

// ---------- STEP 5: sound (Web Audio) ----------
let ctx;
const voices = {};
function noteOn(m) {
  if (voices[m]) return;
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const f = 440 * Math.pow(2, (m - 69) / 12), t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.35, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.6);
  gain.connect(ctx.destination);
  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
  const g2 = ctx.createGain(); g2.gain.value = 0.3;
  o1.connect(gain); o2.connect(g2); g2.connect(gain);
  o1.start(t); o2.start(t);
  voices[m] = { gain, o1, o2 };
  keys[m].target = 0.07;
  keys[m].mat.color.copy(keys[m].pressColor);
  document.getElementById('note').textContent = NAMES[m % 12] + (Math.floor(m / 12) - 1);
}
function noteOff(m) {
  const v = voices[m]; if (!v) return;
  const t = ctx.currentTime;
  v.gain.gain.cancelScheduledValues(t);
  v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0001), t);
  v.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  v.o1.stop(t + 0.4); v.o2.stop(t + 0.4);
  delete voices[m];
  keys[m].target = 0;
  keys[m].mat.color.copy(keys[m].baseColor);
}

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
addEventListener('keydown', e => { const m = KEYMAP[e.key.toLowerCase()]; if (m && !e.repeat) noteOn(m); });
addEventListener('keyup', e => { const m = KEYMAP[e.key.toLowerCase()]; if (m) noteOff(m); });

// ---------- STEP 7: render loop (animate key rotation) ----------
(function loop() {
  requestAnimationFrame(loop);
  for (const k of Object.values(keys)) k.group.rotation.x += (k.target - k.group.rotation.x) * 0.35;
  placeCamera();
  renderer.render(scene, camera);
})();


