# `domain-i18n`

Module Nuxt qui **agrège** les fichiers de traduction éparpillés dans les domaines (`app/domains/...`) et les dossiers partagés (`app/shared/...`) en **un JSON par locale** dans `i18n/locales/`, prêt pour [@nuxtjs/i18n](https://i18n.nuxtjs.org/).

Il reprend la **même logique de chemins** que le module interne `domain-pages` (dossier marqueur `domains`, `domain.config.ts`, `hasSubDomains`, etc.).

---

## Pourquoi ce module ?

- Les textes vivent **à côté du code** de chaque domaine (`app/domains/mon-domaine/i18n/fr.json`).
- Les textes **transverses** vivent dans des dossiers configurables (`sharedI18nDirs`), regroupés sous la clé **`global`** (par défaut) dans le fichier compilé.
- Le build produit des fichiers stables (`i18n/locales/en.json`, …) que `@nuxtjs/i18n` charge comme d’habitude.

---

## Installation

1. Enregistrer le module **avant** `@nuxtjs/i18n` dans `nuxt.config.ts`.
2. Régler `i18n.langDir` sur **`'locales'`** (chemin relatif au dossier `i18n` du module i18n, pas `i18n/locales`).

Exemple minimal :

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-domain',
    '@nuxtjs/i18n',
  ],
  domain: {
    i18n: {
      sharedI18nDirs: ['app/shared/i18n'],
      outputDir: 'i18n/locales',
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

Les fichiers générés sont écrits sous **`i18n/locales/`** (défaut de `domainI18n.outputDir`), ce qui correspond à : racine du projet → dossier `i18n` (défaut de `@nuxtjs/i18n`) → `langDir: 'locales'` → `en.json`.

---

> Avec le package composite, configurez ces options sous **`domain.i18n`** (voir [docs/GUIDE.md](../docs/GUIDE.md)).

## Options (`domain.i18n` / anciennement `domainI18n`)

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `domainsDir` | `string` | `'app/domains'` | Racine des domaines (identique à `domainPages.domainsDir` si tu alignes les deux). |
| `sharedI18nDirs` | `string[]` | `['app/shared/i18n']` | Liste de dossiers contenant des `*.json` par locale. Leur contenu est fusionné sous **`sharedMessagesNamespace`** (voir ci‑dessous), pas à la racine du message. |
| `sharedMessagesNamespace` | `string` | `'global'` | Clé parente pour tout ce qui vient de `sharedI18nDirs`. Ex. : `{ "global": { "appName": "…" }, "home": { … } }`. |
| `outputDir` | `string` | `'i18n/locales'` | Dossier de sortie des JSON compilés (relatif à `rootDir`). |
| `subDomainsDirName` | `string` | `'domains'` | Nom du dossier « marqueur » des sous-domaines (comme `domain-pages`). |
| `domainSegmentKeyFormat` | `'snake_case' \| 'preserve'` | `'snake_case'` | Forme des clés dérivées des noms de dossiers (voir section Domaines). |
| `watchSourcesInDev` | `boolean` | `true` | En `nuxt dev`, régénère les locales quand un fichier source pertinent change. |
| `watchDebounceMs` | `number` | `250` | Délai de debounce avant régénération (watch). |
| `debug` | `boolean` | `false` | Logs détaillés dans la console. |

Exemple avec dossier partagé personnalisé et autre namespace (rare) :

```ts
domainI18n: {
  sharedI18nDirs: ['app/shared/i18n', 'lib/ui-i18n'],
  sharedMessagesNamespace: 'global',
  outputDir: 'i18n/locales',
  debug: false,
},
```

---

## Contenu de `sharedI18nDirs` → préfixe `global`

Tous les fichiers listés dans `sharedI18nDirs` sont **deep-merge** sous la clé configurée (`global` par défaut).

**Fichier source** `app/shared/i18n/en.json` :

```json
{
  "appName": "Sendexio",
  "common": {
    "loading": "Loading…"
  }
}
```

**Fragment du fichier compilé** `i18n/locales/en.json` :

```json
{
  "global": {
    "appName": "Sendexio",
    "common": {
      "loading": "Loading…"
    }
  },
  "home": { },
  "about": { }
}
```

Dans les templates / composables Vue I18n, les clés sont donc du type :

- `t('global.appName')`
- `t('global.common.loading')`

Les **liens** de message (syntaxe `@:`) pointent vers le chemin complet, par exemple :

```json
"linked": "@:global.appName — @:home.title"
```

Plusieurs dossiers dans `sharedI18nDirs` sont fusionnés **dans le même** objet `global` (ordre des chemins de fichiers trié : derniers fichiers gagnent en cas de conflit sur une feuille).

---

## Domaines : structure imbriquée

Le module parcourt tous les `*.json` sous :

`{domainsDir}/**/i18n/**/*.json`

Le **chemin du domaine** est dérivé du dossier parent de `i18n/`, en **normalisant** les segments `domains/` comme `domain-pages` (selon les `domain.config.ts`).

### Clés dans le JSON : `snake_case` par défaut

Avec `domainSegmentKeyFormat: 'snake_case'` (défaut), chaque segment de dossier est transformé pour les clés du message : **tirets → underscores**, **minuscules**. Les dossiers sur disque peuvent rester en kebab-case.

| Dossier réel | Clé dans le JSON compilé |
|--------------|---------------------------|
| `user-profile` | `user_profile` |
| `home` | `home` |
| `shop` / `checkout` | `shop.checkout` |

Pour utiliser **exactement** le nom du dossier comme clé (y compris tirets), régler :

```ts
domainI18n: { domainSegmentKeyFormat: 'preserve' },
```

| Fichier | Emplacement typique dans le JSON compilé |
|---------|------------------------------------------|
| `app/domains/home/i18n/en.json` | `home` |
| `app/domains/user-profile/i18n/en.json` | `user_profile` |
| `app/domains/shop/domains/checkout/i18n/en.json` | `shop.checkout` |

Le contenu de chaque JSON est **deep-merge** à l’emplacement correspondant. Plusieurs fichiers pour la même locale et le même domaine (voir ci‑dessous) sont fusionnés entre eux.

---

## Fichiers par locale : deux formes

1. **`i18n/en.json`** — le nom du fichier (sans `.json`) est le **code de locale** (`en`, `fr`, `ar`, `en-US`, …).
2. **`i18n/en/partials.json`** — le **premier segment** après `i18n/` est le code de locale ; les fichiers sous ce dossier sont tous mergés pour cette locale.

Même logique pour les dossiers listés dans `sharedI18nDirs`.

---

## Ordre de fusion (priorité)

Pour chaque locale, génération en deux temps :

1. **Shared** — tous les `sharedI18nDirs`, fusion sous `global` (ou `sharedMessagesNamespace`).
2. **Domaines** — fusion sous `home`, `shop.checkout`, etc.

Si une **même clé** existe à la même profondeur dans deux sources du **même niveau** (deux fichiers domaine ou deux fichiers shared), la **dernière** fusion gagne (ordre de fichiers déterministe : tri par chemin).

Les clés **`global.*`** et **`home.*`** sont indépendantes : le shared n’écrase pas `home` et réciproquement.

---

## JSON : échappements Vue I18n et `@:`

- Le module utilise **`JSON.parse`**. Les échappements standard JSON (`\"`, `\\`, `\n`, unicode `\uXXXX`, etc.) sont pris en charge.
- Les chaînes contenant la syntaxe **Vue I18n** (`@:global.appName`, `@.lower:…`, etc.) ne sont pas interprétées à la compilation : elles restent des chaînes jusqu’au runtime d’i18n.

### Caractères spéciaux Vue I18n (escape sequences)

Vue I18n traite `{`, `}`, `@`, `$` et `|` comme syntaxe de message. Pour afficher ces caractères **littéralement**, utilise les [séquences d'échappement](https://vue-i18n.intlify.dev/guide/essentials/syntax.html#escape-sequences) (Vue I18n ≥ 11.3) :

| Dans le JSON source | Valeur après `JSON.parse` | Rendu à l'écran |
|---------------------|---------------------------|-----------------|
| `"you\\@example.com"` | `you\@example.com` | `you@example.com` |
| `"hello \\{world\\}"` | `hello \{world\}` | `hello {world}` |
| `"option A \\| option B"` | `option A \| option B` | `option A \| option B` |
| `"chemin\\\\dossier"` | `chemin\\dossier` | `chemin\dossier` |

**Ne pas** utiliser d'autres contournements (ex. `//@` à la place de `@`) : préfère toujours `\\@` dans le fichier JSON.

Exemple dans un domaine (`app/domains/authentication/i18n/en.json`) :

```json
{
  "login": {
    "email": {
      "placeholder": "you\\@example.com"
    }
  }
}
```

Le fichier compilé conserve la même séquence (`"you\\@example.com"`) ; Vue I18n produit `you@example.com` au runtime.

En cas de JSON invalide, le build échoue avec un message indiquant le **chemin du fichier**.

---

## Relation avec `domain-pages`

- Les deux modules utilisent les mêmes idées : `app/domains`, `domain.config.ts`, `hasSubDomains`, `subDomainsDirName`.
- La logique partagée (normalisation des chemins, chargement des `domain.config.ts`) vit dans **`modules/domain/shared`**.
- Garde les options `domainsDir` / `subDomainsDirName` **alignées** entre les deux modules pour éviter des incohérences.

---

## Régénération des fichiers

Les fichiers dans `outputDir` sont (ré)écrits :

- au chargement du module (`setup`) ;
- sur le hook Nuxt **`build:before`** (y compris `nuxt build`).

### Watch en développement

Si `watchSourcesInDev` vaut `true` (défaut) et que tu lances **`nuxt dev`**, le module écoute **`builder:watch`** et régénère les JSON compilés lorsque :

- un fichier `*.json` sous `{domainsDir}/**/i18n/**` change ;
- un `domain.config.ts` sous `{domainsDir}` change ;
- un `*.json` dans un dossier `sharedI18nDirs` change.

Les écritures dans `outputDir` elles-mêmes sont ignorées (pas de boucle). Un **debounce** (`watchDebounceMs`, défaut 250 ms) regroupe les sauvegardes rapides.

Pour désactiver : `domainI18n: { watchSourcesInDev: false }`.

### Vérification des clés (CI / local)

Le script `scripts/check-i18n-keys.mjs` compare les clés **littérales** du type `t('…')`, `$t('…')` ou `keypath="…"` (dans `app/` et `modules/`) au fichier compilé `i18n/locales/<locale>.json`.

```bash
pnpm run check:i18n
pnpm run check:i18n -- --locale fr
```

**À lancer après** `nuxi prepare` (ou un build) pour que les JSON compilés existent. Le script signale les clés utilisées mais absentes du JSON ; il ne voit pas les clés dynamiques (voir l’en-tête du script).

---

## Fichiers générés et Git

`i18n/locales/*.json` sont **générés**. Tu peux :

- les **commiter** pour des diffs visibles en PR, ou  
- les **ignorer** dans `.gitignore` et ne régénérer qu’en CI / post-install (`nuxt prepare` exécute aussi les modules).

---

## Dépannage

| Problème | Piste |
|----------|--------|
| Erreur de chemin `i18n/i18n/locales/...` | `langDir` doit être `'locales'`, pas `'i18n/locales'`. |
| Clé introuvable à l’exécution | Vérifier le préfixe `global.` pour le shared et `home.` (etc.) pour les domaines. |
| Sous-domaine ignoré | Vérifier `hasSubDomains` sur le parent dans `domain.config.ts` (comme pour les pages). |

---

## Licence

Même licence que le dépôt du projet.
