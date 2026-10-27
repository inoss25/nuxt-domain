import { defineNuxtModule, installModule } from 'nuxt/kit'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reportDiagnostics } from './shared/runtime/diagnostics'
import { resolveDomainKeyFormat } from './shared/runtime/naming'
import { getDomainScanCache, watchDomainTree } from './shared/runtime/scan'
import { validateDomainFolderNames } from './shared/runtime/validate-domain-names'
import type { DomainModuleOptions } from './types'

const moduleDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtModule<DomainModuleOptions>({
    meta: {
        name: 'domain',
        configKey: 'domain',
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

        await installModule(resolve(moduleDir, './pages/index.ts'), {
            ...options.pages,
            ...shared,
        })

        if (i18nEnabled) {
            await installModule(resolve(moduleDir, './i18n/index.ts'), {
                ...i18nOpts,
                ...shared,
            })
        }
    },
})
