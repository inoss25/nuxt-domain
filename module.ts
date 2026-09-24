import { defineNuxtModule, installModule } from 'nuxt/kit'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
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
        pages: {},
        i18n: {},
    },

    async setup(options, _nuxt) {
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
