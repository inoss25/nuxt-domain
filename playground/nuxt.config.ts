// Application de test du module : `pnpm dev` à la racine du dépôt.
export default defineNuxtConfig({
  // `nuxt-domain` avant `@nuxtjs/i18n` : il renseigne `i18n.langDir`.
  modules: ['../src/module', '@nuxtjs/i18n'],
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },

  domain: {
    debug: false,
    i18n: {
      validateInterpolation: true,
      validateLocaleStructure: 'missing',
    },
  },

  i18n: {
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    locales: [
      { code: 'fr', file: 'fr.json' },
      { code: 'en', file: 'en.json' },
    ],
  },
})
