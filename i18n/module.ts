import { defineNuxtModule } from 'nuxt/kit'
import { resolve, relative, isAbsolute, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fileIsUnderRoot, toPosixPath } from '../shared/runtime/paths'
import type { DomainI18nOptions } from './runtime/types'
import {
    generateLocales,
    collectLocaleCodesFromNuxt,
} from './runtime/generate-locales'
import { getDomainConfigCache } from '../shared/runtime/config-loader'

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
        const debug = options.debug ?? false
        const debugLog = (...args: unknown[]) => {
            if (debug) console.log(...args)
        }
        const moduleDir = dirname(fileURLToPath(import.meta.url))
        const sharedRuntimeDir = resolve(moduleDir, '../shared/runtime')
        const pagesRuntimeDir = resolve(moduleDir, '../pages/runtime')

        if (!nuxt.options.i18n) {
            nuxt.options.i18n = {} as typeof nuxt.options.i18n
        }
        const i18nOpts = nuxt.options.i18n as Record<string, unknown>
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

        // Les locales configurées (et la locale par défaut) influencent la sortie :
        // si un autre module les modifie après notre setup, il faut régénérer.
        const localesSignature = () =>
            `${nuxt.options.i18n?.defaultLocale ?? ''}|${[
                ...collectLocaleCodesFromNuxt(nuxt),
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
                nuxt,
                sharedRuntimeDir,
                pagesRuntimeDir,
                debugLog,
                configCache,
            })
        }

        await runGenerate()

        // Déjà généré au setup : on ne refait le travail que si une source a
        // changé depuis (watcher) ou si les locales configurées ont bougé.
        nuxt.hook('build:before', async () => {
            if (!dirty && generatedWith === localesSignature()) {
                debugLog('⏩ [domain-i18n] build:before — déjà à jour')
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
                        console.error(
                            '[domain-i18n] régénération (watch) échouée:',
                            err
                        )
                    })
                }, debounceMs)
            }

            nuxt.hook('builder:watch', (_event, rawPath) => {
                const absPath = isAbsolute(rawPath)
                    ? rawPath
                    : resolve(nuxt.options.srcDir, rawPath)
                if (
                    !shouldRegenerateFromWatch(
                        absPath,
                        outputDir,
                        domainsRoot,
                        sharedRootsAbs
                    )
                ) {
                    return
                }
                debugLog('👁️ [domain-i18n] watch → régénération', {
                    file: relative(rootDir, absPath),
                })
                scheduleGenerate()
            })
        }
    },
})
