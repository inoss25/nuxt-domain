import {
    defineNuxtModule,
    extendPages,
    addComponentsDir,
    addLayout,
    addImportsDir,
} from 'nuxt/kit'
import { resolve, relative, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DomainPagesOptions, DomainRouteDocOptions } from './runtime/pages/types'
import { loadDomainConfigs } from './runtime/pages/config-loader'
import {
    getDomainConfigCache,
    isDomainConfigDependency,
} from './runtime/shared/config-loader'
import { createDebugLog, logger } from './runtime/shared/logger'
import { toPosixPath } from './runtime/shared/paths'
import {
    getDomainScanCache,
    getDomainTreeScan,
    requiresRestart,
    resolveWatchPath,
    watchDomainTree,
    type DomainTreeScan,
} from './runtime/shared/scan'
import { generateDomainRoutes } from './runtime/pages/route-generator'
import {
    normalizeDomainParts,
    isIgnoredDomainPath,
    toNuxtLayoutName,
} from './runtime/pages/utils'
import { getDomainPublicAssets } from './runtime/pages/public-assets'
import { writeRouteDoc } from './runtime/pages/route-doc'
import {
    fileIsUnderRoot,
    isDomainPageRelativePath,
    refreshDomainPages,
} from './runtime/pages/dev-watch'

/**
 * `nitro:config` n'est typé qu'à travers `@nuxt/nitro-server` sous Nuxt 4 :
 * on déclare la seule partie utilisée pour rester compatible Nuxt 3 et 4.
 */
interface NitroConfigHookable {
    hook(
        name: 'nitro:config',
        fn: (config: {
            publicAssets?: ReturnType<typeof getDomainPublicAssets>
        }) => void
    ): void
}

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

function registerDomainAutoImports(
    domainsRoot: string,
    scan: DomainTreeScan,
    domainConfigs: Awaited<ReturnType<typeof loadDomainConfigs>>,
    options: DomainPagesOptions,
    debugLog: (...args: unknown[]) => void
): string[] {
    const foundDirs = scan.autoImportDirs
    const foundLayouts = scan.layoutFiles

    const byKind: Record<string, string[]> = {
        components: [],
        composables: [],
        public: [],
        stores: [],
        utils: [],
    }
    for (const dir of foundDirs) byKind[basename(dir)]?.push(dir)

    const componentDirs = byKind.components!
    const composableDirs = byKind.composables!
    const storeDirs = byKind.stores!
    const utilDirs = byKind.utils!

    for (const dir of componentDirs) {
        addComponentsDir({
            path: resolve(domainsRoot, dir),
            pathPrefix: false,
        })
    }
    for (const file of foundLayouts) {
        const domainPath =
            dirname(file).split(/[\\/]layouts(?:[\\/]|$)/)[0] ?? ''
        const rawDomainParts = domainPath.split(/[\\/]/).filter(Boolean)
        if (isIgnoredDomainPath(rawDomainParts)) continue
        const domainId = normalizeDomainParts(
            domainConfigs,
            options,
            rawDomainParts,
            debugLog
        ).join('/')
        const layoutPath = file.split(/[\\/]layouts[\\/]/).at(-1) ?? ''
        addLayout(
            resolve(domainsRoot, file),
            toNuxtLayoutName(domainId, layoutPath)
        )
    }
    for (const dir of [...composableDirs, ...storeDirs, ...utilDirs]) {
        addImportsDir(resolve(domainsRoot, dir))
    }
    return byKind.public!
}

export default defineNuxtModule<DomainPagesOptions>({
    meta: {
        name: 'domain-pages',
        configKey: 'domainPages',
    },

    defaults: {
        domainsDir: 'app/domains',
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
        const debugLog = createDebugLog(options.debug)

        const routeDocResolved = resolveRouteDoc(options)
        const moduleDir = dirname(fileURLToPath(import.meta.url))
        const sharedRuntimeDir = resolve(moduleDir, './runtime/shared')
        const pagesRuntimeDir = resolve(moduleDir, './runtime/pages')

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

        // Cache partagé avec le module i18n : les domain.config.ts ne sont
        // chargés qu'une fois tant qu'ils ne changent pas.
        const configCache = getDomainConfigCache(nuxt)
        // Index de l'arborescence partagé avec les autres modules ; enregistré
        // avant notre propre hook `builder:watch` pour être à jour quand il s'exécute.
        const scanCache = getDomainScanCache(nuxt, domainsRoot)
        watchDomainTree(nuxt, domainsRoot, scanCache)

        let domainConfigs = await loadDomainConfigs(
            domainsRoot,
            options,
            sharedRuntimeDir,
            pagesRuntimeDir,
            debugLog,
            configCache,
            scanCache
        )

        const domainPublicDirs = registerDomainAutoImports(
            domainsRoot,
            await getDomainTreeScan(domainsRoot, scanCache),
            domainConfigs,
            options,
            debugLog
        )

        // Lu au moment où Nitro est configuré (configs à jour) plutôt que figé au setup.
        const nitroHooks = nuxt as unknown as NitroConfigHookable
        nitroHooks.hook('nitro:config', (nitroConfig) => {
            nitroConfig.publicAssets ??= []
            nitroConfig.publicAssets.push(
                ...getDomainPublicAssets(
                    domainsRoot,
                    domainPublicDirs,
                    domainConfigs,
                    options,
                    debugLog
                )
            )
        })

        extendPages(async (pages) => {
            const { routeMap, allRouteNames, entries } = await generateDomainRoutes(
                domainsRoot,
                domainConfigs,
                options,
                debugLog,
                scanCache
            )

            for (const route of routeMap.values()) {
                pages.push(route)
            }

            debugLog('📊 [domain-pages] Total routes:', routeMap.size)

            writeRouteDoc({
                rootDir,
                routeDoc: routeDocResolved,
                routeMap,
                allRouteNames,
                entries,
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
                            debugLog('👁️ [domain-pages] regenerating routes', {
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
                                scanCache,
                            })
                        })
                        .catch((err) => {
                            logger.error(
                                '[domain-pages] Failed to regenerate routes:',
                                err instanceof Error ? err.message : err
                            )
                        })
                }, debounceMs)
            }

            nuxt.hook('builder:watch', async (event, rawPath) => {
                const absPath = resolveWatchPath(nuxt.options.srcDir, rawPath)
                const rel = toPosixPath(relative(domainsRoot, absPath))

                // `domain.config.ts` ou fichier qu'il importe (éventuellement hors des domaines).
                if (
                    (fileIsUnderRoot(absPath, domainsRoot) &&
                        rel.endsWith('domain.config.ts')) ||
                    isDomainConfigDependency(configCache, absPath)
                ) {
                    domainConfigs = await loadDomainConfigs(
                        domainsRoot,
                        options,
                        sharedRuntimeDir,
                        pagesRuntimeDir,
                        debugLog,
                        configCache,
                        scanCache
                    )
                    enqueueRefresh('domain.config', absPath)
                    return
                }

                if (!fileIsUnderRoot(absPath, domainsRoot)) return

                // Auto-imports, layouts et `public/` ne sont enregistrés qu'au setup.
                if (
                    !scanCache.restartRequested &&
                    requiresRestart(domainsRoot, event, absPath)
                ) {
                    scanCache.restartRequested = true
                    logger.info(
                        `[domain-pages] New source detected (${basename(absPath)}) — restarting Nuxt`
                    )
                    await nuxt.callHook('restart')
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
