import { createJiti } from 'jiti'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { DomainConfigPathFields, DomainPathsOptions } from './types'
import { isIgnoredDomainPath, normalizeDomainParts, toPosixPath } from './paths'
import { getDomainTreeScan, type DomainScanCache } from './scan'
import { logger } from './logger'

export interface LoadDomainConfigsResult<T> {
    configs: Map<string, T>
    failedCount: number
}

/** Résultat brut de l'import d'un `domain.config.ts` (mis en cache). */
type RawConfigEntry =
    | { ok: true; config: unknown }
    | { ok: false; message: string }

/**
 * Cache partagé entre les modules (pages, i18n…) pour ne charger les
 * `domain.config.ts` qu'une seule fois tant qu'ils n'ont pas changé.
 *
 * Validité : empreinte `chemin:mtime:taille` de chaque `domain.config.ts` et
 * des fichiers qu'ils importent (`ownedModules`, relevés au chargement
 * précédent). `invalidateDomainConfigCache` force un rechargement complet.
 */
export interface DomainConfigCache {
    signature: string | null
    entries: Map<string, RawConfigEntry>
    /** Modules utilisateur chargés par notre jiti, évincés au rechargement suivant. */
    ownedModules: string[]
}

export function createDomainConfigCache(): DomainConfigCache {
    return { signature: null, entries: new Map(), ownedModules: [] }
}

const cachesByOwner = new WeakMap<object, DomainConfigCache>()

/**
 * Un cache par instance Nuxt : un redémarrage de Nuxt dans le même processus
 * (changement de `nuxt.config`) repart d'un cache vide.
 */
export function getDomainConfigCache(owner: object): DomainConfigCache {
    let cache = cachesByOwner.get(owner)
    if (!cache) {
        cache = createDomainConfigCache()
        cachesByOwner.set(owner, cache)
    }
    return cache
}

/**
 * Vrai si `file` a été chargé lors de l'import des `domain.config.ts`
 * (la config elle-même ou un fichier qu'elle importe).
 */
export function isDomainConfigDependency(
    cache: DomainConfigCache,
    file: string
): boolean {
    const target = toPosixPath(file)
    return cache.ownedModules.some((key) => toPosixPath(key) === target)
}

export function invalidateDomainConfigCache(cache: DomainConfigCache): void {
    cache.signature = null
    cache.entries = new Map()
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
    /**
     * Cache partagé (voir `getDomainConfigCache`). Sans cache, chaque appel
     * ré-évalue tout (comportement d'origine, aucun état conservé).
     */
    cache?: DomainConfigCache
    /** Index partagé de l'arborescence (voir `getDomainScanCache`). */
    scanCache?: DomainScanCache
}

type JitiModuleCache = Record<string, unknown>

const isUnder = (file: string, dir: string) => {
    const d = toPosixPath(dir).replace(/\/$/, '')
    return toPosixPath(file).startsWith(`${d}/`)
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
        cache,
        scanCache,
    } = params

    const domainConfigs = new Map<string, T>()
    let failedCount = 0

    const { configFiles } = await getDomainTreeScan(domainsRoot, scanCache)

    // Ordre déterministe (profondeur, puis chemin) : l'empreinte du cache en dépend.
    const sortedConfigFiles = configFiles
        .map((f) => ({
            f,
            depth: toPosixPath(f).split('/').filter(Boolean).length,
        }))
        .sort((a, b) => a.depth - b.depth || (a.f < b.f ? -1 : a.f > b.f ? 1 : 0))

    let entries: Map<string, RawConfigEntry> | undefined

    const stampFile = async (label: string, absolutePath: string) => {
        try {
            const s = await stat(absolutePath)
            return `${label}:${s.mtimeMs}:${s.size}`
        } catch {
            return `${label}:missing`
        }
    }
    const configPaths = new Set(
        sortedConfigFiles.map(({ f }) => toPosixPath(resolve(domainsRoot, f)))
    )
    const computeSignature = async (dependencies: string[]) => {
        const stamps = await Promise.all([
            ...sortedConfigFiles.map(({ f }) =>
                stampFile(f, resolve(domainsRoot, f))
            ),
            // Les configs elles-mêmes figurent aussi parmi les modules chargés.
            ...dependencies
                .filter((dep) => !configPaths.has(toPosixPath(dep)))
                .map((dep) => stampFile(dep, dep)),
        ])
        return [domainsRoot, sharedRuntimeDir, pagesRuntimeDir, ...stamps].join(
            '\n'
        )
    }

    if (cache) {
        if (cache.signature === (await computeSignature(cache.ownedModules))) {
            entries = cache.entries
            debugLog?.(`⚡ [${moduleLabel}] domain.config cached`, {
                count: entries.size,
            })
        }
    }

    if (!entries) {
        entries = new Map()

        // Avec un cache, jiti garde en mémoire le runtime (#domain-pages…) au lieu
        // de le ré-évaluer pour chacune des N configs. Le cache de jiti étant global
        // au processus, on évince nous-mêmes les modules utilisateur qu'on a chargés.
        const importDomainConfig = createJiti(import.meta.url, {
            alias: {
                '#domain-shared': sharedRuntimeDir,
                '#domain-pages': pagesRuntimeDir,
            },
            interopDefault: true,
            moduleCache: Boolean(cache),
        })
        const jitiCache = (importDomainConfig as unknown as {
            cache?: JitiModuleCache
        }).cache

        if (cache && jitiCache) {
            for (const key of cache.ownedModules) delete jitiCache[key]
        }
        const before = new Set(cache && jitiCache ? Object.keys(jitiCache) : [])

        for (const { f: file } of sortedConfigFiles) {
            const parts = toPosixPath(file).split('/').filter(Boolean)
            if (parts.length < 2 || isIgnoredDomainPath(parts.slice(0, -1))) {
                continue
            }
            const absolutePath = resolve(domainsRoot, file)
            try {
                const mod = await importDomainConfig(absolutePath)
                entries.set(file, {
                    ok: true,
                    config: (mod as { default?: unknown }).default ?? mod,
                })
            } catch (err) {
                entries.set(file, {
                    ok: false,
                    message: err instanceof Error ? err.message : String(err),
                })
            }
        }

        if (cache) {
            if (jitiCache) {
                cache.ownedModules = Object.keys(jitiCache).filter(
                    (key) =>
                        !before.has(key) &&
                        !key.includes('node_modules') &&
                        !isUnder(key, sharedRuntimeDir) &&
                        !isUnder(key, pagesRuntimeDir)
                )
            }
            // Les dépendances viennent d'être relevées : l'empreinte doit les inclure.
            cache.signature = await computeSignature(cache.ownedModules)
            cache.entries = entries
        }
    }

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

        const entry = entries.get(file)
        if (entry?.ok) {
            const config = entry.config as T
            domainConfigs.set(domainId, config)
            onConfigLoaded?.({ file, domainId, config })
            debugLog?.(`🧾 [${moduleLabel}] domain.config`, { file, domainId })
        } else {
            failedCount++
            logger.error(
                `[${moduleLabel}] Failed to load "${file}" (domain: "${domainId}"):\n   ${entry?.message ?? 'unknown error'}`
            )
        }
    }

    if (failedCount > 0) {
        logger.warn(
            `[${moduleLabel}] ${failedCount} domain.config.ts file(s) could not be loaded — ` +
                'generated paths (routes / i18n) may be incorrect.'
        )
    }

    return { configs: domainConfigs, failedCount }
}
