// Application de test du module : `pnpm dev` à la racine du dépôt.
export default defineNuxtConfig({
  // `@nuxtjs/i18n` est installé et configuré par nuxt-domain.
  modules: ['../src/module'],
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },

  domain: {
    debug: false,
    i18n: {
      locales: ['fr', 'en'],
      defaultLocale: 'fr',
      validateInterpolation: true,
      validateLocaleStructure: 'missing',
    },
  },

  // Options avancées de @nuxtjs/i18n, fusionnées avec celles de nuxt-domain.
  i18n: {
    strategy: 'no_prefix',
  },
})
