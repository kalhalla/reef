import * as THREE from 'three';

// Single source of truth for colours and tuning knobs.
// Everything visual touches this file first.

export const palette = {
  // water + atmosphere
  deepWater:  new THREE.Color('#0a3d4a'),
  fog:        new THREE.Color('#1a6478'),

  // sky gradient (skydome)
  skyTop:     new THREE.Color('#7fcad8'),
  skyDeep:    new THREE.Color('#082530'),

  // lighting
  sun:        new THREE.Color('#fff2d6'),
  skyHemi:    new THREE.Color('#9fd8e8'),
  groundHemi: new THREE.Color('#3a2a1a'),
  fillWarm:   new THREE.Color('#ffb088'),

  // seabed
  sandBase:   new THREE.Color('#d4a06b'),
  sandDark:   new THREE.Color('#a87a48'),
  sandLight:  new THREE.Color('#e8c089'),

  // coral (Phase 1: one species, pink-orange)
  coralBase:  new THREE.Color('#ff7a6b'),
  coralTip:   new THREE.Color('#ffc89a'),
  coralShadow: new THREE.Color('#c44a52'),
};

export const config = {
  seabedSize: 40,            // 40x40 voxels
  voxelSize: 1,              // 1m cubes
  reefMaxHeight: 20,         // soft ceiling for coral growth
  coralGrowthDuration: 20,   // seconds from seed to fully grown
};
