import * as THREE from 'three';
import { WHITE_L, BLACK_L, isBlack } from './notes.js';

/**
 * Adds a small flat, initially-invisible colored disc on top of a key, used
 * by the tutor to cue "play this next" (blue, fading with look-ahead depth),
 * "correct" (green flash), "wrong" (red flash) and "isolate this bit" (amber).
 * Independent of the label plane and of the key's own press-color material.
 */
export function addHighlight(group, midi) {
  const black = isBlack(midi);
  const radius = black ? 0.22 : 0.32;
  const geometry = new THREE.CircleGeometry(radius, 24);
  const material = new THREE.MeshBasicMaterial({
    color: 0x4fa8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const disc = new THREE.Mesh(geometry, material);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, black ? 0.42 : 0.36, (black ? BLACK_L : WHITE_L) * 0.32);
  group.add(disc);

  return {
    mesh: disc,
    /** state: null to hide, or { color: 0xRRGGBB, opacity: 0..1 } to show. */
    setState(state) {
      if (!state) {
        material.opacity = 0;
        return;
      }
      material.color.setHex(state.color);
      material.opacity = state.opacity;
    }
  };
}
