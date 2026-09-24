import type { NuxtPage } from '@nuxt/schema'
import type { DomainRouteOverride } from '../../shared/runtime/types'

export type { DomainRouteOverride }

export interface DomainConfig {
  enabled?: boolean
  prefix?: string
  noPrefix?: boolean
  hasSubDomains?: boolean
  prefixSubDomains?: boolean
  subDomainsDirName?: string
  home?: boolean
  middleware?: string[] | string
  meta?: Record<string, unknown>
  routes?: Record<string, DomainRouteOverride>
}

export interface DomainRouteDocOptions {
  enabled?: boolean
  outDir?: string
  fileName?: string
}

export interface DomainPagesOptions {
  domainsDir?: string
  /** @deprecated Utilisez `noPrefix: true` dans le `domain.config.ts`. */
  noPrefixDomains?: string[]
  childrenDirName?: string
  subDomainsDirName?: string
  /** Échoue le build si conflits de routes (path/name/home). */
  strict?: boolean
  debug?: boolean
  /** @deprecated Préférez `watchSourcesInDev`. */
  watchDomainConfigInDev?: boolean
  watchPagesInDev?: boolean
  watchSourcesInDev?: boolean
  watchDebounceMs?: number
  routeDoc?: boolean | DomainRouteDocOptions
}
