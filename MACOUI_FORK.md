# Macoui fork

This public fork is based on the upstream `weatherlayers-gl` tag `2026.5.2`
(commit `55ba7e9c6854d11640b1497425d49810008bda1d`).

## Modification

Particle zoom-history displacement is disabled on deck.gl globe viewports while the
existing Mercator behavior is preserved. This prevents globe particle positions from
being amplified during zoom transitions when WeatherLayers is integrated with
MapLibre's `vertical-perspective` projection.

The fork remains source-only. GitHub releases attach the generated npm package so
consumers pinned to a release asset do not rebuild WeatherLayers during installation.
Each release package is built from the tagged source with `npm run build` and includes
the MPL license, this notice, minified exports, and TypeScript declarations.

## License

The upstream source and this modification are available under the Mozilla Public
License 2.0. See [`LICENSE.md`](LICENSE.md). The alternative upstream commercial
terms remain in [`LICENSE_TERMS_OF_USE.md`](LICENSE_TERMS_OF_USE.md).

## Owned particle textures (macoui.2)

`ParticleLayer` accepts an optional `imageSource` exposing
`getTextures(device) -> {imageTexture, imageTexture2}`, and `imageRevision` to
notify Deck when content changes without changing the source object. Uploads must
consume their CPU inputs synchronously before `getTextures` returns. The source
retains ownership of the GPU handles: it must keep them valid while used by the
particle simulations and explicitly release them when no longer needed. Multiple
simulations may share the same source. The layer does not create identity-cache
entries for source-owned textures and never destroys borrowed handles. Existing
`image` / `image2` consumers retain their previous behavior.

Validation: `npm test`, then `npm run build` and
`node --test tests/particle-texture-source.test.mjs`.
