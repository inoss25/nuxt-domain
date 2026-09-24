# nuxt-domain

Module Nuxt pour une architecture **domain-driven (DDD)** : routes par domaine, auto-imports, agrégation i18n pour `@nuxtjs/i18n`.

📖 **[Guide complet (installation, commandes, structure, config, packages)](./docs/GUIDE.md)**

---

## Démarrage rapide

### 1. Installer

```bash
pnpm add nuxt-domain @nuxtjs/i18n
# GitHub :
pnpm add github:inoss25/nuxt-domain @nuxtjs/i18n
```

### 2. Configurer Nuxt

```ts
// nuxt.config.ts — nuxt-domain AVANT @nuxtjs/i18n
export default defineNuxtConfig({
  modules: ['nuxt-domain', '@nuxtjs/i18n'],
  domain: {
    domainsDir: 'app/domains',
    i18n: { sharedI18nDirs: ['app/shared/i18n'] },
  },
  i18n: {
    langDir: 'locales',
    locales: [
      { code: 'fr', file: 'fr.json' },
      { code: 'en', file: 'en.json' },
    ],
  },
})
```

### 3. Créer un domaine

Dans **package.json** de votre app :

```json
{
  "scripts": {
    "create-domain": "create-domain"
  }
}
```

Puis :

```bash
pnpm create-domain authentication
pnpm create-domain shop --i18n fr,en
```

Sans script dédié :

```bash
pnpm exec create-domain billing --domains-dir app/domains
```

Voir [Créer un domaine](./docs/GUIDE.md#créer-un-domaine) pour toutes les options CLI.

### 4. Structure minimale créée

```
app/domains/authentication/
├── domain.config.ts
├── pages/index.vue
├── components/
├── composables/
└── i18n/          # si --i18n fr,en
```

---

## Commandes

| Où | Commande | Description |
|----|----------|-------------|
| Votre app | `pnpm create-domain <nom>` | Squelette de domaine (via bin `create-domain`) |
| Votre app | `pnpm dev` | Régénère routes + locales |
| Ce repo | `pnpm test` | Tests vitest du module |

---

## Packages utilisés

| Type | Packages |
|------|----------|
| **Peer** (votre app) | `nuxt`, `@nuxtjs/i18n` |
| **Bundled** (avec nuxt-domain) | [`fast-glob`](https://github.com/mrmlnc/fast-glob), [`jiti`](https://github.com/unjs/jiti) |
| **Runtime Nuxt** | `nuxt/kit`, `@nuxt/schema` |

Détails : [Packages et dépendances](./docs/GUIDE.md#packages-et-dépendances).

---

## Architecture du package

```
nuxt-domain/
├── docs/GUIDE.md       ← documentation utilisateur complète
├── scripts/create-domain.mjs
├── index.ts            ← entrée module Nuxt (pages + i18n)
├── shared/             ← paths, jiti config-loader
├── pages/              ← routes, auto-imports, route-map
└── i18n/               ← compilation locales
```

---

## Documentation détaillée

| Document | Contenu |
|----------|---------|
| [**docs/GUIDE.md**](./docs/GUIDE.md) | Guide complet |
| [pages/README.md](./pages/README.md) | Routes, exemples, `routeDoc` |
| [i18n/README.md](./i18n/README.md) | Fusion JSON, clés, watch |
| [shared/README.md](./shared/README.md) | API interne partagée |

---

## Licence

MIT — voir [LICENSE](./LICENSE).
