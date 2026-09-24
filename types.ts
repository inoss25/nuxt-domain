import type { DomainI18nOptions } from './i18n/runtime/types'
import type { DomainPagesOptions } from './pages/runtime/types'

export interface DomainModuleOptions {
    /** Racine des domaines (partagé pages + i18n). */
    domainsDir?: string
    subDomainsDirName?: string
    /** Échoue le build en cas de conflits routes ou clés i18n. */
    strict?: boolean
    debug?: boolean
    pages?: Partial<Omit<DomainPagesOptions, 'domainsDir' | 'subDomainsDirName' | 'strict' | 'debug'>>
    i18n?: Partial<Omit<DomainI18nOptions, 'domainsDir' | 'subDomainsDirName' | 'strict' | 'debug'>>
}
