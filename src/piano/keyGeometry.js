import * as THREE from 'three';

/**
 * Builds a rounded-rectangle key: front corners rounded, top edge bevelled.
 * Extrudes a 2D shape upward then rotates it flat so it sits like a real key.
 */
export function roundedKey(width, height, length) {
  const bevel = 0.03;
  const radius = width > 0.7 ? 0.14 : 0.09;
  const w = width - 2 * bevel;
  const l = length - 2 * bevel;

  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, l / 2);
  shape.lineTo(w / 2, l / 2);
  shape.lineTo(w / 2, -l / 2 + radius);
  shape.quadraticCurveTo(w / 2, -l / 2, w / 2 - radius, -l / 2);
  shape.lineTo(-w / 2 + radius, -l / 2);
  shape.quadraticCurveTo(-w / 2, -l / 2, -w / 2, -l / 2 + radius);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - 2 * bevel,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 5
  });

  geometry.rotateX(-Math.PI / 2);              // extrusion now points up
  geometry.translate(0, -(height - 2 * bevel) / 2, 0);
  return geometry;
}
