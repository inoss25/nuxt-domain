import type { DomainConfig, DomainPagesOptions } from './types'
import {
    isIgnoredDomainPath,
    normalizeDomainParts as normalizeDomainPartsShared,
} from '../../shared/runtime/paths'
import {
    loadDomainConfigs as loadDomainConfigsShared,
    type LoadDomainConfigsResult,
} from '../../shared/runtime/config-loader'

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
