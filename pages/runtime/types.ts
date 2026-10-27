import type { NuxtPage } from '@nuxt/schema'
import type { DomainConfig, DomainRouteOverride } from '../../shared/runtime/types'

export type { DomainConfig, DomainRouteOverride }

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
