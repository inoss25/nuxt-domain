import {
    defineNuxtModule,
    extendPages,
    addComponentsDir,
    addImportsDir,
} from 'nuxt/kit'
import fg from 'fast-glob'
import { resolve, relative, isAbsolute, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DomainPagesOptions, DomainRouteDocOptions } from './runtime/types'
import { loadDomainConfigs } from './runtime/config-loader'
import { generateDomainRoutes } from './runtime/route-generator'
import { writeRouteDoc } from './runtime/route-doc'
import {
    fileIsUnderRoot,
    isDomainPageRelativePath,
    refreshDomainPages,
} from './runtime/dev-watch'

const toPosixPath = (p: string) => p.replace(/\\/g, '/')

const AUTO_IMPORT_IGNORE = ['**/pages/**', '**/_*/**'] as const

function resolveRouteDoc(options: DomainPagesOptions): {
    enabled: boolean
    outDir: string
    fileName: string
} {
    const raw = options.routeDoc
    if (raw === false)
        return { enabled: false, outDir: '', fileName: 'route.md' }
    const r: DomainRouteDocOptions =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? raw
            : { enabled: true, outDir: '.nuxt/domain-pages', fileName: 'route.md' }
    return {
        enabled: r.enabled !== false,
        outDir: (r.outDir ?? '.nuxt/domain-pages').replace(/\\/g, '/'),
        fileName: r.fileName ?? 'route.md',
    }
}

function isWatchEnabled(options: DomainPagesOptions, nuxtDev: boolean): boolean {
    if (!nuxtDev) return false
    if (options.watchSourcesInDev === false) return false
    if (
        options.watchSourcesInDev === undefined &&
        options.watchDomainConfigInDev === false
    ) {
        return false
    }
    return true
}

async function registerDomainAutoImports(
    domainsRoot: string,
    addComponent: typeof addComponentsDir,
    addImport: typeof addImportsDir
) {
    const scan = (pattern: string) =>
        fg(pattern, {
            cwd: domainsRoot,
            onlyDirectories: true,
            ignore: [...AUTO_IMPORT_IGNORE],
        })

    const [componentDirs, composableDirs, layoutDirs, storeDirs, utilDirs] =
        await Promise.all([
            scan('**/components'),
            scan('**/composables'),
            scan('**/layouts'),
            scan('**/stores'),
            scan('**/utils'),
        ])

    for (const dir of componentDirs) {
        addComponent({
            path: resolve(domainsRoot, dir),
            pathPrefix: false,
        })
    }
    for (const dir of layoutDirs) {
        addComponent({
            path: resolve(domainsRoot, dir),
            pathPrefix: false,
            prefix: '',
        })
    }
    for (const dir of [...composableDirs, ...storeDirs, ...utilDirs]) {
        addImport(resolve(domainsRoot, dir))
    }
}

export default defineNuxtModule<DomainPagesOptions>({
    meta: {
        name: 'domain-pages',
        configKey: 'domainPages',
    },

    defaults: {
        domainsDir: 'app/domains',
        noPrefixDomains: [],
        childrenDirName: 'children',
        subDomainsDirName: 'domains',
        strict: false,
        debug: false,
        watchDomainConfigInDev: true,
        watchPagesInDev: true,
        watchSourcesInDev: true,
        watchDebounceMs: 250,
        routeDoc: {
            enabled: true,
            outDir: '.nuxt/domain-pages',
            fileName: 'route.md',
        },
    },

    async setup(options, nuxt) {
        const rootDir = nuxt.options.rootDir
        const domainsRoot = resolve(rootDir, options.domainsDir!)
        const debug = options.debug ?? false
        const debugLog = (...args: unknown[]) => {
            if (debug) console.log(...args)
        }

        if (options.noPrefixDomains && options.noPrefixDomains.length > 0) {
            console.warn(
                '⚠️  [domain-pages] `noPrefixDomains` est déconseillé. ' +
                    'Utilisez `noPrefix: true` dans le `domain.config.ts` de chaque domaine concerné.'
            )
        }

        const routeDocResolved = resolveRouteDoc(options)
        const moduleDir = dirname(fileURLToPath(import.meta.url))
        const sharedRuntimeDir = resolve(moduleDir, '../shared/runtime')
        const pagesRuntimeDir = resolve(moduleDir, 'runtime')

        nuxt.options.alias['#domain-shared'] = sharedRuntimeDir
        nuxt.options.alias['#domain-pages'] = pagesRuntimeDir

        const typedRouterFile = resolve(
            rootDir,
            routeDocResolved.outDir,
            'typed-router.d.ts'
        )
        nuxt.hook('prepare:types', ({ references }) => {
            references.push({ path: typedRouterFile })
        })

        let domainConfigs = (
            await loadDomainConfigs(
                domainsRoot,
                options,
                sharedRuntimeDir,
                pagesRuntimeDir,
                debugLog
            )
        )

        await registerDomainAutoImports(
            domainsRoot,
            addComponentsDir,
            addImportsDir
        )

        extendPages(async (pages) => {
            const { routeMap, allRouteNames } = await generateDomainRoutes(
                domainsRoot,
                domainConfigs,
                options,
                debugLog
            )

            for (const route of routeMap.values()) {
                pages.push(route)
            }

            if (debug) {
                debugLog(
                    '📊 [domain-pages] Total de routes:',
                    routeMap.size
                )
            }

            writeRouteDoc({
                rootDir,
                routeDoc: routeDocResolved,
                routeMap,
                allRouteNames,
                debugLog,
            })
        })

        if (isWatchEnabled(options, nuxt.options.dev)) {
            const watchPages = options.watchPagesInDev !== false
            const debounceMs = options.watchDebounceMs ?? 250
            let debounceTimer: ReturnType<typeof setTimeout> | null = null
            let refreshQueue: Promise<void> = Promise.resolve()

            const enqueueRefresh = (reason: string, absPath: string) => {
                if (debounceTimer) clearTimeout(debounceTimer)
                debounceTimer = setTimeout(() => {
                    debounceTimer = null
                    refreshQueue = refreshQueue
                        .then(async () => {
                            debugLog('👁️ [domain-pages] régénération routes', {
                                reason,
                                file: relative(rootDir, absPath),
                            })
                            await refreshDomainPages({
                                nuxt,
                                rootDir,
                                domainsRoot,
                                domainConfigs,
                                options,
                                routeDoc: routeDocResolved,
                                debugLog,
                            })
                        })
                        .catch((err) => {
                            console.error(
                                '❌ [domain-pages] Échec régénération routes:',
                                err instanceof Error ? err.message : err
                            )
                        })
                }, debounceMs)
            }

            nuxt.hook('builder:watch', async (event, rawPath) => {
                const absPath = isAbsolute(rawPath)
                    ? rawPath
                    : resolve(nuxt.options.srcDir, rawPath)
                if (!fileIsUnderRoot(absPath, domainsRoot)) return

                const rel = toPosixPath(relative(domainsRoot, absPath))

                if (rel.endsWith('domain.config.ts')) {
                    domainConfigs = await loadDomainConfigs(
                        domainsRoot,
                        options,
                        sharedRuntimeDir,
                        pagesRuntimeDir,
                        debugLog
                    )
                    enqueueRefresh('domain.config', absPath)
                    return
                }

                if (!watchPages) return
                if (event !== 'add' && event !== 'unlink') return

                if (isDomainPageRelativePath(rel, nuxt.options.extensions)) {
                    enqueueRefresh(`page:${event}`, absPath)
                }
            })
        }
    },
})
