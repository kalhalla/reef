import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { palette, config } from './palette.js';
import { createSeabed, createSeabedExtender } from './seabed.js';
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

// skydome — vertical gradient so the background reads as water volume
// instead of flat paper. ShaderMaterial doesn't auto-apply fog, which is
// exactly what we want: the sky shows its full gradient regardless of
// scene fog, while the rest of the scene still fades into fog naturally.
const skyGeo = new THREE.SphereGeometry(90, 32, 24);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTop:     { value: palette.skyTop },
    uHorizon: { value: palette.fog },
    uDeep:    { value: palette.skyDeep },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uTop;
    uniform vec3 uHorizon;
    uniform vec3 uDeep;
    varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 col = (h >= 0.0)
        ? mix(uHorizon, uTop,  smoothstep(0.0,  0.6, h))
        : mix(uHorizon, uDeep, smoothstep(0.0, -0.5, h));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.frustumCulled = false;
scene.add(sky);

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

// Hemisphere reduced so cyan doesn't dominate every upward-facing surface.
const hemi = new THREE.HemisphereLight(palette.skyHemi, palette.groundHemi, 0.5);
scene.add(hemi);

// Warm fill from above-behind to recover coral warmth on the shadow side.
// Previously this lived below the horizon, illuminating nothing useful.
const fill = new THREE.DirectionalLight(palette.fillWarm, 0.55);
fill.position.set(-12, 8, -10);
scene.add(fill);

// seabed
const seabed = createSeabed();
scene.add(seabed);

// extender plane: visually continues the seabed past the voxel grid edge,
// fading into fog. Without this the 40x40 grid reads as a floating slab.
const seabedExtender = createSeabedExtender();
scene.add(seabedExtender);

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
