import test from 'node:test';
import assert from 'node:assert/strict';
import type {Device} from '@luma.gl/core';
import {createEmptyTextureCached} from './texture.js';

function gpu(canvas = new EventTarget()) {
  let allocations = 0;
  let live = 0;
  const device = {
    canvasContext: {canvas},
    createTexture() {
      allocations++; live++;
      return {
        destroyed: false,
        copyImageData() {},
        destroy() { if (!this.destroyed) {this.destroyed = true; live--;} },
      };
    },
  } as unknown as Device;
  return {device, canvas, get allocations() {return allocations;}, get live() {return live;}};
}

test('reuses one fallback per device and isolates different canvases', () => {
  const a = gpu(), b = gpu();
  const first = createEmptyTextureCached(a.device);
  assert.equal(createEmptyTextureCached(a.device), first);
  assert.notEqual(createEmptyTextureCached(b.device), first);
  assert.equal(a.allocations, 1);
  assert.equal(b.allocations, 1);
});

test('releases on every context loss and rebuilds on the same device', () => {
  const g = gpu();
  for (let i = 0; i < 10; i++) {
    const texture = createEmptyTextureCached(g.device);
    assert.equal(g.live, 1);
    g.canvas.dispatchEvent(new Event('webglcontextlost'));
    assert.equal(texture.destroyed, true);
    assert.equal(g.live, 0);
  }
  assert.equal(g.allocations, 10);
});

test('replaces device on an existing canvas without retaining the previous fallback', () => {
  const first = gpu();
  const texture = createEmptyTextureCached(first.device);
  const next = gpu(first.canvas);
  assert.notEqual(createEmptyTextureCached(next.device), texture);
  assert.equal(texture.destroyed, true);
  assert.equal(first.live, 0);
  assert.equal(next.live, 1);
  next.canvas.dispatchEvent(new Event('webglcontextlost'));
  assert.equal(next.live, 0);
});

test('replaces an explicitly destroyed fallback', () => {
  const g = gpu();
  const old = createEmptyTextureCached(g.device);
  old.destroy();
  assert.notEqual(createEmptyTextureCached(g.device), old);
  assert.equal(g.live, 1);
  g.canvas.dispatchEvent(new Event('webglcontextlost'));
  assert.equal(g.live, 0);
});
