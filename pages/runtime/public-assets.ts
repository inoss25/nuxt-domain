import { resolve } from 'node:path'
import type { DomainConfig, DomainPagesOptions } from './types'
import { isIgnoredDomainPath, normalizeDomainParts } from './utils'

export interface DomainPublicAssetDir {
    dir: string
    baseURL: string
    fallthrough: boolean
    maxAge: number
}

/** Convert each domain's `public/` directory to an isolated Nitro public asset path. */
export function getDomainPublicAssets(
    domainsRoot: string,
    publicDirs: string[],
    domainConfigs: Map<string, DomainConfig>,
    options: DomainPagesOptions,
    debugLog: (...args: unknown[]) => void
): DomainPublicAssetDir[] {
    const publicAssets: DomainPublicAssetDir[] = []

    for (const dir of publicDirs) {
        const domainPath = dir.replace(/[\\/]public$/, '')
        const rawDomainParts = domainPath.split(/[\\/]/).filter(Boolean)
        if (rawDomainParts.length === 0 || isIgnoredDomainPath(rawDomainParts)) continue

        const domainId = normalizeDomainParts(
            domainConfigs,
            options,
            rawDomainParts,
            debugLog
        )
            .filter(Boolean)
            .join('/')
        if (!domainId) continue

        const domainParts = domainId.split('/')
        if (!domainConfigs.has(domainId)) continue

        let ancestorsAllowed = true
        for (let index = 1; index < domainParts.length; index++) {
            const parentId = domainParts.slice(0, index).join('/')
            const parentConfig = domainConfigs.get(parentId)
            if (
                parentConfig?.hasSubDomains !== true ||
                parentConfig.enabled === false
            ) {
                ancestorsAllowed = false
                break
            }
        }

        const domainDisabled = domainParts.some((_, index) => {
            const id = domainParts.slice(0, index + 1).join('/')
            return domainConfigs.get(id)?.enabled === false
        })
        if (!ancestorsAllowed || domainDisabled) continue

        const urlDomain = domainParts
            .map((part) => encodeURIComponent(part))
            .join('/')
        const asset = {
            dir: resolve(domainsRoot, dir),
            baseURL: `domains/${urlDomain}`,
            fallthrough: true,
            maxAge: 0,
        }
        publicAssets.push(asset)
        debugLog('📦 [domain-pages] assets publics enregistrés', {
            domain: domainId,
            dir: asset.dir,
            baseURL: `/${asset.baseURL}/`,
        })
    }

    return publicAssets
}
