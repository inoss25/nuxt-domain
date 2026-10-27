# Playground

Application Nuxt qui charge le module depuis les sources (`../index`), pour le tester dans une vraie app. Elle n'est pas publiée sur npm.

Commandes, depuis la racine du dépôt :

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de dev (watcher, redémarrage sur nouvelle source) |
| `pnpm dev:prepare` | Génère `.nuxt/` (routes, `typed-router.d.ts`, locales i18n) |
| `pnpm dev:typecheck` | Vérifie les types générés avec `vue-tsc` |
| `pnpm dev:build` | Build de production |

Le playground n'a pas son propre `package.json` : il utilise le Nuxt installé à la racine, pour que le module et l'app partagent la même instance de `nuxt/kit`.

## Domaines d'exemple

| Domaine | Ce qu'il couvre | Routes |
|---|---|---|
| `home` | `home: true`, i18n | `/` |
| `auth` | `noPrefix`, layout de domaine (`centered`), import de `vue-router` + `DomainPagesRouteName` | `/login` |
| `shop` | `prefix`, `hasSubDomains`, `meta`, route dynamique, composant, composable, utilitaire, `public/` | `/boutique`, `/boutique/:id` |
| `shop/domains/cart` | sous-domaine | `/boutique/cart` |
| `dashboard` | routes enfants (`children/`) | `/dashboard`, `/dashboard/stats` |
| `_template` | dossier réservé, doit être ignoré | — |

Les traductions partagées sont dans `app/shared/i18n` (namespace `global`). Les fichiers générés (`i18n/locales/`, `.nuxt/`, `.output/`) sont ignorés par git.
