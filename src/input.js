import * as THREE from 'three';
import { worldToVoxel } from './seabed.js';

// Distinguishes a tap from an orbit drag by movement + time threshold,
// so OrbitControls and placement can share the same canvas peacefully.

export class InputHandler {
  constructor(renderer, camera, seabed, onPlace) {
    this.camera = camera;
    this.seabed = seabed;
    this.onPlace = onPlace;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.downX = 0;
    this.downY = 0;
    this.downTime = 0;
    this.tracking = false;

    const el = renderer.domElement;
    el.addEventListener('pointerdown', this._onDown);
    el.addEventListener('pointerup', this._onUp);
    el.addEventListener('pointercancel', this._reset);
  }

  _onDown = (e) => {
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downTime = performance.now();
    this.tracking = true;
  };

  _onUp = (e) => {
    if (!this.tracking) return;
    const dx = e.clientX - this.downX;
    const dy = e.clientY - this.downY;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - this.downTime;
    this.tracking = false;
    if (dist > 6 || dt > 400) return; // it was a drag, not a tap
    this._raycast(e.clientX, e.clientY);
  };

  _reset = () => { this.tracking = false; };

  _raycast(clientX, clientY) {
    this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.seabed);
    if (hits.length === 0) return;
    const voxel = worldToVoxel(hits[0].point);
    if (!voxel) return;
    this.onPlace(voxel.wx, voxel.wz, voxel.x, voxel.z);
  }
}
