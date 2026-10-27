import type { DomainConfig, DomainPagesOptions } from './types'
import type { NuxtPage } from '@nuxt/schema'
import {
    isIgnoredDomainPath,
    normalizeDomainParts as normalizeDomainPartsShared,
} from '../shared/paths'

/** Nom Nuxt d'un layout de domaine : `<domaine>-<chemin du layout>` en kebab-case. */
export function toNuxtLayoutName(domainId: string, layout: string): string {
    const domainName = domainId.replace(/[\\/]+/g, '-')
    const layoutName = layout.replace(/\\/g, '/').replace(/\.vue$/i, '').replace(/\//g, '-')
    return `${domainName}-${layoutName}`
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
}

export interface RouteEntry {
    path: string
    name: string
    file?: string
}

function flattenRoute(page: NuxtPage, parentPath: string, out: RouteEntry[]): void {
    const seg = page.path ?? ''
    let fullPath: string
    if (parentPath === '') {
        fullPath = seg === '' ? '/' : seg.startsWith('/') ? seg : `/${seg}`
    } else {
        const base = parentPath === '/' ? '' : parentPath.replace(/\/$/, '')
        fullPath = seg === '' ? parentPath : `${base}/${seg}`.replace(/\/+/g, '/')
    }
    if (fullPath !== '/' && !fullPath.startsWith('/')) fullPath = `/${fullPath}`

    out.push({ path: fullPath, name: (page.name as string) || '', file: page.file })
    for (const child of page.children || []) {
        flattenRoute(child, fullPath, out)
    }
}

/** Aplatis les routes (et leurs enfants) avec leur chemin complet. */
export function flattenRouteMap(routeMap: Map<string, NuxtPage>): RouteEntry[] {
    const out: RouteEntry[] = []
    for (const route of routeMap.values()) flattenRoute(route, '', out)
    return out
}

export const normalizeKey = (key: string) =>
    key.replace(/\/index$/i, '').replace(/\/$/, '')

export const toPathSegment = (seg: string) => {
    if (seg.startsWith('[...') && seg.endsWith(']'))
        return `:${seg.slice(4, -1)}*`

    if (seg.startsWith('[') && seg.endsWith(']'))
        return `:${seg.slice(1, -1)}`

    return seg
}

export const cleanName = (seg: string) =>
    seg.replace(/\[|\]|\.\.\./g, '')

export { isIgnoredDomainPath }

export function normalizeDomainParts(
    domainConfigs: Map<string, DomainConfig>,
    options: DomainPagesOptions,
    parts: string[],
    debugLog?: (...args: unknown[]) => void
): string[] {
    return normalizeDomainPartsShared(
        domainConfigs,
        options,
        parts,
        debugLog,
        'domain-pages'
    )
}
