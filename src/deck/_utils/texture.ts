import type {Device, Texture, TextureFormat} from '@luma.gl/core';
import type {TextureData} from './texture-data.js';

const repeatCache = new WeakMap<Device, WeakMap<TextureData, Texture>>();
const clampCache = new WeakMap<Device, WeakMap<TextureData, Texture>>();

function getTextureFormat(device: Device, image: TextureData): TextureFormat {
  const {data, width, height} = image;
  const bandsCount = data.length / (width * height);

  if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
    if (bandsCount === 4) {
      return 'rgba8unorm';
    } else if (bandsCount === 2) {
      return 'rg8unorm'; // TODO: deck.gl 9 verify
    } else if (bandsCount === 1) {
      return 'r8unorm';
    } else {
      throw new Error('Unsupported data format');
    }
  } else if (data instanceof Float32Array) {
    if (!device.features.has('float32-renderable-webgl')) {
      throw new Error('Float textures are required');
    }

    if (bandsCount === 2) {
      return 'rg32float';
    } else if (bandsCount === 1) {
      return 'r32float';
    } else {
      throw new Error('Unsupported data format');
    }
  } else {
    throw new Error('Unsupported data format');
  }
}

export function createTextureCached(device: Device, image: TextureData, repeat: boolean = false): Texture {
  const cache = repeat ? repeatCache : clampCache;
  const cache2 = cache.get(device) ?? (() => {
    const cache2 = new WeakMap<TextureData, Texture>()
    cache.set(device, cache2);
    return cache2;
  })();

  const texture = cache2.get(image) ?? (() => {;
    const texture = device.createTexture({
      format: getTextureFormat(device, image),
      width: image.width,
      height: image.height,
      mipLevels: 1,
      sampler: {
        // custom interpolation in pixel.glsl
        magFilter: 'nearest',
        minFilter: 'nearest',
        addressModeU: repeat ? 'repeat' : 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        lodMaxClamp: 0,
      },
    });
    texture.copyImageData({data: image.data});
    cache2.set(image, texture);
    return texture;
  })();
  return texture;
}

// One fallback per live context, never a handle from another/lost device.
type EmptyTextureEntry = {texture: Texture; invalidate: () => void};
const emptyTextures = new WeakMap<Device, EmptyTextureEntry>();
const canvasEmptyTextures = new WeakMap<EventTarget, EmptyTextureEntry>();

export function createEmptyTextureCached(device: Device): Texture {
  let entry = emptyTextures.get(device);
  if (entry?.texture.destroyed) {
    entry.invalidate();
    entry = undefined;
  }
  if (!entry) {
    const canvas = device.canvasContext?.canvas;
    // Deck may replace its device while reusing the MapLibre canvas.
    if (canvas) canvasEmptyTextures.get(canvas)?.invalidate();
    const texture = device.createTexture({
      width: 1,
      height: 1,
      mipLevels: 1,
    });
    try {
      texture.copyImageData({data: new Uint8Array([0, 0, 0, 0])});
    } catch (error) {
      texture.destroy();
      throw error;
    }
    const ownedEntry: EmptyTextureEntry = {
      texture,
      invalidate: () => {
        canvas?.removeEventListener('webglcontextlost', ownedEntry.invalidate);
        if (emptyTextures.get(device) === ownedEntry) emptyTextures.delete(device);
        if (canvas && canvasEmptyTextures.get(canvas) === ownedEntry) canvasEmptyTextures.delete(canvas);
        texture.destroy();
      },
    };
    emptyTextures.set(device, ownedEntry);
    if (canvas) {
      canvasEmptyTextures.set(canvas, ownedEntry);
      canvas.addEventListener('webglcontextlost', ownedEntry.invalidate, {once: true});
    }
    entry = ownedEntry;
  }
  return entry.texture;
}
