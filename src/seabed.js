import * as THREE from 'three';
import { palette, config } from './palette.js';

// Flat voxel seabed as a single InstancedMesh.
// Per-voxel colour jitter and a few centimetres of y-wobble
// stop the surface looking like a single plastic plane.

export function createSeabed() {
  const size = config.seabedSize;
  const v = config.voxelSize;
  const count = size * size;

  const geo = new THREE.BoxGeometry(v, v, v);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0.0,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const tmp = new THREE.Object3D();
  const colour = new THREE.Color();
  const half = size / 2;

  let i = 0;
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const wx = (x - half + 0.5) * v;
      const wz = (z - half + 0.5) * v;
      // tiny vertical jitter — imperceptible up close, breaks the flat top
      const wy = -v * 0.5 + (Math.random() - 0.5) * 0.04;
      tmp.position.set(wx, wy, wz);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);

      // pick from three sand tones, then darken slightly
      const t = Math.random();
      if      (t < 0.18) colour.copy(palette.sandDark);
      else if (t > 0.82) colour.copy(palette.sandLight);
      else               colour.copy(palette.sandBase);
      colour.multiplyScalar(0.86 + Math.random() * 0.14);
      mesh.setColorAt(i, colour);

      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  return mesh;
}

// Snap a world-space point on the seabed to the centre of its voxel.
// Returns null if the point is outside the reef.
export function worldToVoxel(point) {
  const v = config.voxelSize;
  const half = config.seabedSize / 2;
  const x = Math.floor(point.x / v + half);
  const z = Math.floor(point.z / v + half);
  if (x < 0 || x >= config.seabedSize || z < 0 || z >= config.seabedSize) return null;
  const wx = (x - half + 0.5) * v;
  const wz = (z - half + 0.5) * v;
  return { wx, wz, x, z };
}
