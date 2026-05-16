import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { palette, config } from './palette.js';
import { createSeabed } from './seabed.js';
import { Coral } from './coral.js';
import { InputHandler } from './input.js';
import { createComposer } from './postprocessing.js';

const app = document.getElementById('app');
const hint = document.getElementById('hint');

// renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(palette.deepWater);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

// scene
const scene = new THREE.Scene();
scene.background = palette.deepWater;
scene.fog = new THREE.FogExp2(palette.fog.getHex(), 0.018);

// camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(26, 22, 26);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.7;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 60;
controls.minPolarAngle = Math.PI / 18;   // 10° from vertical → 80° tilt down (spec max)
controls.maxPolarAngle = Math.PI * 0.49; // stay just above horizontal
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.mouseButtons = {
  LEFT:   THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT:  THREE.MOUSE.PAN,
};

// lighting
const sun = new THREE.DirectionalLight(palette.sun, 1.45);
sun.position.set(18, 32, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

const hemi = new THREE.HemisphereLight(palette.skyHemi, palette.groundHemi, 0.7);
scene.add(hemi);

// gentle fill from the opposite side so shadowed coral doesn't go black
const fill = new THREE.DirectionalLight(palette.skyHemi, 0.25);
fill.position.set(-12, -4, -10);
scene.add(fill);

// seabed
const seabed = createSeabed();
scene.add(seabed);

// corals
const corals = [];
let firstPlaced = false;
const clock = new THREE.Clock();

function placeCoral(wx, wz) {
  corals.push(new Coral(scene, wx, wz, clock.getElapsedTime()));
  if (!firstPlaced) {
    firstPlaced = true;
    hint.classList.add('faded');
  }
}

new InputHandler(renderer, camera, seabed, placeCoral);

// post-processing
const { composer, underwater } = createComposer(renderer, scene, camera);

// resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// main loop
function tick() {
  const t = clock.getElapsedTime();
  controls.update();
  for (let i = 0; i < corals.length; i++) corals[i].update(t);
  underwater.uniforms.uTime.value = t;
  composer.render();
  requestAnimationFrame(tick);
}
tick();
