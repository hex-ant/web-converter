export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/icon', '@nuxtjs/color-mode'],
  css: ['@fontsource/sora/400.css', '@fontsource/sora/500.css', '@fontsource/sora/600.css', '~/assets/css/main.css'],
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
      title: 'withconverter.com — Private Video & Audio Converter',
      meta: [
        { name: 'application-name', content: 'withconverter.com' },
        { name: 'description', content: 'Convert and compress video or audio privately in your browser. Your files never leave your device.' },
        { property: 'og:site_name', content: 'withconverter.com' },
        { property: 'og:title', content: 'withconverter.com — Private Video & Audio Converter' },
        { property: 'og:description', content: 'Convert and compress video or audio privately in your browser. Your files never leave your device.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://withconverter.com/' },
        { name: 'theme-color', content: '#f59e0b' }
      ],
      link: [{ rel: 'canonical', href: 'https://withconverter.com/' }]
    }
  },
  nitro: {
    preset: 'static',
    prerender: { routes: ['/'] }
  }
})
