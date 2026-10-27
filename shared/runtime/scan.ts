import fg from 'fast-glob'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileIsUnderRoot, toPosixPath } from './paths'

/** Dossiers enregistrés en auto-import (ou en assets publics) pour chaque domaine. */
export const AUTO_IMPORT_DIR_KINDS = [
    'components',
    'composables',
    'public',
    'stores',
    'utils',
] as const

/** Fichiers sous `domainsRoot`, classés par usage (chemins relatifs POSIX triés). */
export interface DomainTreeScan {
    configFiles: string[]
    pageFiles: string[]
    layoutFiles: string[]
    i18nFiles: string[]
    autoImportDirs: string[]
}

/**
 * Un seul parcours disque partagé par tous les modules (pages, i18n, validation).
 * En dev, l'index est tenu à jour par les événements du watcher au lieu d'être
 * reconstruit à chaque régénération.
 */
export interface DomainScanCache {
    /** Entrées relatives ; les dossiers se terminent par `/`. `null` = à scanner. */
    entries: Set<string> | null
    /** Scan disque en cours (partagé par les appels concurrents). */
    pending: Promise<Set<string>> | null
    scan: DomainTreeScan | null
    /** Vrai une fois `watchDomainTree` branché sur cette instance. */
    watched: boolean
    /**
     * Faux si plus rien ne garantit la fraîcheur de l'index (dev hors du
     * `srcDir` surveillé par Nuxt) : chaque lecture refait alors un scan.
     */
    persistent: boolean
    restartRequested: boolean
}

export function createDomainScanCache(): DomainScanCache {
    return {
        entries: null,
        pending: null,
        scan: null,
        watched: false,
        persistent: true,
        restartRequested: false,
    }
}

const cachesByOwner = new WeakMap<object, Map<string, DomainScanCache>>()

/** Un cache par instance Nuxt et par racine de domaines. */
export function getDomainScanCache(
    owner: object,
    domainsRoot: string
): DomainScanCache {
    let byRoot = cachesByOwner.get(owner)
    if (!byRoot) {
        byRoot = new Map()
        cachesByOwner.set(owner, byRoot)
    }
    let cache = byRoot.get(domainsRoot)
    if (!cache) {
        cache = createDomainScanCache()
        byRoot.set(domainsRoot, cache)
    }
    return cache
}

export function invalidateDomainScanCache(cache: DomainScanCache): void {
    cache.entries = null
    cache.pending = null
    cache.scan = null
}

// Async : environ deux fois plus rapide que `fg.sync` (lectures parallèles).
async function listEntries(domainsRoot: string): Promise<Set<string>> {
    const found = await fg('**', {
        cwd: domainsRoot,
        onlyFiles: false,
        markDirectories: true,
        ignore: ['**/_*/**', '**/node_modules/**'],
    })
    return new Set(found)
}

/** Range les entrées dans les mêmes catégories que les anciens globs dédiés. */
export function classifyDomainEntries(entries: Iterable<string>): DomainTreeScan {
    const scan: DomainTreeScan = {
        configFiles: [],
        pageFiles: [],
        layoutFiles: [],
        i18nFiles: [],
        autoImportDirs: [],
    }
    const kinds = new Set<string>(AUTO_IMPORT_DIR_KINDS)

    for (const entry of entries) {
        const isDir = entry.endsWith('/')
        const parts = (isDir ? entry.slice(0, -1) : entry).split('/')
        const name = parts[parts.length - 1]!
        const dirs = parts.slice(0, -1)

        if (isDir) {
            // `**/components` & co, hors `**/pages/**`
            if (kinds.has(name) && !dirs.includes('pages')) {
                scan.autoImportDirs.push(entry.slice(0, -1))
            }
            continue
        }

        if (name === 'domain.config.ts') {
            scan.configFiles.push(entry)
        } else if (name.endsWith('.vue')) {
            if (dirs.includes('pages')) scan.pageFiles.push(entry)
            if (dirs.includes('layouts') && !dirs.includes('pages')) {
                scan.layoutFiles.push(entry)
            }
        } else if (name.endsWith('.json') && dirs.includes('i18n')) {
            scan.i18nFiles.push(entry)
        }
    }

    for (const list of Object.values(scan)) list.sort()
    return scan
}

/** Retourne l'index classé, en ne parcourant le disque que si nécessaire. */
export async function getDomainTreeScan(
    domainsRoot: string,
    cache?: DomainScanCache
): Promise<DomainTreeScan> {
    if (!cache || !cache.persistent) {
        return classifyDomainEntries(await listEntries(domainsRoot))
    }
    if (!cache.entries) {
        const pending = (cache.pending ??= listEntries(domainsRoot))
        const entries = await pending
        // Une invalidation pendant le scan l'emporte : on ne réinstalle pas un résultat périmé.
        if (cache.pending !== pending) return getDomainTreeScan(domainsRoot, cache)
        cache.pending = null
        cache.entries = entries
        cache.scan = null
    }
    cache.scan ??= classifyDomainEntries(cache.entries)
    return cache.scan
}

/** Mêmes exclusions que le glob initial (`**\/_*\/**`, dotfiles, node_modules). */
function isScannable(parts: string[], isDir: boolean): boolean {
    const dirs = isDir ? parts : parts.slice(0, -1)
    if (dirs.some((p) => p.startsWith('_') || p === 'node_modules')) return false
    return !parts.some((p) => p.startsWith('.'))
}

export type DomainWatchEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'

/**
 * Applique un événement du watcher à l'index. Idempotent : plusieurs modules
 * peuvent l'appeler pour le même événement.
 * @returns true si l'index a changé.
 */
export function applyDomainWatchEvent(
    cache: DomainScanCache,
    domainsRoot: string,
    event: DomainWatchEvent,
    absPath: string
): boolean {
    if (!cache.entries || event === 'change') return false
    if (!fileIsUnderRoot(absPath, domainsRoot)) return false

    const rel = toPosixPath(relative(domainsRoot, absPath))
    const isDir = event === 'addDir' || event === 'unlinkDir'
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0 || !isScannable(parts, isDir)) return false

    const entries = cache.entries
    const key = isDir ? `${rel}/` : rel
    const sizeBefore = entries.size

    if (event === 'add' || event === 'addDir') {
        // Les dossiers parents peuvent arriver après leurs fichiers.
        for (let i = 1; i < parts.length; i++) {
            entries.add(`${parts.slice(0, i).join('/')}/`)
        }
        entries.add(key)
    } else if (event === 'unlink') {
        entries.delete(key)
    } else {
        for (const entry of [...entries]) {
            if (entry.startsWith(key)) entries.delete(entry)
        }
    }

    if (entries.size === sizeBefore) return false
    cache.scan = null
    return true
}

interface WatchableNuxt {
    options: { dev: boolean; srcDir: string }
    hook(
        name: 'builder:watch',
        fn: (event: DomainWatchEvent, path: string) => void
    ): unknown
    hook(name: 'modules:done', fn: () => void): unknown
}

export function resolveWatchPath(srcDir: string, rawPath: string): string {
    return isAbsolute(rawPath) ? rawPath : resolve(srcDir, rawPath)
}

/**
 * Tient l'index à jour en dev. À appeler avant d'enregistrer d'autres hooks
 * `builder:watch` qui lisent le scan (les hooks s'exécutent dans l'ordre).
 */
export function watchDomainTree(
    nuxt: WatchableNuxt,
    domainsRoot: string,
    cache: DomainScanCache
): void {
    if (!nuxt.options.dev || cache.watched) return
    cache.watched = true

    const rel = relative(nuxt.options.srcDir, domainsRoot)
    if (rel.startsWith('..') || isAbsolute(rel)) {
        // Le watcher de Nuxt ne voit pas ce dossier : l'index ne sert qu'au setup.
        nuxt.hook('modules:done', () => {
            cache.persistent = false
            invalidateDomainScanCache(cache)
        })
        return
    }

    nuxt.hook('builder:watch', (event, rawPath) => {
        applyDomainWatchEvent(
            cache,
            domainsRoot,
            event,
            resolveWatchPath(nuxt.options.srcDir, rawPath)
        )
    })
}

/**
 * Vrai si l'événement touche une source enregistrée seulement au setup
 * (dossier d'auto-import, layout, `public/`) : Nuxt doit redémarrer.
 */
export function requiresRestart(
    domainsRoot: string,
    event: DomainWatchEvent,
    absPath: string
): boolean {
    if (event === 'change') return false
    if (!fileIsUnderRoot(absPath, domainsRoot)) return false
    const rel = toPosixPath(relative(domainsRoot, absPath))
    const isDir = event === 'addDir' || event === 'unlinkDir'
    const parts = rel.split('/').filter(Boolean)
    if (!isScannable(parts, isDir)) return false
    const scan = classifyDomainEntries([isDir ? `${rel}/` : rel])
    return isDir ? scan.autoImportDirs.length > 0 : scan.layoutFiles.length > 0
}
