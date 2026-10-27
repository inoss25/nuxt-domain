import { resolve } from 'node:path'
import type { NuxtPage } from '@nuxt/schema'
import { logger } from '../shared/logger'
import { toPosixPath } from '../shared/paths'
import { getDomainTreeScan, type DomainScanCache } from '../shared/scan'
import type { DomainConfig, DomainPagesOptions } from './types'
import {
    normalizeKey,
    toPathSegment,
    cleanName,
    normalizeDomainParts,
    isIgnoredDomainPath,
    toNuxtLayoutName,
    flattenRouteMap,
    type RouteEntry,
} from './utils'
import { detectRouteConflicts, reportRouteConflicts } from './route-conflicts'

const toKebabLower = (s: string) =>
    s
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase()

const toRouteSegment = (seg: string) => {
    const dyn = toPathSegment(seg)
    if (dyn !== seg) return dyn
    return toKebabLower(seg)
}

const toArray = (mw?: string[] | string) => {
    if (!mw) return []
    return Array.isArray(mw) ? mw : [mw]
}

/* ------------------------------------------------------------------ */
/*  Domain settings helpers                                            */
/* ------------------------------------------------------------------ */

function getConfigChain(
    domainConfigs: Map<string, DomainConfig>,
    domainId: string
): Array<{ id: string; config: DomainConfig }> {
    const parts = domainId.split('/').filter(Boolean)
    const chain: Array<{ id: string; config: DomainConfig }> = []
    for (let i = 1; i <= parts.length; i++) {
        const id = parts.slice(0, i).join('/')
        const cfg = domainConfigs.get(id)
        if (cfg) chain.push({ id, config: cfg })
    }
    return chain
}

function isNestedDomainAllowed(
    domainConfigs: Map<string, DomainConfig>,
    domainId: string
): boolean {
    const parts = domainId.split('/').filter(Boolean)
    if (parts.length <= 1) return true
    for (let i = 1; i < parts.length; i++) {
        const parentId = parts.slice(0, i).join('/')
        const parentCfg = domainConfigs.get(parentId)
        if (!parentCfg || parentCfg.hasSubDomains !== true) return false
    }
    return true
}

function getEffectiveDomainSettings(
    domainConfigs: Map<string, DomainConfig>,
    domainId: string
) {
    const chain = getConfigChain(domainConfigs, domainId)

    const enabled = !chain.some(({ config }) => config.enabled === false)
    const noPrefix = chain.some(({ config }) => config.noPrefix === true)
    const hasSubDomains = chain.some(({ config }) => config.hasSubDomains === true)
    const middleware = chain.flatMap(({ config }) => toArray(config.middleware))
    const meta = chain.reduce<Record<string, any>>(
        (acc, { config }) => ({ ...acc, ...(config.meta || {}) }),
        {}
    )

    let routes: DomainConfig['routes'] | undefined
    for (let i = chain.length - 1; i >= 0; i--) {
        const entry = chain[i]
        if (entry?.config.routes) {
            routes = entry.config.routes
            break
        }
    }

    let home: boolean | undefined
    for (let i = chain.length - 1; i >= 0; i--) {
        const entry = chain[i]
        if (entry && typeof entry.config.home === 'boolean') {
            home = entry.config.home
            break
        }
    }

    let layout: DomainConfig['layout']
    for (let i = chain.length - 1; i >= 0; i--) {
        const entry = chain[i]
        if (entry && entry.config.layout !== undefined) {
            layout = entry.config.layout
            break
        }
    }

    return { chain, enabled, noPrefix, hasSubDomains, middleware, meta, routes, home, layout }
}

function getDomainPrefixParts(
    domainConfigs: Map<string, DomainConfig>,
    domainId: string
): string[] {
    const parts = domainId.split('/').filter(Boolean)
    const prefixParts: string[] = []

    for (let i = 0; i < parts.length; i++) {
        const id = parts.slice(0, i + 1).join('/')
        const cfg = domainConfigs.get(id)

        if (cfg?.noPrefix === true) continue
        if (i > 0 && cfg?.prefixSubDomains === false) continue

        const prefix = cfg?.prefix
        const part = parts[i] ?? ''
        const seg = (prefix ?? part).toString()
        prefixParts.push(...seg.split('/').filter(Boolean))
    }

    return prefixParts
}

/* ------------------------------------------------------------------ */
/*  Main route generation                                               */
/* ------------------------------------------------------------------ */

export interface GeneratedRouteMap {
    routeMap: Map<string, NuxtPage>
    /** Collected for typed-router generation */
    allRouteNames: Array<{ path: string; name: string }>
    /** Toutes les routes aplaties (chemin complet, nom, fichier). */
    entries: RouteEntry[]
}

export async function generateDomainRoutes(
    domainsRoot: string,
    domainConfigs: Map<string, DomainConfig>,
    options: DomainPagesOptions,
    debugLog: (...args: any[]) => void,
    /** Index partagé de l'arborescence (voir `getDomainScanCache`). */
    scanCache?: DomainScanCache
): Promise<GeneratedRouteMap> {
    const childrenDirName = options.childrenDirName ?? 'children'

    const files = (await getDomainTreeScan(domainsRoot, scanCache)).pageFiles

    const routeMap = new Map<string, NuxtPage>()
    const childrenMap = new Map<string, NuxtPage[]>()

    // Plusieurs pages appartiennent souvent au même domaine. Ces réglages ne
    // changent pas pendant une génération : les calculer une fois par domaine.
    const domainSettingsCache = new Map<string, ReturnType<typeof getEffectiveDomainSettings>>()
    const domainPrefixCache = new Map<string, string[]>()
    const nestedDomainCache = new Map<string, boolean>()
    const getSettings = (id: string) => {
        let value = domainSettingsCache.get(id)
        if (!value) {
            value = getEffectiveDomainSettings(domainConfigs, id)
            domainSettingsCache.set(id, value)
        }
        return value
    }
    const getPrefixParts = (id: string) => {
        let value = domainPrefixCache.get(id)
        if (!value) {
            value = getDomainPrefixParts(domainConfigs, id)
            domainPrefixCache.set(id, value)
        }
        return value
    }

    let homeRoute: NuxtPage | null = null
    let homeDomain: string | null = null

    debugLog('🔍 [domain-pages] Files found:', files)
    debugLog('📁 [domain-pages] Nombre de fichiers:', files.length)

    for (const file of files) {
        const posix = toPosixPath(file)
        const match = posix.match(/(.+)\/pages\/(.+)\.vue$/)
        if (!match) continue

        const rawDomainPath = match[1]
        const rawPath = match[2]
        if (!rawDomainPath || !rawPath) continue

        const rawDomainParts = rawDomainPath.split('/').filter(Boolean)
        if (isIgnoredDomainPath(rawDomainParts)) continue

        const domainId = normalizeDomainParts(domainConfigs, options, rawDomainParts, debugLog).join('/')
        if (!domainId) continue

        let nestedAllowed = nestedDomainCache.get(domainId)
        if (nestedAllowed === undefined) {
            nestedAllowed = isNestedDomainAllowed(domainConfigs, domainId)
            nestedDomainCache.set(domainId, nestedAllowed)
        }
        if (!nestedAllowed) {
            debugLog('⛔ [domain-pages] sub-domain skipped (parent hasSubDomains=false)', {
                rawDomainPath, domainId, file,
            })
            continue
        }

        const effective = getSettings(domainId)
        if (!effective.enabled) continue

        const segments = rawPath.split('/')
        const leaf = segments.pop()!
        const isIndex = leaf.toLowerCase() === 'index'

        const domainPrefixParts = getPrefixParts(domainId)
        const domainPrefixPath = domainPrefixParts.join('/')

        let fullPath = domainPrefixPath ? `/${domainPrefixPath}` : ''
        const nameParts: string[] = domainPrefixParts.map((p) => cleanName(p))

        for (const seg of segments) {
            nameParts.push(cleanName(seg))
            fullPath += `/${toRouteSegment(seg)}`
        }

        const route: NuxtPage = {
            file: resolve(domainsRoot, file),
            path: '',
            name: nameParts.concat(isIndex ? [] : [cleanName(leaf)]).join('.'),
        }

        const isChild = segments.includes(childrenDirName)

        /* ---------- CHILD ---------- */
        if (isChild) {
            if (typeof effective.layout === 'string') {
                route.meta = { layout: toNuxtLayoutName(domainId, effective.layout) }
            } else if (effective.layout === false) {
                route.meta = { layout: false }
            }
            const parentKey = normalizeKey(
                `${domainPrefixPath ? domainPrefixPath + '/' : ''}${segments
                    .slice(0, segments.indexOf(childrenDirName))
                    .join('/')}`
            )
            route.path = isIndex ? '' : toRouteSegment(leaf)
            if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, [])
            childrenMap.get(parentKey)!.push(route)

            debugLog('👶 [domain-pages] Child route generated:', {
                file, domain: domainId, path: route.path, name: route.name, parentKey, isChild: true,
            })
            continue
        }

        /* ---------- PARENT ---------- */
        route.path = isIndex
            ? fullPath || '/'
            : `${fullPath}/${toRouteSegment(leaf)}`

        /* ---------- HOME "/" (with conflict warning) ---------- */
        if (isIndex && (effective.home || effective.noPrefix)) {
            if (homeRoute && effective.home) {
                logger.warn(
                    `[domain-pages] Home route conflict: domain "${domainId}" sets home: true, ` +
                    `but "${homeDomain}" is already the home page. ` +
                    `"${domainId}" takes precedence.`
                )
            }
            if (!homeRoute || effective.home) {
                homeRoute = route
                homeDomain = domainId
            }
        }

        /* ---------- DOMAIN META ---------- */
        if (effective.middleware.length > 0) route.middleware = effective.middleware
        if (Object.keys(effective.meta).length > 0) route.meta = { ...effective.meta }
        if (typeof effective.layout === 'string') {
            route.meta = {
                ...(route.meta || {}),
                layout: toNuxtLayoutName(domainId, effective.layout),
            }
        } else if (effective.layout === false) {
            route.meta = { ...(route.meta || {}), layout: false }
        }

        /* ---------- ROUTE OVERRIDE ---------- */
        const override = effective.routes?.[rawPath.replace(/\.vue$/, '')]
        if (override) {
            if (override.path) route.path = override.path
            if (override.name) route.name = override.name
            if (override.middleware) route.middleware = override.middleware
            if (override.meta) route.meta = { ...route.meta, ...override.meta }
        }

        const key = normalizeKey(
            `${domainPrefixPath ? domainPrefixPath + '/' : ''}${rawPath}`
        )
        routeMap.set(key, route)

        debugLog('✅ [domain-pages] Route generated:', {
            file, domain: domainId, path: route.path, name: route.name, isChild: false,
        })
    }

    /* ---------- FUSION CHILDREN ---------- */
    for (const [key, children] of childrenMap.entries()) {
        const parent = routeMap.get(key)
        if (parent) {
            parent.children ??= []
            parent.children.push(...children)
            debugLog('🔗 [domain-pages] Merging children for:', {
                parentKey: key, parentPath: parent.path, parentName: parent.name,
                childrenCount: children.length,
                children: children.map((c) => ({ path: c.path, name: c.name })),
            })
        }
    }

    /* ---------- APPLY HOME "/" ---------- */
    if (homeRoute) {
        homeRoute.path = '/'
        homeRoute.name = 'home'
        homeRoute.meta = {
            ...(homeRoute.meta || {}),
            isHome: true,
            domain: homeDomain,
        }
        debugLog('🏠 [domain-pages] Home route set:', {
            domain: homeDomain, path: homeRoute.path, name: homeRoute.name,
        })
    }

    // Un seul aplatissement pour le typage, les conflits et la doc.
    const entries = flattenRouteMap(routeMap)
    const allRouteNames = entries.map(({ path, name }) => ({ path, name }))

    reportRouteConflicts(
        detectRouteConflicts(routeMap, entries),
        options.strict === true
    )

    return { routeMap, allRouteNames, entries }
}
