# withconvert

A private, browser-only media converter and compressor built with Nuxt and FFmpeg WebAssembly.

## Highlights

- Video-to-video, video-to-audio, and audio-to-video workflows
- Plain-language presets plus expandable codec controls
- Color or uploaded cover art for audio-to-video, with crop and output-shape controls
- Entirely local processing: media files are never uploaded
- System-aware light/dark theme, local Sora fonts, and bundled Fluent icons

```bash
pnpm install
pnpm dev
pnpm generate
```

The generated static site is written to `.output/public` (and linked as `dist`). To test the production build, run `pnpm preview`. A local HTTP server is required because browsers do not allow the FFmpeg worker and WASM module to run from a `file://` URL.

## Structure

- `composables/useFfmpeg.ts` owns engine loading, command construction, progress, and cleanup.
- `utils/presets.ts` contains user-facing outcomes and the technical values behind them.
- `types/media.ts` defines the boundary between the UI and processing layer.
- `pages/index.vue` coordinates the four-step flow.
