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
