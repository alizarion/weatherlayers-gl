import assert from 'node:assert';
import test from 'node:test';

import type {Device, SamplerProps, TextureFormat, TextureProps} from '@luma.gl/core';
import {createTextureCached} from './texture.js';

// Mali-T720 (Android 7 tablet): float textures can be created and sampled with `nearest`,
// but EXT_color_buffer_float is missing, so they cannot be render targets.
function createDevice(sampledFormats: TextureFormat[]): {device: Device; created: TextureProps[]} {
  const created: TextureProps[] = [];
  const device = {
    features: new Set<string>(),
    isTextureFormatSupported: (format: TextureFormat) => sampledFormats.includes(format),
    createTexture: (props: TextureProps) => {
      created.push(props);
      return {copyImageData: () => {}};
    },
  } as unknown as Device;
  return {device, created};
}

test('createTextureCached samples float data without float render targets', () => {
  const {device, created} = createDevice(['r32float', 'rg32float']);

  createTextureCached(device, {data: new Float32Array(2 * 2 * 2), width: 2, height: 2});
  createTextureCached(device, {data: new Float32Array(2 * 2), width: 2, height: 2});

  assert.deepEqual(created.map(props => props.format), ['rg32float', 'r32float']);
  for (const props of created) {
    const sampler = props.sampler as SamplerProps;
    assert.equal(sampler.minFilter, 'nearest');
    assert.equal(sampler.magFilter, 'nearest');
  }
});

test('createTextureCached rejects float data the device cannot sample', () => {
  const {device, created} = createDevice([]);

  assert.throws(
    () => createTextureCached(device, {data: new Float32Array(2 * 2 * 2), width: 2, height: 2}),
    /Float texture sampling is required/,
  );
  assert.equal(created.length, 0);
});

test('createTextureCached still rejects unsupported float band counts', () => {
  const {device, created} = createDevice(['r32float', 'rg32float']);

  assert.throws(
    () => createTextureCached(device, {data: new Float32Array(2 * 2 * 3), width: 2, height: 2}),
    /Unsupported data format/,
  );
  assert.equal(created.length, 0);
});
