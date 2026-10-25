/**
 * JM PlayZone · CP10 Three.js BufferGeometry bridge.
 * Authority: Theodore Benjamin Scott / JMISJUSTME
 * Operation gate: JMOP-2ecbf4d767fce914f43bd0b6
 * Consumes JM GameCore compiled IR. Does not embed or replace either body.
 */
export class JMPlayZoneAdapter {
  constructor(threeInstance) {
    this.THREE = threeInstance ?? globalThis.THREE;
    if (!this.THREE) throw new Error('JMPlayZoneAdapter requires an explicit Three.js instance');
    this.currentMesh = null;
    this.basePositions = null;
    this.activeDeform = { type: 'none', amp: 0, freq: 0 };
    this.deformEnabled = true;
  }

  createMesh(ir) {
    if (!ir || !(ir.vertexBuffer instanceof Float32Array) ||
        !(ir.indexBuffer instanceof Uint16Array) ||
        ir.vertexBuffer.length === 0 || ir.vertexBuffer.length % 3 !== 0 ||
        ir.indexBuffer.length === 0 || ir.indexBuffer.length % 3 !== 0 ||
        !ir.deform || !['none', 'wave', 'pulse'].includes(ir.deform.type) ||
        !Number.isFinite(ir.deform.amp) || !Number.isFinite(ir.deform.freq) ||
        !Number.isInteger(ir.color) || ir.color < 0 || ir.color > 0xffffff) {
      throw new TypeError('JMPlayZoneAdapter: invalid compiled mesh IR');
    }
    if (Array.from(ir.indexBuffer).some(i => i >= ir.vertexBuffer.length / 3)) {
      throw new RangeError('JMPlayZoneAdapter: face index exceeds vertex count');
    }

    const positions = new Float32Array(ir.vertexBuffer);
    const indices = new Uint16Array(ir.indexBuffer);
    const geometry = new this.THREE.BufferGeometry();
    const position = new this.THREE.BufferAttribute(positions, 3);
    if (ir.deform.type !== 'none' && typeof position.setUsage === 'function') {
      position.setUsage(this.THREE.DynamicDrawUsage);
    }
    geometry.setAttribute('position', position);
    geometry.setIndex(new this.THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const material = new this.THREE.MeshStandardMaterial({
      color: ir.color, roughness: 0.35, metalness: 0.25,
      flatShading: true, side: this.THREE.DoubleSide
    });
    const replacement = new this.THREE.Mesh(geometry, material);
    this.dispose();
    this.currentMesh = replacement;
    this.basePositions = new Float32Array(ir.vertexBuffer);
    this.activeDeform = { ...ir.deform };
    return replacement;
  }

  update(time) {
    if (!this.currentMesh || !this.deformEnabled || this.activeDeform.type === 'none') return false;
    if (!Number.isFinite(time)) throw new TypeError('JMPlayZoneAdapter.update requires finite time (seconds)');

    const attr = this.currentMesh.geometry.getAttribute('position');
    const { type, amp, freq } = this.activeDeform;
    for (let i = 0; i < this.basePositions.length; i += 3) {
      const bx = this.basePositions[i], by = this.basePositions[i + 1], bz = this.basePositions[i + 2];
      if (type === 'wave') {
        const delta = Math.sin(time * freq + by * 2) * amp;
        attr.setXYZ(i / 3, bx + delta * 0.5, by, bz + delta);
      } else if (type === 'pulse') {
        const factor = 1 + Math.sin(time * freq) * amp;
        attr.setXYZ(i / 3, bx * factor, by * factor, bz * factor);
      }
    }
    this._refreshGeometry();
    return true;
  }

  _refreshGeometry() {
    const geometry = this.currentMesh.geometry;
    geometry.getAttribute('position').needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
  }

  setDeformEnabled(state) {
    this.deformEnabled = Boolean(state);
    if (!this.deformEnabled && this.currentMesh && this.basePositions) {
      this.currentMesh.geometry.getAttribute('position').copyArray(this.basePositions);
      this._refreshGeometry();
    }
  }

  dispose() {
    if (this.currentMesh) {
      if (this.currentMesh.parent) this.currentMesh.parent.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      this.currentMesh.material.dispose();
      this.currentMesh = null;
    }
    this.basePositions = null;
    this.activeDeform = { type: 'none', amp: 0, freq: 0 };
  }
}
