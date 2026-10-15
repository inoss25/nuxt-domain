# nuxt-domain

[![Version npm](https://img.shields.io/npm/v/nuxt-domain)](https://www.npmjs.com/package/nuxt-domain)
[![Licence MIT](https://img.shields.io/github/license/inoss25/nuxt-domain)](https://github.com/inoss25/nuxt-domain/blob/main/LICENSE)

**nuxt-domain** est un module Nuxt pour organiser une application par domaines métier. Il génère les routes depuis ces domaines, auto-importe leur code et rassemble leurs traductions pour [`@nuxtjs/i18n`](https://i18n.nuxtjs.org/).

```text
app/domains/
├── home/
│   ├── domain.config.ts
│   └── pages/index.vue       → /
└── account/
    ├── domain.config.ts
    └── pages/profile.vue    → /account/profile
```

## Compatibilité

- Nuxt **3.12 ou supérieur**
- `@nuxtjs/i18n` **8 ou supérieur**
- Node.js compatible avec la version de Nuxt utilisée

Ce sont les versions minimales déclarées par le package. Le module doit être enregistré avant `@nuxtjs/i18n`.

## Installation

```bash
pnpm add nuxt-domain @nuxtjs/i18n
```

## Configuration rapide

Ajoutez le module à `nuxt.config.ts` :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-domain', '@nuxtjs/i18n'],
  domain: {
    domainsDir: 'app/domains',
    i18n: {
      sharedI18nDirs: ['app/shared/i18n'],
    },
  },
  i18n: {
    langDir: 'locales',
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', file: 'fr.json' },
      { code: 'en', file: 'en.json' },
    ],
  },
})
```

Créez un domaine avec une configuration et une page :

```text
app/domains/account/
├── domain.config.ts
└── pages/
    └── profile.vue
```

```ts
// app/domains/account/domain.config.ts
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
  enabled: true,
  prefix: 'account',
})
```

`pages/profile.vue` devient `/account/profile`. `pages/index.vue` devient `/account`. Les noms entre crochets créent des segments dynamiques : `pages/[id].vue` devient `/account/:id`.

## Créer un domaine avec la CLI

```bash
pnpm create-domain authentication
pnpm create-domain shop --i18n fr,en
```

La commande crée le dossier du domaine et, avec `--i18n`, les fichiers de traduction correspondants. Consultez le [guide de la CLI](https://github.com/inoss25/nuxt-domain/blob/main/docs/GUIDE.md#créer-un-domaine) pour toutes les options.

## Ce que le module génère

- **Routes Nuxt** depuis `pages/`, avec prise en charge des paramètres, des sous-domaines, des routes enfants et des options par domaine.
- **Auto-imports** depuis `components/`, `composables/`, `layouts/`, `stores/` et `utils/`.
- **Fichiers de locales** en fusionnant les JSON des domaines et des dossiers partagés.
- **Documentation et types de routes** générés dans `.nuxt/domain-pages` par défaut.

Les sources suivent une structure comme celle-ci :

```text
app/domains/
├── authentication/
│   ├── domain.config.ts
│   ├── pages/
│   ├── components/
│   ├── composables/
│   └── i18n/
└── inventory/
    ├── domain.config.ts
    └── domains/
        └── brands/
            ├── domain.config.ts
            └── pages/
```

## Documentation

- [Guide complet : installation, configuration et conventions](https://github.com/inoss25/nuxt-domain/blob/main/docs/GUIDE.md)
- [Routes et génération des pages](https://github.com/inoss25/nuxt-domain/blob/main/pages/README.md)
- [Agrégation des traductions](https://github.com/inoss25/nuxt-domain/blob/main/i18n/README.md)
- [Historique des versions](https://github.com/inoss25/nuxt-domain/blob/main/CHANGELOG.md)
- [Signaler un problème](https://github.com/inoss25/nuxt-domain/issues)

## Développement du module

Depuis le dépôt :

```bash
pnpm install
pnpm test
```

## Licence

[MIT](https://github.com/inoss25/nuxt-domain/blob/main/LICENSE)
