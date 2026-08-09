export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/icon', '@nuxtjs/color-mode'],
  css: [
    '@fontsource/sora/400.css',
    '@fontsource/sora/500.css',
    '@fontsource/sora/600.css',
    '@fontsource/bodoni-moda/500-italic.css',
    '~/assets/css/main.css'
  ],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },
  icon: {
    clientBundle: { scan: true, sizeLimitKb: 256 }
  },
  vite: {
    optimizeDeps: {
      // FFmpeg resolves its module worker relative to its own package. Vite's
      // dev prebundle moves that import and otherwise points it at a 404 URL.
      exclude: ['@ffmpeg/ffmpeg']
    }
  },
  app: {
    head: {
      title: 'WithConverter — Private Video & Audio Converter',
      script: [
        {
          src: '/moments.js',
          defer: true,
          'data-website-id': '39cf488a-bd25-42cb-9c44-b9ec3dc91bc9',
          'data-host-url': '/moments',
          'data-tag': 'env-production'
        }
      ],
      meta: [
        { name: 'application-name', content: 'withconverter.com' },
        { name: 'description', content: 'Convert and compress video or audio privately in your browser. Your files never leave your device.' },
        { property: 'og:site_name', content: 'withconverter.com' },
        { property: 'og:title', content: 'WithConverter — Private Video & Audio Converter' },
        { property: 'og:description', content: 'Convert and compress video or audio privately in your browser. Your files never leave your device.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://withconverter.com/' },
        { property: 'og:image', content: 'https://withconverter.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:alt', content: 'WithConverter private video and audio converter upload screen' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'WithConverter — Private Video & Audio Converter' },
        { name: 'twitter:description', content: 'Convert and compress video or audio privately in your browser. Your files never leave your device.' },
        { name: 'twitter:image', content: 'https://withconverter.com/og-image.png' },
        { name: 'theme-color', content: '#f59e0b' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'canonical', href: 'https://withconverter.com/' }
      ]
    }
  },
  nitro: {
    preset: 'static',
    prerender: { routes: ['/'] }
  }
})
