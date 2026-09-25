import { createScene } from './piano/scene.js';
import { buildKeyboard } from './piano/keyboard.js';
import { PianoAudio } from './piano/audio.js';
import { setupInput } from './piano/input.js';
import { setupUI } from './piano/ui.js';

const { scene, camera, renderer, orbitState, placeCamera } = createScene();
const { keys, keyMeshes, labels } = buildKeyboard(scene);

const pianoAudio = new PianoAudio(keys);
setupUI(pianoAudio, labels);
setupInput({ renderer, camera, keyMeshes, orbitState, pianoAudio });

// Optional: serve real samples from public/samples/ and uncomment to use them
// by default instead of the synth. Files must be named like "C4.mp3".
// pianoAudio.loadSamplesFromUrls('/samples/', ['A1.mp3', 'C3.mp3', 'C5.mp3', 'C7.mp3']);

(function animate() {
  requestAnimationFrame(animate);
  for (const key of Object.values(keys)) {
    key.group.rotation.x += (key.target - key.group.rotation.x) * 0.35;
  }
  placeCamera();
  renderer.render(scene, camera);
})();
