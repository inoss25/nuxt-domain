import { isAbsolute, relative } from 'node:path'
import type { DomainConfigPathFields, DomainPathsOptions } from './types'

export const toPosixPath = (p: string) => p.replace(/\\/g, '/')

export function fileIsUnderRoot(file: string, root: string): boolean {
  const rel = relative(root, file)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/** Dossiers réservés (ex. `_template`) — ignorés par les modules domaine. */
export function isIgnoredDomainPath(parts: string[]): boolean {
    return parts.some((p) => p.startsWith('_'))
}

export function getSubDomainsDirName(
    parentConfig: DomainConfigPathFields | undefined,
    options: DomainPathsOptions
): string {
    return (
        parentConfig?.subDomainsDirName ??
        options.subDomainsDirName ??
        'domains'
    )
}

/**
 * Normalise un chemin de domaine en ignorant le dossier « sous-domaines »
 * (par défaut `domains`) lorsqu'un parent a `hasSubDomains: true`.
 */
export function normalizeDomainParts(
    domainConfigs: Map<string, DomainConfigPathFields>,
    options: DomainPathsOptions,
    parts: string[],
    debugLog?: (...args: unknown[]) => void,
    moduleLabel = 'domain'
): string[] {
    const cleaned = parts.filter(Boolean)
    if (cleaned.length <= 1) return cleaned

    const normalized: string[] = [cleaned[0]!]

    for (let i = 1; i < cleaned.length; i++) {
        const parentId = normalized.join('/')
        const parentCfg = domainConfigs.get(parentId)

        if (parentCfg?.hasSubDomains === true) {
            const marker = getSubDomainsDirName(parentCfg, options)
            if (cleaned[i] === marker) {
                debugLog?.(`🧩 [${moduleLabel}] ignore marker`, {
                    parentId,
                    marker,
                    raw: cleaned.join('/'),
                })
                continue
            }
        }

        normalized.push(cleaned[i]!)
    }

    if (normalized.join('/') !== cleaned.join('/')) {
        debugLog?.(`🧩 [${moduleLabel}] domaine normalisé`, {
            raw: cleaned.join('/'),
            normalized: normalized.join('/'),
        })
    }

    return normalized
}
