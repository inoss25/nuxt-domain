import type { NameFormat } from './shared/runtime/naming'
import type { DomainI18nOptions } from './i18n/runtime/types'
import type { DomainPagesOptions } from './pages/runtime/types'

export interface DomainNamingOptions {
    /**
     * Convention attendue pour les noms de dossiers de domaine (segments).
     * Si absent, aucune validation de nom de dossier (comportement historique).
     */
    domainNameFormat?: NameFormat
}

export interface DomainModuleOptions {
    /** Racine des domaines (partagé pages + i18n). */
    domainsDir?: string
    subDomainsDirName?: string
    /** Échoue le build en cas de conflits routes, i18n ou erreurs de validation. */
    strict?: boolean
    debug?: boolean
    /** Conventions de nommage des dossiers domaine (indépendant des clés i18n). */
    naming?: DomainNamingOptions
    pages?: Partial<Omit<DomainPagesOptions, 'domainsDir' | 'subDomainsDirName' | 'strict' | 'debug'>>
    i18n?: Partial<Omit<DomainI18nOptions, 'domainsDir' | 'subDomainsDirName' | 'strict' | 'debug'>>
}

export type { DomainNamingOptions as DomainNamingConfig }
