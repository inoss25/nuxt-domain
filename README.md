# nuxt-domain

Architecture domain-driven pour Nuxt : routes, i18n et auto-imports par domaine.

## Installation

```bash
pnpm add nuxt-domain
# ou depuis le dépôt GitHub :
pnpm add github:inoss25/nuxt-domain
```

Enregistrer le module **avant** `@nuxtjs/i18n` :

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-domain',
    '@nuxtjs/i18n',
  ],
  domain: {
    domainsDir: 'app/domains',
    strict: false,
    pages: { routeDoc: { outDir: '.nuxt/domain-pages' } },
    i18n: { sharedI18nDirs: ['app/shared/i18n'] },
  },
  i18n: {
    langDir: 'locales',
    defaultLocale: 'en',
    locales: [{ code: 'en', file: 'en.json' }],
  },
})
```

### Dépendances

- **Peer** : `nuxt`, `@nuxtjs/i18n`
- **Directes** (installées avec le package) : `fast-glob`, `jiti`

## Développement du package

| Commande | Description |
|----------|-------------|
| `pnpm test` | Tests unitaires (vitest) |
| `pnpm install` | Installe les deps du package |

## Structure

```
nuxt-domain/
├── README.md
├── index.ts        # Point d'entrée Nuxt (composite pages + i18n)
├── module.ts
├── types.ts
├── shared/         # Paths, config-loader (jiti), types
├── pages/          # Routes + auto-imports + route-map
└── i18n/           # Agrégation i18n → @nuxtjs/i18n
```

## Sous-modules

- [`shared/README.md`](./shared/README.md) — utilitaires internes
- [`pages/README.md`](./pages/README.md) — génération de routes
- [`i18n/README.md`](./i18n/README.md) — compilation des locales
