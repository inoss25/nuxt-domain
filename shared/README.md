# shared

Bibliothèque interne partagée par `pages` et `i18n` (sous-modules de `modules/domain/`).

## Exports

| Export | Rôle |
|--------|------|
| `defineDomainConfig()` | Helper typé pour `domain.config.ts` |
| `loadDomainConfigs()` | Charge tous les `domain.config.ts` via jiti |
| `normalizeDomainParts()` | Normalise les chemins sous-domaines (`domains/`) |
| `isDomainEnabled()` | Vérifie la chaîne `enabled` parent/enfant |
| `fileIsUnderRoot()` | Utilitaire watch (fichier sous un dossier racine) |

## Alias Nuxt

- `#domain-shared` → `modules/domain/shared/runtime`
- `#domain-pages` → `modules/domain/pages/runtime` (re-exporte `defineDomainConfig`)
