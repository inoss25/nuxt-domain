import fg from 'fast-glob'
import { createJiti } from 'jiti'
import { resolve } from 'node:path'
import type { DomainConfigPathFields, DomainPathsOptions } from './types'
import { isIgnoredDomainPath, normalizeDomainParts, toPosixPath } from './paths'

export interface LoadDomainConfigsResult<T> {
    configs: Map<string, T>
    failedCount: number
}

export interface LoadDomainConfigsParams<T extends DomainConfigPathFields> {
    domainsRoot: string
    options: DomainPathsOptions
    /** Chemin absolu vers `shared/runtime` (alias `#domain-shared`). */
    sharedRuntimeDir: string
    /** Chemin absolu vers `pages/runtime` (alias `#domain-pages`). */
    pagesRuntimeDir: string
    moduleLabel: string
    debugLog?: (...args: unknown[]) => void
    onConfigLoaded?: (ctx: {
        file: string
        domainId: string
        config: T
    }) => void
}

/**
 * Charge tous les `domain.config.ts` trouvés sous `domainsRoot`.
 * Les configs sont triées par profondeur (les plus hautes d'abord) pour
 * permettre la normalisation correcte des chemins de sous-domaines.
 */
export async function loadDomainConfigs<T extends DomainConfigPathFields>(
    params: LoadDomainConfigsParams<T>
): Promise<LoadDomainConfigsResult<T>> {
    const {
        domainsRoot,
        options,
        sharedRuntimeDir,
        pagesRuntimeDir,
        moduleLabel,
        debugLog,
        onConfigLoaded,
    } = params

    const domainConfigs = new Map<string, T>()
    let failedCount = 0

    const importDomainConfig = createJiti(import.meta.url, {
        alias: {
            '#domain-shared': sharedRuntimeDir,
            '#domain-pages': pagesRuntimeDir,
        },
        interopDefault: true,
        moduleCache: false,
    })

    const configFiles = await fg('**/domain.config.ts', {
        cwd: domainsRoot,
        ignore: ['**/_*/**'],
    })

    const sortedConfigFiles = configFiles
        .map((f) => ({
            f,
            depth: toPosixPath(f).split('/').filter(Boolean).length,
        }))
        .sort((a, b) => a.depth - b.depth)

    for (const { f: file } of sortedConfigFiles) {
        const posix = toPosixPath(file)
        const parts = posix.split('/').filter(Boolean)
        if (parts.length < 2) continue
        const rawParts = parts.slice(0, -1)
        if (isIgnoredDomainPath(rawParts)) continue

        const normalizedParts = normalizeDomainParts(
            domainConfigs,
            options,
            rawParts,
            debugLog,
            moduleLabel
        )
        const domainId = normalizedParts.join('/')

        const absolutePath = resolve(domainsRoot, file)
        try {
            const mod = await importDomainConfig(absolutePath)
            const config = (mod.default ?? mod) as T
            domainConfigs.set(domainId, config)
            onConfigLoaded?.({ file, domainId, config })
            debugLog?.(`🧾 [${moduleLabel}] domain.config`, { file, domainId })
        } catch (err) {
            failedCount++
            const message =
                err instanceof Error ? err.message : String(err)
            console.error(
                `❌ [${moduleLabel}] Erreur lors du chargement de "${file}" (domaine: "${domainId}"):\n   ${message}`
            )
        }
    }

    if (failedCount > 0) {
        console.warn(
            `⚠️ [${moduleLabel}] ${failedCount} domain.config.ts n'ont pas pu être chargés — ` +
                'les chemins (routes / i18n) peuvent être incorrects.'
        )
    }

    return { configs: domainConfigs, failedCount }
}
