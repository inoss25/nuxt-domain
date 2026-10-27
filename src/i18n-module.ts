import { defineNuxtModule } from 'nuxt/kit'
import { resolve, relative, isAbsolute, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fileIsUnderRoot, toPosixPath } from './runtime/shared/paths'
import type { DomainI18nOptions } from './runtime/i18n/types'
import {
    generateLocales,
    collectLocaleCodesFromNuxt,
    type NuxtI18nHost,
} from './runtime/i18n/generate-locales'
import {
    getDomainConfigCache,
    isDomainConfigDependency,
} from './runtime/shared/config-loader'
import { createDebugLog, logger } from './runtime/shared/logger'
import {
    getDomainScanCache,
    resolveWatchPath,
    watchDomainTree,
} from './runtime/shared/scan'

function shouldRegenerateFromWatch(
    absPath: string,
    outputDir: string,
    domainsRoot: string,
    sharedRoots: string[]
): boolean {
    if (fileIsUnderRoot(absPath, outputDir)) return false

    if (fileIsUnderRoot(absPath, domainsRoot)) {
        const rel = toPosixPath(relative(domainsRoot, absPath))
        if (rel.endsWith('domain.config.ts')) return true
        if (rel.endsWith('.json') && /(^|\/)i18n\//.test(rel)) return true
    }

    for (const root of sharedRoots) {
        if (fileIsUnderRoot(absPath, root) && absPath.endsWith('.json'))
            return true
    }

    return false
}

export default defineNuxtModule<DomainI18nOptions>({
    meta: {
        name: 'domain-i18n',
        configKey: 'domainI18n',
    },

    defaults: {
        domainsDir: 'app/domains',
        sharedI18nDirs: ['app/shared/i18n'],
        sharedMessagesNamespace: 'global',
        outputDir: 'i18n/locales',
        subDomainsDirName: 'domains',
        domainSegmentKeyFormat: 'snake_case',
        strict: false,
        watchSourcesInDev: true,
        watchDebounceMs: 250,
        debug: false,
    },

    async setup(options, nuxt) {
        const rootDir = nuxt.options.rootDir
        const domainsRoot = resolve(rootDir, options.domainsDir!)
        const outputDir = resolve(rootDir, options.outputDir!)
        const debugLog = createDebugLog(options.debug)
        const moduleDir = dirname(fileURLToPath(import.meta.url))
        const sharedRuntimeDir = resolve(moduleDir, './runtime/shared')
        const pagesRuntimeDir = resolve(moduleDir, './runtime/pages')

        const i18nHost = nuxt as unknown as NuxtI18nHost
        i18nHost.options.i18n ??= {}
        const i18nOpts = i18nHost.options.i18n
        if (i18nOpts.langDir === undefined) {
            const i18nDirName =
                typeof i18nOpts.dir === 'string' ? i18nOpts.dir : 'i18n'
            const i18nBase = isAbsolute(i18nDirName)
                ? i18nDirName
                : resolve(rootDir, i18nDirName)
            const rel = relative(i18nBase, outputDir).replace(/\\/g, '/')
            i18nOpts.langDir = rel && !rel.startsWith('..') ? rel : 'locales'
        }

        const typedI18nFile = resolve(outputDir, 'typed-i18n.d.ts')
        nuxt.hook('prepare:types', ({ references }) => {
            references.push({ path: typedI18nFile })
        })

        const configCache = getDomainConfigCache(nuxt)
        const scanCache = getDomainScanCache(nuxt, domainsRoot)
        watchDomainTree(nuxt, domainsRoot, scanCache)

        // Les locales configurées (et la locale par défaut) influencent la sortie :
        // si un autre module les modifie après notre setup, il faut régénérer.
        const localesSignature = () =>
            `${i18nHost.options.i18n?.defaultLocale ?? ''}|${[
                ...collectLocaleCodesFromNuxt(i18nHost),
            ]
                .sort()
                .join(',')}`

        let generatedWith = ''
        let dirty = false

        const runGenerate = async () => {
            dirty = false
            generatedWith = localesSignature()
            return generateLocales({
                rootDir,
                domainsRoot,
                outputDir,
                options,
                nuxt: i18nHost,
                sharedRuntimeDir,
                pagesRuntimeDir,
                debugLog,
                configCache,
                scanCache,
            })
        }

        await runGenerate()

        // Déjà généré au setup : on ne refait le travail que si une source a
        // changé depuis (watcher) ou si les locales configurées ont bougé.
        nuxt.hook('build:before', async () => {
            if (!dirty && generatedWith === localesSignature()) {
                debugLog('⏩ [domain-i18n] build:before — already up to date')
                return
            }
            await runGenerate()
        })

        const watchEnabled =
            nuxt.options.dev && options.watchSourcesInDev !== false
        if (watchEnabled) {
            const sharedRootsAbs = (options.sharedI18nDirs ?? []).map((d) =>
                resolve(rootDir, d)
            )
            const debounceMs = options.watchDebounceMs ?? 250
            let debounceTimer: ReturnType<typeof setTimeout> | null = null

            const scheduleGenerate = () => {
                dirty = true
                if (debounceTimer) clearTimeout(debounceTimer)
                debounceTimer = setTimeout(() => {
                    debounceTimer = null
                    void runGenerate().catch((err) => {
                        logger.error(
                            '[domain-i18n] Failed to regenerate locales (watch):',
                            err
                        )
                    })
                }, debounceMs)
            }

            nuxt.hook('builder:watch', (_event, rawPath) => {
                const absPath = resolveWatchPath(nuxt.options.srcDir, rawPath)
                if (
                    !shouldRegenerateFromWatch(
                        absPath,
                        outputDir,
                        domainsRoot,
                        sharedRootsAbs
                    ) &&
                    !isDomainConfigDependency(configCache, absPath)
                ) {
                    return
                }
                debugLog('👁️ [domain-i18n] watch → regenerating', {
                    file: relative(rootDir, absPath),
                })
                scheduleGenerate()
            })
        }
    },
})
