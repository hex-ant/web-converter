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
      title: 'Amber — Local media converter',
      meta: [
        { name: 'description', content: 'Convert and compress video or audio privately in your browser.' },
        { name: 'theme-color', content: '#f59e0b' }
      ]
    }
  },
  nitro: {
    preset: 'static',
    prerender: { routes: ['/'] }
  }
})
