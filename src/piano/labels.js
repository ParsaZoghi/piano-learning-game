import * as THREE from 'three';
import { NAMES, WHITE_L, midiToName } from './notes.js';

/**
 * Draws a note-name texture on a small canvas and adds it as a plane to the
 * given key group, parented so it dips with the key. Returns the plane mesh
 * (starts hidden); toggle `.visible` to show/hide labels.
 */
export function addLabel(group, midi) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = midi % 12 === 0 ? '#b5651d' : '#6b6258';
  ctx.font = 'bold 28px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(midiToName(midi), 32, 32);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, 0.4, WHITE_L - 0.8);
  plane.visible = false;
  group.add(plane);
  return plane;
}
