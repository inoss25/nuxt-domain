# Changelog

## Non publié

- **Rupture** : supprime l’option `pages.noPrefixDomains`, dépréciée ; utilisez `noPrefix: true` dans le `domain.config.ts` du domaine.
- Publie un build (`dist/`, JavaScript + déclarations `.d.ts`) généré avec `@nuxt/module-builder` au lieu des sources TypeScript ; les alias `#domain-pages` et `#domain-shared` pointent vers `dist/runtime`.
- Déclare `meta.compatibility` (`nuxt >=3.12.0`) : Nuxt avertit en cas de version incompatible.
- Recharge un `domain.config.ts` quand un fichier qu’il importe change (cache et watcher dev).
- Ajoute les assets `public/` des domaines via le hook `nitro:config` au lieu de modifier `nuxt.options.nitro`.
- Journalise via consola (le logger de Nuxt, tag `nuxt-domain`) au lieu de `console.*` ; messages, diagnostics et `route.md` en anglais.
- README principal en anglais, version française dans `README.fr.md` ; documentation des sous-modules déplacée dans `docs/`.
- Corrige les erreurs TypeScript du module i18n ; ajoute `pnpm typecheck` et une CI GitHub Actions (Linux + Windows, plus un job Nuxt 3 minimal).

## 0.4.0 — 2026-10-27

- Parcourt l’arborescence des domaines une seule fois par instance Nuxt (au lieu de 7 globs) et partage l’index entre la validation, les routes, les auto-imports et l’i18n : démarrage environ 5× plus rapide sur 200 domaines / 4 000 pages.
- En dev, tient l’index à jour à partir des événements du watcher au lieu de rescanner le disque à chaque ajout de page.
- Redémarre Nuxt en dev quand un dossier `components/`, `composables/`, `stores/`, `utils/`, `public/` ou un layout de domaine apparaît, puisqu’ils ne sont enregistrés qu’au démarrage.
- Corrige la validation des interpolations, dont le coût croissait au carré du nombre de clés ; les feuilles de chaque locale ne sont plus calculées qu’une fois.
- Corrige `typed-i18n.d.ts` : `DefineLocaleMessage` s’appuie sur le JSON de la locale de référence (l’ancienne signature d’index était invalide en TypeScript).
- `typed-router.d.ts` n’étend plus d’interfaces inexistantes de `vue-router` et expose seulement le type global `DomainPagesRouteName` ; les noms contenant `'` sont échappés.
- Ajoute `i18n: false` et rend `@nuxtjs/i18n` optionnel dans les `peerDependencies`.
- Fusionne les catalogues i18n sans copies intermédiaires et aplatit l’arbre des routes une seule fois.
- Supprime le code dupliqué (`toPosixPath`, `writeIfChanged`, nom des layouts, type `DomainConfig`) et le code mort.

## 0.3.0 — 2026-10-16

- Sert les dossiers `public/` des domaines sous des URL isolées, et ajoute `public` aux dossiers proposés par `create-domain`.
- Ajoute un benchmark reproductible pour mesurer le chargement des configurations, les scans, les routes et l’i18n.

## 0.2.0 — 2026-10-16

- Enregistre les fichiers `layouts/**/*.vue` des domaines comme de vrais layouts Nuxt avec `addLayout`.
- Ajoute `layout` à `domain.config.ts` pour appliquer un layout par défaut aux pages d’un domaine; les sous-domaines héritent du réglage et peuvent le remplacer.
- Préfixe les noms de layouts par le domaine pour éviter les collisions et documente leur usage avec `<NuxtLayout>` et `definePageMeta`.

## 0.1.2 — 2026-10-15

- Améliore le README npm avec un démarrage rapide, un exemple de routes générées et les liens vers la documentation.
- Ajoute les badges npm et licence ainsi que ce changelog au package publié.
- Optimise la génération des routes en mettant en cache les réglages calculés par domaine.
- Limite à 32 le nombre de lectures de fichiers i18n simultanées.
- Exclut les tests du package publié et conserve la commande `create-domain` dans le package npm.
