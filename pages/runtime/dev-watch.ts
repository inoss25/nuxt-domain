import { updateTemplates } from 'nuxt/kit'
import type { Nuxt, NuxtPage } from '@nuxt/schema'
import { relative } from 'node:path'
import { fileIsUnderRoot } from '../../shared/runtime/paths'
import type { DomainConfig, DomainPagesOptions } from './types'
import { generateDomainRoutes } from './route-generator'
import { writeRouteDoc } from './route-doc'
import { isIgnoredDomainPath } from './utils'

export { fileIsUnderRoot }

export function isDomainPageRelativePath(
    relPath: string,
    extensions: string[]
): boolean {
    const parts = relPath.split('/').filter(Boolean)
    if (isIgnoredDomainPath(parts)) return false
    if (!relPath.includes('/pages/')) return false
    return extensions.some((ext) => relPath.endsWith(ext))
}

export function isDomainRouteFile(
    file: string | undefined,
    domainsRoot: string
): boolean {
    return Boolean(file && fileIsUnderRoot(file, domainsRoot))
}

export function removeDomainRoutes(
    pages: NuxtPage[],
    domainsRoot: string
): NuxtPage[] {
    return pages.filter((page) => !isDomainRouteFile(page.file, domainsRoot))
}

export interface RefreshDomainPagesContext {
    nuxt: Nuxt
    rootDir: string
    domainsRoot: string
    domainConfigs: Map<string, DomainConfig>
    options: DomainPagesOptions
    routeDoc: { enabled: boolean; outDir: string; fileName: string }
    debugLog: (...args: any[]) => void
}

/** Régénère les routes domaine dans `app.pages` et met à jour `routes.mjs`. */
export async function refreshDomainPages(
    ctx: RefreshDomainPagesContext
): Promise<boolean> {
    const app = ctx.nuxt.apps.default
    if (!app?.pages) return false

    const { routeMap, allRouteNames } = await generateDomainRoutes(
        ctx.domainsRoot,
        ctx.domainConfigs,
        ctx.options,
        ctx.debugLog
    )

    app.pages = removeDomainRoutes(app.pages, ctx.domainsRoot)
    for (const route of routeMap.values()) {
        app.pages.push(route)
    }

    writeRouteDoc({
        rootDir: ctx.rootDir,
        routeDoc: ctx.routeDoc,
        routeMap,
        allRouteNames,
        debugLog: ctx.debugLog,
    })

    await updateTemplates({
        filter: (template) => template.filename === 'routes.mjs',
    })

    ctx.debugLog('🔄 [domain-pages] routes domaine régénérées', {
        count: routeMap.size,
    })

    return true
}
