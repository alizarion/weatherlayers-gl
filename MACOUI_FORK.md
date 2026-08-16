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
