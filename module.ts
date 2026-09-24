import { defineNuxtModule, installModule } from 'nuxt/kit'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reportDiagnostics } from './shared/runtime/diagnostics'
import { resolveDomainKeyFormat } from './shared/runtime/naming'
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
        const i18nOpts = options.i18n ?? {}
        const detectDuplicates = i18nOpts.detectDuplicates !== false

        if (
            existsSync(domainsRoot) &&
            (options.naming?.domainNameFormat || detectDuplicates)
        ) {
            const reports = await validateDomainFolderNames({
                domainsRoot,
                domainNameFormat: options.naming?.domainNameFormat,
                domainKeyFormat: resolveDomainKeyFormat(i18nOpts),
                detectDuplicates,
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

        await installModule(resolve(moduleDir, './i18n/index.ts'), {
            ...options.i18n,
            ...shared,
        })
    },
})
