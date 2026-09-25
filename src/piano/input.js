import * as THREE from 'three';

const KEYMAP = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67,
  y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76
};

/**
 * Wires up pointer input (click/drag a key to play it, drag the background
 * to orbit, wheel to zoom) and the computer-keyboard shortcuts. Dragging
 * across keys while held down plays a glissando.
 */
export function setupInput({ renderer, camera, keyMeshes, orbitState, pianoAudio }) {
  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  const held = {};  // pointerId -> midi currently played by that pointer
  let orbitDrag = null;

  function pick(e) {
    pointerNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(keyMeshes)[0];
    return hit ? hit.object.userData.midi : null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const midi = pick(e);
    if (midi !== null) {
      held[e.pointerId] = midi;
      pianoAudio.noteOn(midi);
    } else {
      orbitDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (orbitDrag && orbitDrag.id === e.pointerId) {
      orbitState.theta -= (e.clientX - orbitDrag.x) * 0.005;
      orbitState.phi = Math.min(1.45, Math.max(0.15, orbitState.phi - (e.clientY - orbitDrag.y) * 0.005));
      orbitDrag.x = e.clientX;
      orbitDrag.y = e.clientY;
    } else if (held[e.pointerId] !== undefined) {
      const midi = pick(e);
      if (midi !== null && midi !== held[e.pointerId]) {
        pianoAudio.noteOff(held[e.pointerId]);
        held[e.pointerId] = midi;
        pianoAudio.noteOn(midi);
      }
    }
  });

  const release = (e) => {
    if (held[e.pointerId] !== undefined) {
      pianoAudio.noteOff(held[e.pointerId]);
      delete held[e.pointerId];
    }
    if (orbitDrag && orbitDrag.id === e.pointerId) orbitDrag = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      pianoAudio.setPedal(true);
      return;
    }
    const midi = KEYMAP[e.key.toLowerCase()];
    if (midi && !e.repeat) pianoAudio.noteOn(midi);
  });

  addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      pianoAudio.setPedal(false);
      return;
    }
    const midi = KEYMAP[e.key.toLowerCase()];
    if (midi) pianoAudio.noteOff(midi);
  });
}
