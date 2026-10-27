# nuxt-domain

[![npm version](https://img.shields.io/npm/v/nuxt-domain)](https://www.npmjs.com/package/nuxt-domain)
[![MIT License](https://img.shields.io/github/license/inoss25/nuxt-domain)](https://github.com/inoss25/nuxt-domain/blob/main/LICENSE)

**English** · [Français](https://github.com/inoss25/nuxt-domain/blob/main/README.fr.md)

**nuxt-domain** is a Nuxt module for organizing an application by business domain. It generates routes from those domains, auto-imports their code and gathers their translations for [`@nuxtjs/i18n`](https://i18n.nuxtjs.org/).

```text
app/domains/
├── home/
│   ├── domain.config.ts
│   └── pages/index.vue       → /
└── account/
    ├── domain.config.ts
    └── pages/profile.vue    → /account/profile
```

## Compatibility

- Nuxt **3.12 or later**
- `@nuxtjs/i18n` **8 or later**
- A Node.js version supported by your Nuxt version

These are the minimum versions declared by the package. The module must be registered before `@nuxtjs/i18n`.

## Installation

```bash
pnpm add nuxt-domain @nuxtjs/i18n
```

## Quick setup

Add the module to `nuxt.config.ts`:

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
    defaultLocale: 'en',
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'fr', file: 'fr.json' },
    ],
  },
})
```

Create a domain with a config and a page:

```text
app/domains/account/
├── domain.config.ts
├── layouts/
│   └── default.vue
└── pages/
    └── profile.vue
```

```ts
// app/domains/account/domain.config.ts
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
  enabled: true,
  prefix: 'account',
  layout: 'default',
})
```

`pages/profile.vue` becomes `/account/profile` and `pages/index.vue` becomes `/account`. Bracketed names create dynamic segments: `pages/[id].vue` becomes `/account/:id`.

## All `domain` options

The `domain` key holds the whole `nuxt-domain` configuration. Shared options live at this level so routes and translations use the same folders and diagnostics.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-domain', '@nuxtjs/i18n'],
  domain: {
    // Where the module looks for domain folders.
    domainsDir: 'app/domains',

    // Name of the folder that holds child domains.
    subDomainsDirName: 'domains',

    // In development, log scan and generation details.
    debug: process.env.NODE_ENV === 'development',

    // Fail the build on conflicts or validation errors.
    strict: false,

    // Optional validation of domain folder names.
    naming: {
      domainNameFormat: 'kebab-case',
    },

    // Routes and auto-imports.
    pages: {
      childrenDirName: 'children',
      watchSourcesInDev: true,
      watchDebounceMs: 250,
      routeDoc: {
        enabled: true,
        outDir: '.nuxt/domain-pages',
        fileName: 'route.md',
      },
    },

    // Translation files.
    i18n: {
      sharedI18nDirs: ['app/shared/i18n'],
      sharedMessagesNamespace: 'global',
      outputDir: 'i18n/locales',
      domainKeyFormat: 'snake_case',
      detectDuplicates: true,
      validateInterpolation: false,
      validateLocaleStructure: false,
      watchSourcesInDev: true,
      watchDebounceMs: 250,
    },
  },
})
```

### Shared options

| Option | Default | Why and when to change it |
|---|---|---|
| `domainsDir` | `'app/domains'` | Root of all domains. Change it if your app keeps its code elsewhere; routes and i18n both look in the same place. |
| `subDomainsDirName` | `'domains'` | Folder holding child domains. Change it only if you use another tree convention. |
| `strict` | `false` | Turns conflicts and validation issues into build errors. Use `true` in CI to avoid shipping ambiguous routes or translations. |
| `debug` | `false` | Logs scan and generation details. Enable it to understand why a domain, route or i18n file is skipped. |
| `naming.domainNameFormat` | no validation | Checks domain folder names (`snake_case`, `camelCase`, `PascalCase`, `kebab-case` or `preserve`). Useful to keep a team convention consistent. |

### `pages`: routes and auto-imports

| Option | Default | Why and when to change it |
|---|---|---|
| `childrenDirName` | `'children'` | Folder used to declare nested child routes. |
| `watchSourcesInDev` | `true` | Regenerates routes when sources change during `nuxt dev`. |
| `watchPagesInDev` | `true` | Picks up added and removed pages in development. |
| `watchDebounceMs` | `250` | Groups close changes before regenerating. Increase it when many files change at once. |
| `routeDoc` | enabled in `.nuxt/domain-pages` | Writes `route.md`, `route-map.json` and `typed-router.d.ts` to inspect routes and type their usage. Use `false` to disable it, or set `enabled`, `outDir` and `fileName`. |
| `watchDomainConfigInDev` | — (deprecated) | Former config-watching option. Prefer `watchSourcesInDev`. |

Watch options only apply in development; they never affect production routes. When a `domain.config.ts` imports another file, editing that file also reloads the config.

### `i18n`: translation files

Without `@nuxtjs/i18n` in the project, pass `i18n: false` to disable translation generation entirely.

| Option | Default | Why and when to change it |
|---|---|---|
| `sharedI18nDirs` | `['app/shared/i18n']` | Folders for translations used by several domains (navigation, app name, common messages). |
| `sharedMessagesNamespace` | `'global'` | Parent key of shared translations in the compiled JSON. |
| `outputDir` | `'i18n/locales'` | Where the JSON files for `@nuxtjs/i18n` are generated. It must match the i18n `langDir`; with `langDir: 'locales'` the default works. |
| `domainKeyFormat` | `'snake_case'` | Formats domain segments in compiled keys. For instance, a `user-profile` folder becomes the `user_profile` key. |
| `domainSegmentKeyFormat` | `'snake_case'` (deprecated) | Former name of `domainKeyFormat`. |
| `keyFormat` | no validation | Checks the key convention in source JSON files. |
| `detectDuplicates` | `true` | Reports translation keys defined several times and domain collisions. |
| `validateInterpolation` | `false` | Compares `{name}` variables across locales. |
| `validateLocaleStructure` | `false` | Compares keys across locales: `'missing'` reports missing translations, `'all'` also reports extra keys. |
| `referenceLocale` | Nuxt i18n default locale | Reference locale for structure and variable checks, e.g. `'en'`. |
| `watchSourcesInDev` | `true` | Regenerates locale files when an i18n JSON changes during `nuxt dev`. |
| `watchDebounceMs` | `250` | Groups JSON changes before merging again. |

`strict` and `debug` are set at the `domain` level and apply to both routes and translations. `domainsDir` and `subDomainsDirName` are shared too, so both parts of the module always walk the same tree.

## Create a domain with the CLI

```bash
pnpm create-domain authentication
pnpm create-domain shop --i18n fr,en
pnpm create-domain billing --only pages,composables,utils
```

`--only` accepts `pages`, `components`, `composables`, `layouts`, `stores`, `utils` and `public`, comma-separated. Without it, all of these folders are created. `domain.config.ts` is always created; `--i18n fr,en` adds translation files. Run `pnpm create-domain --help` for every option.

## What the module generates

- **Nuxt routes** from `pages/`, with params, sub-domains, child routes and per-domain options.
- **Domain layouts** from `layouts/`, and auto-imports from `components/`, `composables/`, `stores/` and `utils/`.
- **Per-domain static assets** from `public/`, served under a URL prefixed by the domain path.
- **Locale files** merged from domain and shared JSON files.
- **Route docs and types**, generated in `.nuxt/domain-pages` by default.

### Domain structure

Each domain groups the config and files of one feature. Every folder is optional:

```text
app/domains/account/
├── domain.config.ts
├── pages/
│   ├── index.vue
│   └── profile.vue
├── components/
│   └── AccountForm.vue
├── composables/
│   └── useAccount.ts
├── layouts/
│   ├── default.vue
│   └── auth.vue
├── stores/
│   └── account.ts
├── utils/
│   └── validation.ts
├── i18n/
│   ├── en.json
│   └── fr.json
├── assets/
│   ├── logo.svg
│   └── account.css
├── public/
│   └── logo.svg
└── domains/
    └── settings/
        ├── domain.config.ts
        └── pages/
            └── index.vue
```

| Folder / file | Role |
|---|---|
| `domain.config.ts` | Configures the domain: enabled flag, URL prefix, middleware, meta, sub-domains and default layout. |
| `pages/` | Vue pages turned into Nuxt routes. `pages/profile.vue` becomes `/account/profile`; `[id].vue` files create dynamic segments. |
| `components/` | Domain components, registered for Nuxt auto-import. |
| `composables/` | Auto-imported composables, e.g. `useAccount()`. |
| `layouts/` | Domain layouts (see below). |
| `stores/` | Auto-imported stores, e.g. Pinia stores. |
| `utils/` | Auto-imported helpers with no Vue dependency. |
| `i18n/` | Domain translation JSON files, merged with shared translations. |
| `assets/` | Images, fonts and styles imported from Vue or CSS files so Vite processes them. Not auto-imported nor created by the CLI. |
| `public/` | Static files served as-is under `/domains/<domain-path>/`. For instance `account/public/logo.svg` is available at `/domains/account/logo.svg`. |
| `domains/` | Nested sub-domains. The parent must allow them with `hasSubDomains: true`. |

You can add your own folders, such as `services/` or `repositories/`. They stay in the domain, but the module neither scans nor auto-imports them.

### Domain layouts

`.vue` files in `layouts/` are registered as real Nuxt layouts with `addLayout`. Their name is prefixed by the domain to avoid collisions: `app/domains/account/layouts/default.vue` becomes `account-default`, and `layouts/auth.vue` becomes `account-auth`.

In `domain.config.ts`, `layout: 'default'` applies `account-default` to the domain pages. The value is the file path inside `layouts/` without extension: `layout: 'auth/login'` selects `layouts/auth/login.vue`. Sub-domains inherit the setting and may override it. A page can pick another layout with `definePageMeta({ layout: 'account-auth' })` or disable it with `definePageMeta({ layout: false })`.

As in standard Nuxt, `app.vue` must contain `<NuxtLayout><NuxtPage /></NuxtLayout>`. Without a `layout` option, Nuxt keeps its usual behavior and uses the global `default` layout if it exists.

## Documentation

The detailed guides are written in French:

- [Full guide: installation, configuration and conventions](https://github.com/inoss25/nuxt-domain/blob/main/docs/GUIDE.md)
- [Routes and page generation](https://github.com/inoss25/nuxt-domain/blob/main/docs/pages.md)
- [Translation merging](https://github.com/inoss25/nuxt-domain/blob/main/docs/i18n.md)
- [Changelog](https://github.com/inoss25/nuxt-domain/blob/main/CHANGELOG.md)
- [Report an issue](https://github.com/inoss25/nuxt-domain/issues)

## Development

```bash
pnpm install
pnpm test        # unit tests
pnpm typecheck   # TypeScript check of the module
pnpm build       # builds dist/ with @nuxt/module-builder
pnpm dev         # Nuxt playground wired to src/
```

Sources live in `src/`: `module.ts` (entry point), `pages-module.ts`, `i18n-module.ts` and `runtime/` (code exposed through the `#domain-pages` and `#domain-shared` aliases). Tests live in `test/`.

`pnpm benchmark` measures the main generation steps (config loading with cold and warm cache, folder scan, route generation and locale merging) on a temporary project of 50 domains, 500 pages and 100 i18n files. Tune it with `DOMAIN_BENCH_DOMAINS`, `DOMAIN_BENCH_PAGES`, `DOMAIN_BENCH_LOCALES` and `DOMAIN_BENCH_ITERATIONS`.

## License

[MIT](https://github.com/inoss25/nuxt-domain/blob/main/LICENSE)
