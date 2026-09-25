import * as THREE from 'three';

/**
 * Creates the scene, camera and renderer, and wires up a small hand-rolled
 * orbit control (no OrbitControls import needed) plus resize handling.
 * Returns everything the caller needs to add objects and start a render loop.
 */
export function createScene(canvasParent = document.body) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14110f);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  canvasParent.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xfff1dc, 0.9);
  sun.position.set(-10, 30, 20);
  scene.add(sun);

  // Manual orbit: theta/phi/radius -> camera position, updated each frame.
  const orbitState = { theta: 0, phi: 0.85, radius: 40 };
  const fitRadius = () => Math.min(95, 42 * Math.max(1, 1.9 / (innerWidth / innerHeight)));
  orbitState.radius = fitRadius();

  function placeCamera() {
    const { theta, phi, radius } = orbitState;
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(0, 0, 0);
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    orbitState.radius = fitRadius();
  });

  addEventListener(
    'wheel',
    (e) => {
      orbitState.radius = Math.min(100, Math.max(12, orbitState.radius * (1 + e.deltaY * 0.001)));
    },
    { passive: true }
  );

  return { scene, camera, renderer, orbitState, placeCamera };
}
