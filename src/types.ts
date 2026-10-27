import type { NameFormat } from './runtime/shared/naming'
import type { DomainI18nOptions } from './runtime/i18n/types'
import type { DomainPagesOptions } from './runtime/pages/types'

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
    /** `false` désactive le module i18n (projet sans `@nuxtjs/i18n`). */
    i18n?: false | Partial<Omit<DomainI18nOptions, 'domainsDir' | 'subDomainsDirName' | 'strict' | 'debug'>>
}

export type { DomainNamingOptions as DomainNamingConfig }
