# withconverter.com

[withconverter.com](https://withconverter.com/) is a private, browser-only media converter and compressor built with Nuxt, FFmpeg WebAssembly, and Mediabunny.

## Highlights

- Video-to-video, video-to-audio, and audio-to-video workflows
- Plain-language presets plus expandable codec controls
- Color, uploaded cover art, or an animated waveform for audio-to-video, with crop and output-shape controls
- Entirely local processing: media files are never uploaded
- System-aware light/dark theme, local Sora fonts, and bundled Fluent icons

## Requirements

- Node.js 22
- pnpm 10.12.1

The app requires a modern browser with WebAssembly, Web Workers, and Blob URL support. Creating an animated waveform video additionally requires WebCodecs (including `VideoEncoder`), Web Audio, and Canvas APIs. Codec availability varies by browser, so a current Chromium-based browser is recommended for the full feature set.

```bash
pnpm install
pnpm dev
pnpm generate
```

The generated static site is written to `.output/public`. To test the production build, run `pnpm preview`. A local HTTP server is required because browsers do not allow the FFmpeg worker and WASM module to run from a `file://` URL.

## Structure

- `composables/useFfmpeg.ts` owns engine loading, command construction, progress, and cleanup.
- `utils/presets.ts` contains user-facing outcomes and the technical values behind them.
- `types/media.ts` defines the boundary between the UI and processing layer.
- `pages/index.vue` coordinates the four-step flow.

## License

WithConverter is released under the [MIT License](LICENSE). Its bundled dependencies and media engines retain their own licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md) for details and source links.
