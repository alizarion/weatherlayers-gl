import test from 'node:test';
import assert from 'node:assert/strict';
// Other layers create worker factories at module evaluation; these tests exercise
// the particle adapter only, without starting unrelated decoding workers.
globalThis.Worker = class { postMessage() {} addEventListener() {} removeEventListener() {} terminate() {} };
const {ParticleLayer} = await import('../dist/weatherlayers-deck.min.js');
function adapter(props, device) {
  const layer = Object.create(ParticleLayer.prototype);
  Object.defineProperty(layer, 'context', {value: {device}});
  Object.defineProperty(layer, 'props', {value: props, writable: true});
  layer.state = {};
  layer.getAttributeManager = () => null;
  layer.setState = update => Object.assign(layer.state, update);
  return layer;
}
test('borrows explicit textures without creating an identity-cached copy', () => {
  const device = {createTexture() { throw Error('unexpected texture allocation'); }};
  const a = {id: 'a'}, b = {id: 'b'};
  let revision = {imageTexture: a, imageTexture2: b}, calls = 0;
  const source = {getTextures(d) { assert.equal(d, device); calls++; return revision; }};
  const props = {image: null, image2: null, imageSource: source, imageRevision: 1};
  const layer = adapter(props, device);
  layer.updateState({props, oldProps: {}, changeFlags: {}});
  assert.equal(layer.state.imageTexture, a);
  revision = {imageTexture: b, imageTexture2: a};
  const next = {...props, imageRevision: 2}; layer.props = next;
  layer.updateState({props: next, oldProps: props, changeFlags: {}});
  assert.equal(layer.state.imageTexture, b);
  assert.equal(layer.state.imageTexture2, a);
  assert.equal(calls, 2);
});
test('two simulations share handles and returning to empty images clears them', () => {
  const device = {}, a = {id: 'a'};
  const props = {image: null, image2: null, imageSource: {getTextures() {return {imageTexture: a, imageTexture2: null};}}};
  const first = adapter(props, device), second = adapter(props, device);
  for (const layer of [first, second]) layer.updateState({props, oldProps: {}, changeFlags: {}});
  assert.equal(first.state.imageTexture, second.state.imageTexture);
  const next = {...props, imageSource: null}; first.props = next;
  first.updateState({props: next, oldProps: props, changeFlags: {}});
  assert.equal(first.state.imageTexture, null);
  assert.equal(second.state.imageTexture, a);
});
