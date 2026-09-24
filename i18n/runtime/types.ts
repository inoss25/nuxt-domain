import type { NameFormat } from '../../shared/runtime/naming'
import type { LocaleStructureMode } from './validate-i18n'

export interface DomainI18nOptions {
  /**
   * Racine des domaines (même convention que `domain-pages`).
   * @default 'app/domains'
   */
  domainsDir?: string

  /**
   * Dossiers contenant des fichiers de locale partagés (`en.json`, `fr.json`, …).
   * Leur contenu est fusionné sous `sharedMessagesNamespace` (défaut : `global`), pas à la racine.
   * @default ['app/shared/i18n']
   */
  sharedI18nDirs?: string[]

  /**
   * Clé sous laquelle sont regroupés tous les messages issus de `sharedI18nDirs`.
   * @default 'global'
   */
  sharedMessagesNamespace?: string

  /**
   * Dossier de sortie des JSON compilés, relatif à `rootDir`.
   * @default 'i18n/locales'
   */
  outputDir?: string

  /**
   * Nom du dossier marqueur des sous-domaines (comme `domain-pages`).
   * @default 'domains'
   */
  subDomainsDirName?: string

  /**
   * @deprecated Préférez `domainKeyFormat`. Conservé pour rétrocompatibilité.
   * @default 'snake_case'
   */
  domainSegmentKeyFormat?: 'snake_case' | 'preserve'

  /**
   * Forme des clés d’objet dérivées des noms de dossiers de domaine dans le JSON compilé.
   * Prioritaire sur `domainSegmentKeyFormat` si les deux sont définis.
   * @default dérivé de `domainSegmentKeyFormat` (`snake_case`)
   */
  domainKeyFormat?: NameFormat

  /**
   * Convention attendue pour les clés des fichiers JSON source (shared + domaines).
   * Si absent, aucune validation de convention sur les clés.
   */
  keyFormat?: NameFormat

  /**
   * Détecte les doublons / collisions (clés i18n, chemins domaine, fusion).
   * @default true
   */
  detectDuplicates?: boolean

  /**
   * Compare les placeholders `{var}` entre locales (référence : locale Nuxt par défaut ou première locale).
   * @default false
   */
  validateInterpolation?: boolean

  /**
   * Compare la structure des clés entre locales après agrégation.
   * - `false` : désactivé (défaut, comportement historique)
   * - `missing` : clés absentes dans une locale
   * - `all` : clés manquantes + clés supplémentaires (warnings)
   */
  validateLocaleStructure?: LocaleStructureMode

  /**
   * Locale de référence pour structure / interpolation (code @nuxtjs/i18n).
   */
  referenceLocale?: string

  /** @default true */
  watchSourcesInDev?: boolean

  /** @default 250 */
  watchDebounceMs?: number

  /** Échoue le build si des erreurs de validation ou conflits (selon règles strict). */
  strict?: boolean

  debug?: boolean
}
