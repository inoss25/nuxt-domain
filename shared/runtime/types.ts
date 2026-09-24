/** Champs minimaux d'un `domain.config.ts` pour la normalisation des chemins. */
export interface DomainConfigPathFields {
  hasSubDomains?: boolean
  subDomainsDirName?: string
  enabled?: boolean
}

export interface DomainPathsOptions {
  subDomainsDirName?: string
  strict?: boolean
}

export interface DomainRouteOverride {
  path?: string
  name?: string
  meta?: Record<string, unknown>
  middleware?: string[] | string
}

/** Configuration complète d'un domaine (pages + i18n). */
export interface DomainConfig extends DomainConfigPathFields {
  prefix?: string
  noPrefix?: boolean
  prefixSubDomains?: boolean
  home?: boolean
  middleware?: string[] | string
  meta?: Record<string, unknown>
  routes?: Record<string, DomainRouteOverride>
}
