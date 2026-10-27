import { defineNuxtModule, installModule } from 'nuxt/kit'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import domainPagesModule from './pages-module'
import domainI18nModule from './i18n-module'
import { reportDiagnostics } from './runtime/shared/diagnostics'
import { resolveDomainKeyFormat } from './runtime/shared/naming'
import { getDomainScanCache, watchDomainTree } from './runtime/shared/scan'
import { validateDomainFolderNames } from './runtime/shared/validate-domain-names'
import type { DomainModuleOptions } from './types'

export type { DomainModuleOptions, DomainNamingOptions } from './types'
export type { NameFormat } from './runtime/shared/naming'

export default defineNuxtModule<DomainModuleOptions>({
    meta: {
        name: 'nuxt-domain',
        configKey: 'domain',
        compatibility: {
            nuxt: '>=3.12.0',
        },
    },

    defaults: {
        domainsDir: 'app/domains',
        subDomainsDirName: 'domains',
        strict: false,
        debug: false,
        naming: {},
        pages: {},
        i18n: {},
    },

    async setup(options, nuxt) {
        const rootDir = nuxt.options.rootDir
        const domainsRoot = resolve(rootDir, options.domainsDir!)
        const i18nEnabled = options.i18n !== false
        const i18nOpts = options.i18n || {}
        const detectDuplicates = i18nEnabled && i18nOpts.detectDuplicates !== false

        // Index partagé par tous les sous-modules : un seul parcours disque.
        const scanCache = getDomainScanCache(nuxt, domainsRoot)
        watchDomainTree(nuxt, domainsRoot, scanCache)

        if (
            existsSync(domainsRoot) &&
            (options.naming?.domainNameFormat || detectDuplicates)
        ) {
            const reports = await validateDomainFolderNames({
                domainsRoot,
                domainNameFormat: options.naming?.domainNameFormat,
                domainKeyFormat: resolveDomainKeyFormat(i18nOpts),
                detectDuplicates,
                scanCache,
            })
            reportDiagnostics('domain', reports, options.strict === true)
        }

        const shared = {
            domainsDir: options.domainsDir,
            subDomainsDirName: options.subDomainsDirName,
            strict: options.strict,
            debug: options.debug,
        }

        await installModule(domainPagesModule, {
            ...options.pages,
            ...shared,
        })

        if (i18nEnabled) {
            await installModule(domainI18nModule, {
                ...i18nOpts,
                ...shared,
            })
        }
    },
})
