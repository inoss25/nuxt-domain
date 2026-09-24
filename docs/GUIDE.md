# Guide complet — nuxt-domain

Documentation d’utilisation du package **nuxt-domain** : installation, commandes, structure des dossiers, configuration, i18n, packages utilisés et bonnes pratiques.

---

## Sommaire

1. [Vue d’ensemble](#vue-densemble)
2. [Packages et dépendances](#packages-et-dépendances)
3. [Installation](#installation)
4. [Commandes](#commandes)
5. [Créer un domaine](#créer-un-domaine)
6. [Structure d’un domaine](#structure-dun-domaine)
7. [Configuration Nuxt (`domain`)](#configuration-nuxt-domain)
8. [Fichier `domain.config.ts`](#fichier-domainconfigts)
9. [Routes et conventions](#routes-et-conventions)
10. [Sous-domaines](#sous-domaines)
11. [Auto-imports](#auto-imports)
12. [Internationalisation (i18n)](#internationalisation-i18n)
13. [Fichiers générés](#fichiers-générés)
14. [Mode strict et conflits](#mode-strict-et-conflits)
15. [Alias TypeScript](#alias-typescript)
16. [Dépannage](#dépannage)
17. [Références](#références)

---

## Vue d’ensemble

**nuxt-domain** est un module Nuxt composite qui installe deux sous-modules :

| Sous-module | Rôle |
|-------------|------|
| **domain-pages** | Génère les routes depuis `app/domains/**/pages/`, auto-importe composants/composables/layouts/stores/utils, produit `route-map.json` et types router. |
| **domain-i18n** | Fusionne les JSON i18n par domaine + dossiers partagés → un fichier par locale pour `@nuxtjs/i18n`. |

Principe DDD : **un dossier = un domaine métier** (`authentication`, `dashboard`, `checkout`, …).

---

## Packages et dépendances

### Dans votre application (peers — à installer vous-même)

| Package | Rôle |
|---------|------|
| **`nuxt`** (≥ 3.12, testé sur 4.x) | Héberge le module, hooks `extendPages`, alias Nuxt, build. |
| **`@nuxtjs/i18n`** (≥ 8, testé sur 10.x) | Charge les locales compilées ; **obligatoire** si vous utilisez la partie i18n du module. |

### Fournis par **nuxt-domain** (dependencies npm)

| Package | Version | Usage interne |
|---------|---------|----------------|
| **[fast-glob](https://github.com/mrmlnc/fast-glob)** | ^3.3 | Parcourt `domain.config.ts`, pages `.vue`, dossiers d’auto-import, fichiers `i18n/**/*.json`. |
| **[jiti](https://github.com/unjs/jiti)** | ^2.7 | Charge dynamiquement chaque `domain.config.ts` (TypeScript) au build/dev, avec alias `#domain-pages` / `#domain-shared`. |

### APIs Nuxt (pas de package npm supplémentaire)

- **`nuxt/kit`** : `defineNuxtModule`, `installModule`, `extendPages`, `addComponentsDir`, `addImportsDir`, …
- **`@nuxt/schema`** : types `NuxtPage`, etc.
- **Node.js** : `node:fs`, `node:path`, `node:url` pour écriture des locales et documentation de routes.

### Outils de développement du package (uniquement si vous contribuez au repo)

- **vitest** — tests unitaires
- **typescript** — typage

---

## Installation

```bash
pnpm add nuxt-domain @nuxtjs/i18n
# ou depuis GitHub :
pnpm add github:inoss25/nuxt-domain @nuxtjs/i18n
```

**`nuxt.config.ts`** — le module **nuxt-domain** doit être enregistré **avant** `@nuxtjs/i18n` :

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-domain',
    '@nuxtjs/i18n',
    // … autres modules
  ],

  domain: {
    domainsDir: 'app/domains',
    strict: false,
    debug: process.env.NODE_ENV === 'development',
    pages: {
      routeDoc: {
        enabled: true,
        outDir: '.nuxt/domain-pages',
      },
    },
    i18n: {
      sharedI18nDirs: ['app/shared/i18n'],
      outputDir: 'i18n/locales',
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

> Les options partagées (`domainsDir`, `strict`, `debug`, `subDomainsDirName`) se configurent une seule fois sous la clé **`domain`**. Les sous-clés **`pages`** et **`i18n`** surchargent le comportement de chaque sous-module.

---

## Commandes

### Dans votre projet Nuxt (après installation du package)

| Commande | Description |
|----------|-------------|
| `pnpm create-domain <nom>` | Crée l’arborescence d’un nouveau domaine (voir [Créer un domaine](#créer-un-domaine)). |
| `nuxt dev` / `pnpm dev` | Régénère routes + locales ; watch des `domain.config.ts` et JSON i18n en dev. |
| `nuxt build` | Build avec agrégation i18n et routes finales. |

Variables d’environnement utiles pour la CLI :

| Variable | Effet |
|----------|--------|
| `DOMAINS_DIR` | Racine des domaines si vous n’utilisez pas `--domains-dir` (défaut : `app/domains`). |

### Dans le dépôt **nuxt-domain** (contributeurs)

| Commande | Description |
|----------|-------------|
| `pnpm install` | Installe les dépendances. |
| `pnpm test` | Lance vitest (34+ tests). |
| `pnpm test:watch` | Mode watch. |

---

## Créer un domaine

### Option A — CLI (recommandé)

À la **racine de votre app Nuxt** :

```bash
pnpm create-domain authentication
```

Avec fichiers i18n `fr` et `en` :

```bash
pnpm create-domain shop --i18n fr,en
```

Autre dossier racine :

```bash
pnpm create-domain billing --domains-dir app/domains --prefix billing
```

Sans page par défaut :

```bash
pnpm create-domain reports --no-pages
```

Équivalent sans script npm :

```bash
pnpm exec create-domain my-domain --i18n fr,en
```

### Option B — Manuellement

```bash
mkdir -p app/domains/mon-domaine/pages
mkdir -p app/domains/mon-domaine/{components,composables,i18n}
```

Créez `app/domains/mon-domaine/domain.config.ts` :

```ts
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
  enabled: true,
  prefix: 'mon-domaine',
})
```

Créez `app/domains/mon-domaine/pages/index.vue` — route **`/mon-domaine`** (ou selon `prefix` / `noPrefix`).

---

## Structure d’un domaine

Arborescence recommandée sous **`app/domains/`** (ou la valeur de `domain.domainsDir`) :

```
app/domains/
├── authentication/                 # Domaine racine
│   ├── domain.config.ts            # Config obligatoire pour activer le domaine
│   ├── pages/                      # → routes Nuxt (obligatoire pour des URLs)
│   │   ├── index.vue               # /authentication (ou / si home + noPrefix)
│   │   ├── login.vue               # /authentication/login
│   │   └── [id]/
│   │       └── children/           # routes enfants imbriquées
│   │           └── edit.vue
│   ├── components/                 # Auto-import Vue
│   ├── composables/                # Auto-import composables
│   ├── layouts/                    # Auto-import layouts (prefix vide)
│   ├── stores/                     # Auto-import (Pinia, etc.)
│   ├── utils/                      # Auto-import fonctions
│   └── i18n/                       # Traductions du domaine
│       ├── fr.json
│       └── en.json
│
├── inventory/                      # Domaine parent avec sous-domaines
│   ├── domain.config.ts            # hasSubDomains: true
│   └── domains/                    # Dossier marqueur (subDomainsDirName)
│       └── brands/
│           ├── domain.config.ts
│           ├── pages/
│           │   └── list.vue
│           └── i18n/
│               └── fr.json
│
app/shared/i18n/                    # Textes transverses (config: sharedI18nDirs)
├── fr.json
└── en.json
```

### Dossiers ignorés

- Tout chemin contenant un segment **`_nom`** (ex. `_draft`, `components/_internal`) est ignoré pour routes et configs.

---

## Configuration Nuxt (`domain`)

Interface principale : `DomainModuleOptions` (exportée depuis le package).

| Option | Défaut | Description |
|--------|--------|-------------|
| `domainsDir` | `'app/domains'` | Racine de tous les domaines. |
| `subDomainsDirName` | `'domains'` | Nom du dossier marqueur des sous-domaines. |
| `strict` | `false` | Si `true`, le build échoue sur conflits de routes **ou** clés i18n. |
| `debug` | `false` | Logs détaillés `[domain-pages]` / `[domain-i18n]`. |
| `pages` | `{}` | Options du sous-module pages (voir [pages/README.md](../pages/README.md)). |
| `i18n` | `{}` | Options i18n (voir [i18n/README.md](../i18n/README.md)). |

Exemples d’options **`domain.pages`** :

| Option | Défaut | Description |
|--------|--------|-------------|
| `childrenDirName` | `'children'` | Dossier pour routes enfants. |
| `routeDoc` | `{ enabled: true, outDir: '.nuxt/domain-pages' }` | Génère `route.md`, `route-map.json`, `typed-router.d.ts`. |
| `watchSourcesInDev` | `true` | Régénère les routes quand pages ou config changent. |

Exemples d’options **`domain.i18n`** :

| Option | Défaut | Description |
|--------|--------|-------------|
| `sharedI18nDirs` | `['app/shared/i18n']` | JSON fusionnés sous la clé `global` (namespace configurable). |
| `sharedMessagesNamespace` | `'global'` | Préfixe des messages partagés dans le JSON compilé. |
| `outputDir` | `'i18n/locales'` | Fichiers `fr.json`, `en.json`, … générés pour @nuxtjs/i18n. |
| `domainSegmentKeyFormat` | `'snake_case'` | Forme des clés dérivées des noms de dossiers. |
| `watchSourcesInDev` | `true` | Regénère les locales en dev. |

---

## Fichier `domain.config.ts`

Import (alias actif une fois le module Nuxt chargé) :

```ts
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
  enabled: true,
  prefix: 'auth',
  noPrefix: false,
  home: false,
  hasSubDomains: false,
  prefixSubDomains: true,
  middleware: 'auth',
  meta: { layout: 'default' },
  routes: {
    login: {
      path: '/signin',
      name: 'signin',
      middleware: ['guest'],
      meta: { title: 'Connexion' },
    },
  },
})
```

| Option | Description |
|--------|-------------|
| `enabled` | `false` = aucune route ni i18n de ce domaine. |
| `prefix` | Segment URL (défaut : nom du dossier domaine). |
| `noPrefix` | Routes sans préfixe de domaine. |
| `home` | `index.vue` du domaine peut devenir `/` (un seul domaine `home: true` recommandé). |
| `hasSubDomains` | Autorise `domains/<sous-domaine>/`. |
| `prefixSubDomains` | Inclure le segment du sous-domaine dans l’URL. |
| `middleware` / `meta` | Appliqués à toutes les pages du domaine. |
| `routes` | Overrides par fichier page (clé = nom de fichier sans `.vue`). |

Chargement : **jiti** lit le TypeScript à la volée ; erreurs affichées dans la console avec le chemin du fichier.

---

## Routes et conventions

| Fichier | Route type |
|---------|------------|
| `pages/index.vue` | `/prefix` ou `/` si home |
| `pages/settings.vue` | `/prefix/settings` |
| `pages/[id].vue` | `/prefix/:id` |
| `pages/[...slug].vue` | `/prefix/:slug*` |
| `pages/foo/children/bar.vue` | Route enfant imbriquée sous `foo` |

Nom de route : dérivé du chemin (ex. `dashboard.settings`, `projects.id`).

Page d’accueil site :

```ts
export default defineDomainConfig({
  home: true,
  noPrefix: true,
})
```

---

## Sous-domaines

1. Parent : `hasSubDomains: true` dans `domain.config.ts`.
2. Enfant : `app/domains/inventory/domains/brands/` avec son propre `domain.config.ts` et `pages/`.

Clé i18n compilée exemple : `inventory.brands` (selon `domainSegmentKeyFormat`).

---

## Auto-imports

Scan **fast-glob** des dossiers suivants sous chaque domaine :

| Dossier | Mécanisme Nuxt |
|---------|----------------|
| `components/` | `addComponentsDir` |
| `layouts/` | `addComponentsDir` (prefix vide) |
| `composables/`, `stores/`, `utils/` | `addImportsDir` |

Les fichiers sous `pages/` ne sont **pas** auto-importés comme composants.

---

## Internationalisation (i18n)

### Flux

1. Sources : `app/domains/<domaine>/i18n/<locale>.json` et `sharedI18nDirs`.
2. Build/dev : fusion → `i18n/locales/fr.json`, `en.json`, …
3. `@nuxtjs/i18n` charge ces fichiers via `langDir: 'locales'`.

### Clés dans le JSON compilé

```json
{
  "global": {
    "appName": "Mon app"
  },
  "authentication": {
    "login": { "title": "Connexion" }
  },
  "shop": {
    "checkout": { "title": "Paiement" }
  }
}
```

- Textes partagés : `t('global.appName')`
- Domaine `authentication` : `t('authentication.login.title')`
- Sous-domaine `shop/checkout` : `t('shop.checkout.title')`

### Échappements Vue I18n dans le JSON

Caractères `@`, `{`, `|`, etc. : utiliser les séquences documentées par Vue I18n, ex. `"you\\@example.com"` dans le fichier source.

### Ordre de fusion

1. Shared → namespace `global` (ou `sharedMessagesNamespace`).
2. Domaines par locale ; en cas de doublon au même niveau, **dernier fichier gagnant** (tri par chemin).

---

## Fichiers générés

| Fichier | Emplacement | Contenu |
|---------|-------------|---------|
| `route.md` | `.nuxt/domain-pages/` (configurable) | Table Markdown des routes |
| `route-map.json` | idem | Liste JSON path/name/file |
| `typed-router.d.ts` | idem | Union `DomainPagesRouteName` |
| `fr.json`, `en.json`, … | `domain.i18n.outputDir` | Messages pour @nuxtjs/i18n |
| `typed-i18n.d.ts` | dans `outputDir` | Clés i18n typées |

Ne pas éditer manuellement les JSON dans `outputDir` : modifier les sources domaine/shared puis relancer dev/build.

---

## Mode strict et conflits

```ts
domain: {
  strict: true,
}
```

- **Routes** : deux pages ne peuvent pas cibler le même chemin.
- **i18n** : deux sources ne peuvent pas définir la même clé feuille au même niveau.

Sans strict : avertissements `⚠️` en console ; dernière source gagne.

---

## Alias TypeScript

Enregistrés au runtime par le sous-module pages :

| Alias | Pointe vers |
|-------|-------------|
| `#domain-pages` | `pages/runtime` du package (helper `defineDomainConfig`, etc.) |
| `#domain-shared` | `shared/runtime` |

Utilisables dans **`domain.config.ts`** de votre app. Pour l’IDE, ajoutez si besoin dans `nuxt.config` ou tsconfig généré par Nuxt.

---

## Dépannage

| Problème | Piste |
|----------|--------|
| Aucune route | `domain.config.ts` manquant, `enabled: false`, ou pas de `pages/*.vue`. |
| Erreur `domain.config.ts` | Syntaxe TS, import `#domain-pages` (module non enregistré). |
| Préfixe inattendu | Vérifier `prefix`, `noPrefix`. |
| Clé i18n introuvable | Préfixe `global.` vs nom de domaine ; relancer dev après ajout JSON. |
| `@nuxtjs/i18n` ne voit pas les fichiers | `nuxt-domain` **avant** i18n ; `langDir: 'locales'` ; fichiers dans `outputDir`. |
| Conflit `/` | Un seul domaine avec `home: true`. |

---

## Références

- [README principal](../README.md)
- [Pages — détails routes](../pages/README.md)
- [i18n — fusion locales](../i18n/README.md)
- [Shared — utilitaires internes](../shared/README.md)
- Dépôt : https://github.com/inoss25/nuxt-domain
