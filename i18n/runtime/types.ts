export interface DomainI18nOptions {
  /**
   * Racine des domaines (même convention que `domain-pages`).
   * @default 'app/domains'
   */
  domainsDir?: string

  /**
   * Dossiers contenant des fichiers de locale partagés (`en.json`, `fr.json`, …).
   * Leur contenu est fusionné sous `sharedMessagesNamespace` (défaut : `global`), pas à la racine.
   * Les messages des domaines restent sous `home`, `about`, etc. Une clé racine du même nom qu’un domaine
   * ne rentre pas en conflit avec `global.*`.
   * @default ['app/shared/i18n']
   */
  sharedI18nDirs?: string[]

  /**
   * Clé sous laquelle sont regroupés tous les messages issus de `sharedI18nDirs`.
   * Ex. avec la valeur par défaut : `{ "global": { "appName": "…" }, "home": { … } }`.
   * @default 'global'
   */
  sharedMessagesNamespace?: string

  /**
   * Dossier de sortie des JSON compilés, relatif à `rootDir`.
   * Avec le `i18n.dir` par défaut de @nuxtjs/i18n (`i18n`), utiliser `i18n/locales`
   * et `i18n.langDir: 'locales'` (le module peut déduire `langDir` si absent).
   * @default 'i18n/locales'
   */
  outputDir?: string

  /**
   * Nom du dossier marqueur des sous-domaines (comme `domain-pages`).
   * @default 'domains'
   */
  subDomainsDirName?: string

  /**
   * Forme des clés d’objet dérivées des noms de dossiers de domaine dans le JSON compilé.
   * - `snake_case` : tirets → underscores, tout en minuscules (`user-profile` → `user_profile`).
   * - `preserve` : identique au nom du dossier sur disque.
   * @default 'snake_case'
   */
  domainSegmentKeyFormat?: 'snake_case' | 'preserve'

  /**
   * En `nuxt dev`, régénère `outputDir` quand un JSON source ou un `domain.config.ts`
   * pertinent change (via le hook `builder:watch`).
   * @default true
   */
  watchSourcesInDev?: boolean

  /**
   * Délai (ms) avant régénération après un changement fichier (debounce).
   * @default 250
   */
  watchDebounceMs?: number

  /** Échoue le build si des clés i18n sont écrasées par une autre source. */
  strict?: boolean

  /** Active des logs détaillés */
  debug?: boolean
}
