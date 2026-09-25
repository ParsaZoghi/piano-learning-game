import * as THREE from 'three';
import { MIDI_MIN, MIDI_MAX, WHITE_L, BLACK_L, isBlack } from './notes.js';
import { roundedKey } from './keyGeometry.js';
import { addLabel } from './labels.js';

/**
 * Builds all 88 keys (MIDI 21..108) plus the case, adds them to `scene`,
 * and returns a lookup used by audio/input/animation:
 *   keys[midi] = { group, mat, baseColor, pressColor, target }
 *   keyMeshes  = flat array of pressable meshes (for raycasting)
 *   labels     = flat array of label planes (for the Labels toggle)
 */
export function buildKeyboard(scene) {
  const keys = {};
  const keyMeshes = [];
  const labels = [];

  const OFFSET = 51 / 2; // 52 white keys, centred on x = 0
  let whiteCount = 0;

  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const black = isBlack(midi);
    const x = black ? whiteCount - OFFSET - 0.5 : whiteCount - OFFSET;

    const baseColor = new THREE.Color(black ? 0x1b1b20 : 0xf6f2e8);
    const pressColor = new THREE.Color(black ? 0x7a4e2a : 0xe3b877);
    const mat = new THREE.MeshStandardMaterial({ color: baseColor.clone(), roughness: black ? 0.35 : 0.5 });

    const geo = roundedKey(black ? 0.58 : 0.94, black ? 0.9 : 0.7, black ? BLACK_L : WHITE_L);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = (black ? BLACK_L : WHITE_L) / 2; // pivot at the back edge

    const group = new THREE.Group();
    group.position.set(x, black ? 0.55 : 0, -WHITE_L / 2);
    group.add(mesh);
    scene.add(group);

    mesh.userData.midi = midi;
    keys[midi] = { group, mat, baseColor, pressColor, target: 0 };
    keyMeshes.push(mesh);

    if (!black) {
      labels.push(addLabel(group, midi));
      whiteCount++;
    }
  }

  buildCase(scene);
  return { keys, keyMeshes, labels };
}

function buildCase(scene) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.6 });
  const add = (w, h, d, x, y, z) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    box.position.set(x, y, z);
    scene.add(box);
  };
  add(54, 0.6, 7, 0, -0.75, 0);      // base under keys
  add(54, 3, 1.6, 0, 0.9, -3.8);     // fallboard behind keys
  add(1.4, 2.2, 7, -26.7, -0.1, 0);  // left cheek
  add(1.4, 2.2, 7, 26.7, -0.1, 0);   // right cheek
}
