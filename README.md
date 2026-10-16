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

`pages/profile.vue` devient `/account/profile`. `pages/index.vue` devient `/account`. Les noms entre crochets créent des segments dynamiques : `pages/[id].vue` devient `/account/:id`.

## Toutes les options de `domain`

La clé `domain` regroupe la configuration de `nuxt-domain`. Les options communes sont définies à ce niveau pour que les routes et les traductions utilisent les mêmes dossiers et diagnostics.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-domain', '@nuxtjs/i18n'],
  domain: {
    // Où le module cherche les dossiers métier.
    domainsDir: 'app/domains',

    // Nom du dossier qui contient les domaines enfants.
    subDomainsDirName: 'domains',

    // En développement, affiche les détails du scan et de la génération.
    debug: process.env.NODE_ENV === 'development',

    // Fait échouer le build en cas de conflits ou d'erreurs de validation.
    strict: false,

    // Validation facultative des noms des dossiers métier.
    naming: {
      domainNameFormat: 'kebab-case',
    },

    // Réglages propres aux routes et aux auto-imports.
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

    // Réglages propres aux fichiers de traduction.
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

### Options communes

| Option | Défaut | Pourquoi et quand la modifier |
|---|---|---|
| `domainsDir` | `'app/domains'` | Racine commune aux domaines. Change-la si ton application range son code ailleurs; les routes et l’i18n chercheront au même endroit. |
| `subDomainsDirName` | `'domains'` | Nom du dossier qui contient les domaines enfants. Change-le seulement si tu as choisi une autre convention d’arborescence. |
| `strict` | `false` | Active les erreurs bloquantes sur les conflits et validations. Utilise `true` en CI pour éviter de publier un build avec des routes ou traductions ambiguës. |
| `debug` | `false` | Affiche les détails du parcours et de la génération dans la console. Active-le pour comprendre pourquoi un domaine, une route ou un fichier i18n est ignoré. |
| `naming.domainNameFormat` | aucune validation | Vérifie le format des noms de dossiers de domaine (`snake_case`, `camelCase`, `PascalCase`, `kebab-case` ou `preserve`). Utile pour garder une convention uniforme dans une équipe. |

### `pages` : routes et auto-imports

| Option | Défaut | Pourquoi et quand la modifier |
|---|---|---|
| `childrenDirName` | `'children'` | Dossier utilisé pour déclarer les routes enfants imbriquées. Change-le si ton équipe utilise un autre nom de dossier. |
| `watchSourcesInDev` | `true` | Régénère les routes quand les sources changent pendant `nuxt dev`. Désactive-le si tu veux éviter ce travail pendant le développement. |
| `watchPagesInDev` | `true` | Prend en compte les ajouts et modifications de pages en développement. Désactive-le si les pages sont fixes pendant ta session. |
| `watchDebounceMs` | `250` | Regroupe les changements rapprochés avant de régénérer. Augmente la valeur si un grand nombre de fichiers change en même temps. |
| `routeDoc` | activée dans `.nuxt/domain-pages` | Produit `route.md`, `route-map.json` et `typed-router.d.ts` pour inspecter les routes et typer leur usage. Utilise `false` pour la désactiver, ou renseigne `enabled`, `outDir` et `fileName` pour la personnaliser. |
| `noPrefixDomains` | — (déconseillée) | Ancienne liste de domaines sans préfixe. Préfère `noPrefix: true` dans le `domain.config.ts` du domaine concerné, afin que le réglage reste avec le domaine. |
| `watchDomainConfigInDev` | — (dépréciée) | Ancienne option de surveillance des configurations. Préfère `watchSourcesInDev`, qui regroupe la surveillance des sources. |

Les options de surveillance servent uniquement en développement; elles n’affectent pas les routes de production.

### `i18n` : fichiers de traduction

| Option | Défaut | Pourquoi et quand la modifier |
|---|---|---|
| `sharedI18nDirs` | `['app/shared/i18n']` | Dossiers pour les traductions utilisées par plusieurs domaines (navigation, nom de l’application, messages communs). Les placer ici évite de les dupliquer dans chaque domaine. |
| `sharedMessagesNamespace` | `'global'` | Clé parente des traductions partagées dans le JSON compilé. Garde-la si tes appels utilisent `global.*`; change-la si tu veux un autre namespace. |
| `outputDir` | `'i18n/locales'` | Emplacement des JSON générés pour `@nuxtjs/i18n`. Il doit correspondre au `langDir` configuré pour i18n; avec `langDir: 'locales'`, la valeur par défaut convient. |
| `domainKeyFormat` | `'snake_case'` (hérité de l’option legacy) | Formate les segments de domaine dans les clés des traductions compilées. Par exemple, un dossier `user-profile` devient la clé `user_profile`. |
| `domainSegmentKeyFormat` | `'snake_case'` (dépréciée) | Ancien réglage du format des clés de domaine. Utilise `domainKeyFormat` pour les nouveaux projets. |
| `keyFormat` | aucune validation | Vérifie la convention des clés dans les JSON sources. Active-le pour repérer les écarts de style avant qu’ils se multiplient. |
| `detectDuplicates` | `true` | Signale les clés de traduction définies plusieurs fois ou les collisions de domaines. Désactive-le uniquement si ces doublons sont intentionnels. |
| `validateInterpolation` | `false` | Compare les variables `{name}` entre les langues. Active-le pour repérer une traduction qui oublierait une variable attendue. |
| `validateLocaleStructure` | `false` | Compare les clés entre les locales. Choisis `'missing'` pour signaler les traductions absentes, ou `'all'` pour signaler aussi les clés supplémentaires. |
| `referenceLocale` | locale par défaut de Nuxt i18n | Choisit la langue de référence pour comparer structure et variables, par exemple `'fr'`. À définir si la langue par défaut n’est pas celle à utiliser comme référence. |
| `watchSourcesInDev` | `true` | Regénère les fichiers de locales quand un JSON i18n change pendant `nuxt dev`. Désactive-le si tu ne modifies pas les traductions en développement. |
| `watchDebounceMs` | `250` | Regroupe plusieurs changements de JSON avant de relancer la fusion. Augmente-le si un grand catalogue change fréquemment. |

`strict` et `debug` se règlent au niveau `domain` et s’appliquent aux routes comme aux traductions. Les options `domainsDir` et `subDomainsDirName` sont également communes : les définir une seule fois évite que les deux parties du module parcourent des arborescences différentes.

## Créer un domaine avec la CLI

```bash
pnpm create-domain authentication
pnpm create-domain shop --i18n fr,en
pnpm create-domain billing --only pages,composables,utils
```

`--only` accepte `pages`, `components`, `composables`, `layouts`, `stores`, `utils` et `public`, séparés par des virgules. Sans cette option, tous ces dossiers sont créés par défaut. `domain.config.ts` est toujours présent; `--i18n fr,en` ajoute les traductions. Consultez le [guide de la CLI](https://github.com/inoss25/nuxt-domain/blob/main/docs/GUIDE.md#créer-un-domaine) pour toutes les options.

## Ce que le module génère

- **Routes Nuxt** depuis `pages/`, avec prise en charge des paramètres, des sous-domaines, des routes enfants et des options par domaine.
- **Layouts Nuxt de domaine** depuis `layouts/`, et auto-imports depuis `components/`, `composables/`, `stores/` et `utils/`.
- **Assets statiques par domaine** depuis `public/`, servis sous une URL préfixée par le chemin du domaine.
- **Fichiers de locales** en fusionnant les JSON des domaines et des dossiers partagés.
- **Documentation et types de routes** générés dans `.nuxt/domain-pages` par défaut.

### Structure d’un domaine

Chaque domaine regroupe la configuration et les fichiers liés à une même fonctionnalité. Voici une structure complète possible; les dossiers restent facultatifs selon les besoins du domaine :

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
│   ├── fr.json
│   └── en.json
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

| Dossier / fichier | Rôle |
|---|---|
| `domain.config.ts` | Configure le domaine : activation, préfixe d’URL, middleware, métadonnées, sous-domaines et layout par défaut. |
| `pages/` | Contient les pages Vue qui deviennent des routes Nuxt. Par exemple, `pages/profile.vue` devient `/account/profile`; les fichiers `[id].vue` créent des segments dynamiques. |
| `components/` | Composants Vue propres au domaine, enregistrés pour l’auto-import Nuxt. Utilise-les pour découper l’interface en éléments réutilisables. |
| `composables/` | Fonctions composables auto-importées, par exemple `useAccount()` pour partager la logique Vue du domaine. |
| `layouts/` | Layouts Nuxt du domaine. Ils définissent une structure de page réutilisable, par exemple une mise en page d’authentification sans navigation principale. Voir la section ci-dessous. |
| `stores/` | Stores auto-importés, par exemple les stores Pinia liés au domaine. |
| `utils/` | Fonctions utilitaires auto-importées, sans dépendance à l’interface Vue. |
| `i18n/` | Fichiers JSON de traduction du domaine, fusionnés par le module i18n avec les traductions partagées. |
| `assets/` | Images, polices et styles propres au domaine. Importe-les depuis un fichier Vue ou CSS pour que Vite les traite et les inclue dans le build. Ce dossier n’est pas auto-importé ni créé par la CLI. |
| `public/` | Fichiers statiques du domaine, servis directement sans import sous `/domains/<chemin-du-domaine>/`. Par exemple, `account/public/logo.svg` est disponible à `/domains/account/logo.svg`. Le module ajoute ce dossier à Nitro; la CLI le crée par défaut ou avec `--only public`. |
| `domains/` | Sous-domaines métier imbriqués. Le domaine parent doit autoriser les sous-domaines avec `hasSubDomains: true`; chaque sous-domaine possède sa propre configuration et ses propres dossiers. |

La CLI crée `domain.config.ts` et, par défaut, les dossiers `pages/`, `components/`, `composables/`, `layouts/`, `stores/`, `utils/` et `public/`. `i18n/` est ajouté avec `--i18n`; `assets/` et `domains/` se créent lorsque le projet en a besoin. Utilise `--only` pour choisir les dossiers nécessaires, y compris `public`.

Tu peux aussi ajouter des dossiers propres à ton application, comme `services/` ou `repositories/`. Ils restent dans le domaine, mais le module ne les parcourt pas et ne les auto-importe pas automatiquement.

### Layouts de domaine

Les fichiers `.vue` de `layouts/` sont enregistrés comme de vrais layouts Nuxt via `addLayout`. Un layout contient `<slot />` à l’endroit où Nuxt affiche la page. Leur nom est préfixé par le domaine pour éviter les collisions : `app/domains/account/layouts/default.vue` devient `account-default`, et `layouts/auth.vue` devient `account-auth`.

Dans `domain.config.ts`, `layout: 'default'` applique `account-default` par défaut aux pages du domaine. La valeur désigne le chemin du fichier dans `layouts/`, sans extension : par exemple `layout: 'auth'` sélectionne `layouts/auth.vue`, et `layout: 'auth/login'` sélectionne `layouts/auth/login.vue`. Les sous-domaines héritent du réglage, qu’ils peuvent remplacer dans leur propre configuration. Une page peut choisir un autre layout enregistré avec `definePageMeta({ layout: 'account-auth' })` ou désactiver le layout avec `definePageMeta({ layout: false })`.

Comme dans Nuxt standard, `app.vue` doit contenir `<NuxtLayout><NuxtPage /></NuxtLayout>`. Sans option `layout` dans la configuration du domaine, Nuxt garde son fonctionnement habituel et utilise le layout global `default` s’il existe. Un layout de domaine n’est pas appliqué automatiquement en l’absence de `layout` dans `domain.config.ts`.

### Assets propres au domaine

Les assets sont importés depuis les fichiers qui les utilisent. Depuis `pages/profile.vue`, par exemple :

```vue
<script setup lang="ts">
import accountLogo from '../assets/logo.svg'
</script>

<template>
  <img :src="accountLogo" alt="Compte" />
</template>
```

Vite résout et prépare cet asset pour le build. Pour un fichier qui doit garder une URL statique connue sans import, place-le dans `public/` du domaine : `app/domains/account/public/logo.svg` est servi à `/domains/account/logo.svg`. Le `public/` global de l’application reste aussi disponible à la racine, par exemple `public/favicon.ico` à `/favicon.ico`.

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

Pour mesurer les étapes principales de génération, lance `pnpm benchmark`. Le benchmark crée un projet fictif dans un dossier temporaire, mesure le chargement des configurations avec cache froid et chaud, le scan des dossiers, la génération des routes et la fusion des locales, puis supprime le projet temporaire. Il affiche la médiane, le minimum et le 95e percentile en millisecondes, après un passage d’échauffement.

La charge par défaut contient 50 domaines, 500 pages et 100 fichiers i18n. Pour ajuster le scénario sous PowerShell :

```powershell
$env:DOMAIN_BENCH_DOMAINS=100
$env:DOMAIN_BENCH_PAGES=20
$env:DOMAIN_BENCH_LOCALES=3
$env:DOMAIN_BENCH_ITERATIONS=10
pnpm benchmark
```

Les résultats dépendent de la machine et du système de fichiers. Compare les mêmes paramètres et le même environnement avant/après une modification; la durée de la suite de tests ne remplace pas une mesure du démarrage d’une application Nuxt réelle.

## Licence

[MIT](https://github.com/inoss25/nuxt-domain/blob/main/LICENSE)
