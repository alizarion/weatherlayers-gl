import assert from 'node:assert';
import test from 'node:test';

import type {Viewport} from '@deck.gl/core';
import {getViewportZoomChangeFactor} from './viewport.js';

function createGlobeViewport(scale: number): Viewport {
  return {
    resolution: 1,
    scale,
  } as Viewport;
}

function createMercatorViewport(zoom: number): Viewport {
  return {
    zoom,
  } as Viewport;
}

test('getViewportZoomChangeFactor disables zoom-history displacement on globe viewports', () => {
  const viewport = createGlobeViewport(2 ** 12);

  assert.equal(getViewportZoomChangeFactor(viewport, 10), 0);
  assert.equal(getViewportZoomChangeFactor(viewport, undefined), 0);
});

test('getViewportZoomChangeFactor preserves zoom-history displacement on Mercator viewports', () => {
  const viewport = createMercatorViewport(12);

  assert.equal(getViewportZoomChangeFactor(viewport, 10), 2 ** -8);
  assert.equal(getViewportZoomChangeFactor(viewport, undefined), 1);
});
