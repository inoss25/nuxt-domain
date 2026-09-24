# Domain Pages Module

Module Nuxt pour organiser vos pages par domaines (architecture domain-driven). Ce module génère automatiquement les routes à partir de la structure de fichiers dans `app/domains/`.

## 🎯 Fonctionnalités

- ✅ Génération automatique des routes à partir de la structure de fichiers
- ✅ Organisation par domaines (DDD)
- ✅ Auto-import des composants et composables par domaine
- ✅ Support des routes dynamiques (`[id].vue`, `[...slug].vue`)
- ✅ Support des routes enfants (via dossier `children`)
- ✅ Support des sous-domaines imbriqués (ex: `inventory/brands`)
- ✅ Configuration flexible par domaine avec héritage parent/enfant
- ✅ Préfixes de domaine personnalisables
- ✅ Page d'accueil configurable (avec détection de conflits)
- ✅ Middleware et meta par domaine
- ✅ Génération automatique de `route.md` — documentation des routes
- ✅ Génération automatique de `route-map.json` — carte des routes exploitable programmatiquement
- ✅ Génération automatique de `typed-router.d.ts` — noms de routes typés pour TypeScript
- ✅ Gestion d'erreurs détaillée lors du chargement des `domain.config.ts`
- ✅ Redémarrage automatique en dev lors de la modification d'un `domain.config.ts`

## 📦 Installation

Installez le package **`nuxt-domain`** (voir [docs/GUIDE.md](../docs/GUIDE.md)). Les options pages se configurent sous **`domain.pages`** :

```typescript
export default defineNuxtConfig({
    modules: ['nuxt-domain', '@nuxtjs/i18n'],
    domain: {
        domainsDir: 'app/domains',
        pages: {
            childrenDirName: 'children',
            routeDoc: { outDir: '.nuxt/domain-pages' },
        },
    },
})
```

> Ancienne clé `domainPages` : réservée à l’installation directe du sous-module seul ; avec le package composite, préférez **`domain.pages`**.

## 📁 Structure des fichiers

Organisez vos domaines dans le dossier `app/domains/` :

```
app/domains/
├── authentication/
│   ├── domain.config.ts      # Configuration du domaine
│   ├── pages/
│   │   ├── index.vue         # Route: /login (si noPrefix)
│   │   └── login.vue         # Route: /login
│   ├── components/           # Auto-importés
│   ├── composables/          # Auto-importés
│   └── ...
│
├── dashboard/
│   ├── domain.config.ts
│   └── pages/
│       ├── index.vue         # Route: /dashboard
│       └── settings.vue      # Route: /dashboard/settings
│
└── projects/
    ├── domain.config.ts
    └── pages/
        ├── index.vue         # Route: /projects
        ├── [id].vue          # Route: /projects/:id
        └── [id]/
            └── children/
                └── edit.vue  # Route enfant: /projects/:id/edit
```

## ⚙️ Configuration d'un domaine

Créez un fichier `domain.config.ts` dans chaque domaine :

```typescript
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    // Activer/désactiver le domaine
    enabled: true,

    // Préfixe personnalisé (par défaut: nom du domaine)
    prefix: 'auth',

    // Désactiver le préfixe (routes sans préfixe)
    noPrefix: true,

    // Définir ce domaine comme page d'accueil (/)
    home: true,

    // Middleware global pour toutes les routes du domaine
    middleware: 'auth',

    // Meta global pour toutes les routes du domaine
    meta: {
        layout: 'auth',
        requiresAuth: false,
    },

    // Overrides de routes spécifiques
    routes: {
        'login': {
            path: '/signin',           // Override du path
            name: 'signin',            // Override du name
            middleware: ['guest'],     // Middleware spécifique
            meta: {                    // Meta spécifique
                title: 'Connexion',
            },
        },
    },
})
```

## 📝 Exemples d'utilisation

### Exemple 1 : Domaine d'authentification (page d'accueil)

**Structure :**
```
app/domains/authentication/
├── domain.config.ts
└── pages/
    └── login.vue
```

**domain.config.ts :**
```typescript
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    home: true,      // Devient la route /
    noPrefix: true,  // Pas de préfixe /authentication
})
```

**Résultat :**
- `login.vue` → Route `/login` (nom: `login`)
- Si `login.vue` était `index.vue` → Route `/` (nom: `home`)

### Exemple 2 : Domaine avec préfixe personnalisé

**Structure :**
```
app/domains/projects/
├── domain.config.ts
└── pages/
    ├── index.vue
    └── [id].vue
```

**domain.config.ts :**
```typescript
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    prefix: 'projets',  // Préfixe personnalisé
    middleware: 'auth',
    meta: {
        requiresAuth: true,
    },
})
```

**Résultat :**
- `index.vue` → Route `/projets` (nom: `projets`)
- `[id].vue` → Route `/projets/:id` (nom: `projets.id`)

### Exemple 3 : Routes avec paramètres dynamiques

**Structure :**
```
app/domains/blog/
└── pages/
    ├── index.vue           # /blog
    ├── [slug].vue          # /blog/:slug
    └── category/
        └── [...path].vue   # /blog/category/:path*
```

**Résultat :**
- `index.vue` → Route `/blog` (nom: `blog`)
- `[slug].vue` → Route `/blog/:slug` (nom: `blog.slug`)
- `[...path].vue` → Route `/blog/category/:path*` (nom: `blog.category.path`)

### Exemple 4 : Routes enfants

**Structure :**
```
app/domains/projects/
└── pages/
    ├── [id].vue
    └── [id]/
        └── children/
            ├── edit.vue
            └── settings.vue
```

**Résultat :**
- `[id].vue` → Route `/projects/:id` (nom: `projects.id`)
  - Enfant `edit.vue` → Route `/projects/:id/edit` (nom: `projects.id.edit`)
  - Enfant `settings.vue` → Route `/projects/:id/settings` (nom: `projects.id.settings`)

### Exemple 4bis : Sous-domaines (ex: `inventory/brands`)

**Structure :**
```
app/domains/inventory/
├── domain.config.ts              # 👈 autorise les sous-domaines
└── domains/                       # 👈 dossier des sous-domaines (par défaut)
    └── brands/
        └── pages/
            ├── index.vue         # /inventory/brands
            └── [id].vue          # /inventory/brands/:id
```

**inventory/domain.config.ts :**
```typescript
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    hasSubDomains: true,
    // subDomainsDirName: 'domains', // optionnel (par défaut)
})
```

### Exemple 5 : Override de routes

**domain.config.ts :**
```typescript
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    prefix: 'admin',
    
    routes: {
        'users/index': {
            path: '/utilisateurs',
            name: 'users',
            middleware: ['admin'],
            meta: {
                title: 'Gestion des utilisateurs',
            },
        },
        'users/[id]': {
            path: '/utilisateurs/:id',
            name: 'user-detail',
        },
    },
})
```

### Exemple 6 : Domaine désactivé

```typescript
import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    enabled: false,  // Toutes les routes de ce domaine seront ignorées
})
```

## 🔧 Options de configuration

### Options globales (nuxt.config.ts → `domain.pages`)

```typescript
export default defineNuxtConfig({
    domain: {
        pages: {
        // Dossier contenant les domaines
        domainsDir: 'app/domains',
        
        // Nom du dossier pour les routes enfants
        childrenDirName: 'children',

        // Nom du dossier contenant les sous-domaines (par défaut: "domains")
        subDomainsDirName: 'domains',

        // Logs détaillés (chargement configs + normalisation sous-domaines + routes)
        debug: true,

        /**
         * Fichiers générés automatiquement par le module :
         * - route.md       : documentation Markdown des routes
         * - route-map.json : carte des routes (JSON, exploitable programmatiquement)
         * - typed-router.d.ts : types TypeScript pour les noms de routes
         *
         * Par défaut : `.nuxt/domain-pages/`.
         */
        routeDoc: {
            enabled: true,           // `false` pour ne pas générer les fichiers
            outDir: '.nuxt/domain-pages',  // Relatif à la racine Nuxt
            fileName: 'route.md',    // Nom du fichier Markdown
        },

        // Raccourci pour tout désactiver :
        // routeDoc: false,
        },
    },
})
```

Les fichiers sont régénérés à chaque préparation / build / dev (hook `extendPages`). Les routes enfants (`children/`) sont incluses avec leur chemin complet.

| Option | Type | Description |
|--------|------|-------------|
| `routeDoc` | `false \| { enabled?, outDir?, fileName? }` | `false` : pas de génération. Sinon `enabled` (défaut `true`), `outDir` (défaut `.nuxt/domain-pages`), `fileName` (défaut `route.md`). |

### Options par domaine (domain.config.ts)

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | `boolean` | Activer/désactiver le domaine (défaut: `true`) |
| `prefix` | `string` | Préfixe personnalisé pour les routes (défaut: nom du domaine) |
| `noPrefix` | `boolean` | Désactiver le préfixe pour ce domaine |
| `hasSubDomains` | `boolean` | Autoriser des sous-domaines (ex: `inventory/brands`) |
| `prefixSubDomains` | `boolean` | Ajouter le segment URL du sous-domaine (défaut: `true`). `false` = pages à la racine du parent |
| `subDomainsDirName` | `string` | Nom du dossier des sous-domaines (défaut: `domains`) |
| `home` | `boolean` | Définir ce domaine comme page d'accueil (`/`). Un avertissement est émis si plusieurs domaines définissent `home: true` |
| `middleware` | `string \| string[]` | Middleware global pour toutes les routes |
| `meta` | `Record<string, any>` | Meta global pour toutes les routes |
| `routes` | `Record<string, DomainRouteOverride>` | Overrides de routes spécifiques |

## 📄 Fichiers générés

À chaque build/dev, le module génère trois fichiers (configurables via `routeDoc`) :

### `route.md` — Documentation Markdown

Tableau listant toutes les routes générées avec leur chemin, nom et fichier source.

### `route-map.json` — Carte des routes (JSON)

Fichier JSON exploitable programmatiquement pour générer des navigations, sidebars, etc.

```json
[
  { "path": "/", "name": "home", "file": "app/domains/authentication/pages/index.vue" },
  { "path": "/login", "name": "login", "file": "app/domains/authentication/pages/login.vue" },
  { "path": "/dashboard", "name": "dashboard", "file": "app/domains/dashboard/pages/index.vue" }
]
```

### `typed-router.d.ts` — Noms de routes typés

Fichier de déclaration TypeScript générant un type union `DomainPagesRouteName` pour les noms de routes. Améliore l'autocomplétion et la vérification TypeScript lors de la navigation :

```typescript
import { useRouter } from 'vue-router'

const router = useRouter()
// ✅ Nom de route typé et vérifié à la compilation
router.push({ name: 'dashboard' })
// ❌ Erreur TypeScript si le nom n'existe pas
router.push({ name: 'route-inexistante' })
```

## 🎨 Auto-import

### Composants

Les composants dans `domain/components/` sont automatiquement importés :

```
app/domains/dashboard/components/
├── UserCard.vue
└── StatsWidget.vue
```

Utilisation directe dans vos pages :
```vue
<template>
    <UserCard />
    <StatsWidget />
</template>
```

### Composables

Les composables dans `domain/composables/` sont automatiquement importés :

```
app/domains/dashboard/composables/
└── useDashboard.ts
```

Utilisation directe :
```vue
<script setup>
const { data, loading } = useDashboard()
</script>
```

## 📚 Types TypeScript

```typescript
import type {
    DomainConfig,
    DomainRouteDocOptions,
    DomainRouteOverride,
} from '#domain-pages'

// Utilisation dans votre code
const config: DomainConfig = {
    prefix: 'admin',
    middleware: 'auth',
}
```

## 🏗️ Architecture du module

Le module est organisé en fichiers séparés pour une meilleure maintenabilité :

```
modules/domain/pages/
├── module.ts                      # Point d'entrée, orchestration
├── index.ts                       # Re-export du module
├── README.md                      # Cette documentation
└── runtime/
    ├── types.ts                   # Interfaces et types
    ├── utils.ts                   # Utilitaires partagés
    ├── defineDomainConfig.ts      # Helper de configuration
    ├── config-loader.ts           # Chargement des domain.config.ts (via importModule de nuxt/kit)
    ├── route-generator.ts         # Logique de génération des routes
    ├── route-doc.ts               # Génération des fichiers de documentation (md, json, d.ts)
    └── index.ts                   # Re-exports publics
```

## 🚀 Bonnes pratiques

1. **Organisation claire** : Un domaine = une fonctionnalité métier
2. **Nommage cohérent** : Utilisez des noms de domaines clairs (`authentication`, `dashboard`, `projects`)
3. **Configuration minimale** : Ne configurez que ce qui est nécessaire
4. **Routes enfants** : Utilisez le dossier `children` pour les routes imbriquées
5. **Meta partagées** : Utilisez `meta` au niveau du domaine pour les valeurs communes
6. **Sous-domaines** : Activez `hasSubDomains: true` sur le parent pour autoriser les sous-domaines

## 🐛 Dépannage

### Les routes ne sont pas générées

- Vérifiez que le fichier `domain.config.ts` existe dans le domaine
- Vérifiez que `enabled` n'est pas à `false`
- Vérifiez la structure des fichiers dans `pages/`

### Erreur de chargement d'un `domain.config.ts`

- Le module affiche un message d'erreur détaillé dans la console avec le fichier concerné
- Vérifiez la syntaxe de votre `domain.config.ts` (exports, types, etc.)
- Les configs sont chargées via `importModule` de `nuxt/kit` — les fichiers `.ts` sont supportés nativement

### Les composants ne sont pas auto-importés

- Vérifiez que le dossier `components/` existe dans le domaine
- Vérifiez que les fichiers ont l'extension `.vue`

### Le préfixe ne fonctionne pas

- Vérifiez que `noPrefix` n'est pas à `true` dans `domain.config.ts`

### Conflit de page d'accueil

- Si plusieurs domaines définissent `home: true`, un avertissement `⚠️` est émis dans la console
- Le dernier domaine avec `home: true` prend le dessus

## 📄 Licence

Ce module est interne au projet.
