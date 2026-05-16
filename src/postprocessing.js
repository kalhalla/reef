import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Underwater grade.
// - Lifts shadows toward a teal tint (uTint) by an adjustable amount (uTintAmount)
// - Pushes overall hue subtly cyan-green
// - Radial vignette
// - Tiny temporal grain so flat areas don't band

const UnderwaterShader = {
  uniforms: {
    tDiffuse:    { value: null },
    uTint:       { value: new THREE.Color('#5fb8c9') },
    uTintAmount: { value: 0.16 },
    uVignette:   { value: 0.95 },
    uTime:       { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3  uTint;
    uniform float uTintAmount;
    uniform float uVignette;
    uniform float uTime;
    varying vec2  vUv;

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 col = src.rgb;

      // shadow-aware tint: tint lives in the darks, lets highlights through
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3  lift = mix(uTint, vec3(1.0), smoothstep(0.0, 0.55, lum));
      col = mix(col, col * lift, uTintAmount);

      // gentle channel push toward cyan-green
      col.r *= 0.96;
      col.g *= 1.02;
      col.b *= 1.05;

      // radial vignette
      vec2 q = vUv - 0.5;
      col *= 1.0 - dot(q, q) * uVignette;

      // dithered grain (very low amplitude)
      float g = fract(sin(dot(vUv * 1024.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.012;

      gl_FragColor = vec4(col, src.a);
    }
  `,
};

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,  // strength
    0.85,  // radius
    0.78   // threshold
  );
  composer.addPass(bloom);

  const underwater = new ShaderPass(UnderwaterShader);
  composer.addPass(underwater);

  composer.addPass(new OutputPass());

  return { composer, underwater, bloom };
}
