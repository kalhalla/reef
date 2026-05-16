import * as THREE from 'three';
import { palette, config } from './palette.js';

// Phase 1 placeholder coral.
// Generates a recursive branching skeleton (trunk + side branches),
// then runs a thickening pass that clusters voxels around low-depth,
// low-height segments. Result: bulbous base, tapering tips.
// DLA replaces this in Phase 2.

function planCoral() {
  const segments = [];
  const seen = new Set();
  const key = (x, y, z) => `${x},${y},${z}`;

  function add(x, y, z, depth) {
    if (y < 0 || y > config.reefMaxHeight) return false;
    const k = key(x, y, z);
    if (seen.has(k)) return false;
    seen.add(k);
    segments.push({ x, y, z, depth });
    return true;
  }

  // Horizontal-only directions, used for branches starting off the trunk.
  // Diagonal-up directions are reserved for established branches reaching for light.
  const horizDirs = [[ 1, 0,  0], [-1, 0,  0], [ 0, 0,  1], [ 0, 0, -1]];
  const diagDirs  = [[ 1, 1,  0], [-1, 1,  0], [ 0, 1,  1], [ 0, 1, -1]];

  function grow(x, y, z, dx, dy, dz, life, depth) {
    if (life <= 0 || depth > 4) return;
    const nx = x + dx, ny = y + dy, nz = z + dz;
    if (!add(nx, ny, nz, depth)) return;

    // Trunk branches readily; deeper branches less so.
    const branchChance = depth === 0 ? 0.35 : 0.22 + depth * 0.05;
    if (Math.random() < branchChance && depth < 4) {
      // Trunk only spawns horizontal side branches.
      // Deeper recursion may angle upward.
      const dirs = depth === 0
        ? horizDirs
        : (Math.random() < 0.55 ? horizDirs : diagDirs);
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      grow(nx, ny, nz, d[0], d[1], d[2], 3 + Math.floor(Math.random() * 3), depth + 1);
    }

    // Continue in same direction. Horizontal branches drift upward occasionally.
    let cdy = dy;
    if (depth >= 1 && cdy === 0 && Math.random() < 0.3) cdy = 1;
    grow(nx, ny, nz, dx, cdy, dz, life - 1, depth);
  }

  add(0, 0, 0, 0);
  grow(0, 0, 0, 0, 1, 0, 5 + Math.floor(Math.random() * 4), 0);

  // Thickening pass: cluster horizontal neighbours around low-depth, low-height
  // segments so the base reads as bulbous and the tips stay thin.
  const horiz = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  const orig = [...segments];
  for (const s of orig) {
    const heightFactor = Math.max(0, 1 - s.y / 6);
    const depthFactor  = Math.max(0, 1 - s.depth * 0.3);
    const thickChance  = 0.6 * heightFactor * depthFactor;
    if (Math.random() < thickChance) {
      const d = horiz[Math.floor(Math.random() * horiz.length)];
      add(s.x + d[0], s.y + d[1], s.z + d[2], s.depth + 1);
      if (Math.random() < thickChance * 0.5) {
        const d2 = horiz[Math.floor(Math.random() * horiz.length)];
        add(s.x + d2[0], s.y + d2[1], s.z + d2[2], s.depth + 1);
      }
    }
  }

  return segments;
}

function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Coral {
  constructor(scene, worldX, worldZ, startTime) {
    this.worldX = worldX;
    this.worldZ = worldZ;
    this.startTime = startTime;
    this.duration = config.coralGrowthDuration;
    this.done = false;

    this.segments = planCoral();
    // bottom-up with mild jitter so equal-height branches don't all pop together
    this.segments.sort((a, b) => (a.y - b.y) + (Math.random() - 0.5) * 0.4);

    // assign a birth fraction along the growth duration, plus a colour
    const n = this.segments.length;
    for (let i = 0; i < n; i++) {
      const s = this.segments[i];
      s.birth = (i / n) * 0.85;             // last segment finishes blooming at t≈1
      s.bloomWindow = 0.18;                  // each cube blooms over this slice of total time
      s.lastScale = -1;

      // colour drift: coral base near the seabed → coral tip up high
      const heightT = Math.min(1, s.y / 8);
      const c = palette.coralBase.clone().lerp(palette.coralTip, heightT * 0.65);
      c.offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.06);
      s.colour = c;
    }

    const geo = new THREE.BoxGeometry(config.voxelSize, config.voxelSize, config.voxelSize);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.55,
      metalness: 0.05,
      emissive: palette.coralShadow,
      emissiveIntensity: 0.08,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; // matrices change every frame, bounding box won't track

    const tmp = new THREE.Object3D();
    const v = config.voxelSize;
    for (let i = 0; i < n; i++) {
      const s = this.segments[i];
      tmp.position.set(
        worldX + s.x * v,
        s.y * v + v * 0.5,         // sit on top of the seabed (seabed top is at y=0)
        worldZ + s.z * v
      );
      tmp.scale.setScalar(0.001);
      tmp.updateMatrix();
      this.mesh.setMatrixAt(i, tmp.matrix);
      this.mesh.setColorAt(i, s.colour);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    scene.add(this.mesh);
  }

  update(time) {
    if (this.done) return;
    const t = (time - this.startTime) / this.duration;
    const tmp = new THREE.Object3D();
    const v = config.voxelSize;
    let dirty = false;
    let allFull = true;

    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      const localT = (t - s.birth) / s.bloomWindow;
      let scale = 0;
      if (localT > 0) scale = easeOutBack(Math.min(1, localT));
      if (scale < 1) allFull = false;
      if (scale === s.lastScale) continue;
      s.lastScale = scale;
      dirty = true;

      tmp.position.set(
        this.worldX + s.x * v,
        s.y * v + v * 0.5,
        this.worldZ + s.z * v
      );
      tmp.scale.setScalar(Math.max(0.001, scale));
      tmp.updateMatrix();
      this.mesh.setMatrixAt(i, tmp.matrix);
    }

    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
    if (allFull) this.done = true;
  }
}
