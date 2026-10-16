# Changelog

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
