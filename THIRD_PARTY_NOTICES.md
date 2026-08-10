# Third-party notices

WithConverter's original source code is licensed under the MIT License. The
application also downloads, bundles and distributes third-party software and
font files under their own licenses. The MIT License does not replace or
restrict those licenses.

## FFmpeg WebAssembly

- Packages: `@ffmpeg/core` 0.12.10, `@ffmpeg/ffmpeg` 0.12.15 and
  `@ffmpeg/util` 0.12.2
- Core license: GNU General Public License 2.0 or later
- JavaScript wrapper and utilities: MIT License
- Package source: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10
- Core and FFmpeg source: https://github.com/FFmpeg-wasm/core and
  https://github.com/FFmpeg/FFmpeg/tree/n5.1.4
- Build recipes and dependency sources:
  https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10/build
- GPL text: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html

The distributed WASM core identifies itself as FFmpeg 5.1.4. Its runtime
configuration enables GPL code and the following libraries:

```text
--enable-gpl --enable-libx264 --enable-libx265 --enable-libvpx
--enable-libmp3lame --enable-libtheora --enable-libvorbis --enable-libopus
--enable-zlib --enable-libwebp --enable-libfreetype --enable-libfribidi
--enable-libass --enable-libzimg
```

The complete configuration is printed to the browser console by FFmpeg when
the media engine starts.

## Mediabunny

- Version: 1.53.0
- License: Mozilla Public License 2.0
- Source: https://github.com/Vanilagy/mediabunny/tree/v1.53.0
- License text: https://www.mozilla.org/MPL/2.0/

Mediabunny is bundled into the browser JavaScript. Its unminified source is
available at the versioned source link above.

## Fonts

- Sora 5.3.0 — SIL Open Font License 1.1 —
  https://www.npmjs.com/package/@fontsource/sora/v/5.3.0
- Bodoni Moda 5.3.0 — SIL Open Font License 1.1 —
  https://www.npmjs.com/package/@fontsource/bodoni-moda/v/5.3.0
- Open Font License text: https://openfontlicense.org/open-font-license-official-text/

## Icons

- Fluent UI System Icons — MIT License —
  https://github.com/microsoft/fluentui-system-icons
- Simple Icons — CC0 1.0 — https://github.com/simple-icons/simple-icons

The complete dependency graph and exact resolved package versions are recorded
in `pnpm-lock.yaml`. Installed npm packages retain their respective license and
copyright files in `node_modules`.
