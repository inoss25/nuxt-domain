import { resolve } from 'node:path'
import type { DomainDiagnostic } from './diagnostics'
import {
    conformsToNameFormat,
    formatDomainSegmentKey,
    suggestNameFormatFix,
    type NameFormat,
} from './naming'
import { isIgnoredDomainPath, toPosixPath } from './paths'
import { getDomainTreeScan, type DomainScanCache } from './scan'

export interface ValidateDomainNamesParams {
    domainsRoot: string
    domainNameFormat?: NameFormat
    domainKeyFormat: NameFormat
    detectDuplicates: boolean
    scanCache?: DomainScanCache
}

/**
 * Valide les noms de dossiers domaine et détecte les collisions de clés i18n
 * après application de `domainKeyFormat` (sans renommer les dossiers).
 */
export async function validateDomainFolderNames(
    params: ValidateDomainNamesParams
): Promise<DomainDiagnostic[]> {
    const {
        domainsRoot,
        domainNameFormat,
        domainKeyFormat,
        detectDuplicates,
        scanCache,
    } = params

    const reports: DomainDiagnostic[] = []

    if (!domainNameFormat && !detectDuplicates) return reports

    const { configFiles } = await getDomainTreeScan(domainsRoot, scanCache)

    /** chemin de clé i18n (segments formatés) → chemins disque distincts */
    const i18nPathOwners = new Map<
        string,
        Array<{ domainPath: string; configFile: string }>
    >()

    for (const file of configFiles) {
        const posix = toPosixPath(file)
        const parts = posix.split('/').filter(Boolean)
        if (parts.length < 2) continue
        const rawParts = parts.slice(0, -1)
        if (isIgnoredDomainPath(rawParts)) continue

        const domainPath = rawParts.join('/')
        const absConfig = resolve(domainsRoot, file)

        for (const segment of rawParts) {
            if (domainNameFormat) {
                if (!conformsToNameFormat(segment, domainNameFormat)) {
                    reports.push({
                        kind: 'domain-name',
                        level: 'error',
                        message: `Folder segment "${segment}" does not match domainNameFormat (${domainNameFormat}).`,
                        file: absConfig,
                        domainPath,
                        value: segment,
                        suggestion: `Rename the folder to "${suggestNameFormatFix(segment, domainNameFormat)}" (manually — the module never renames).`,
                    })
                }
            }

        }

        if (detectDuplicates) {
            const i18nPathKey = rawParts
                .map((s) => formatDomainSegmentKey(s, domainKeyFormat))
                .join('.')
            const list = i18nPathOwners.get(i18nPathKey) ?? []
            list.push({ domainPath, configFile: absConfig })
            i18nPathOwners.set(i18nPathKey, list)
        }
    }

    if (detectDuplicates) {
        for (const [i18nPathKey, owners] of i18nPathOwners) {
            const uniquePaths = new Set(owners.map((o) => o.domainPath))
            if (uniquePaths.size <= 1) continue

            const detail = owners
                .map((o) => `"${o.domainPath}" (${o.configFile})`)
                .join(' ; ')

            reports.push({
                kind: 'domain-name',
                level: 'error',
                message: `i18n key collision "${i18nPathKey}" (domainKeyFormat: ${domainKeyFormat}): several distinct domain paths map to it.`,
                value: i18nPathKey,
                suggestion: `Rename the affected folders or adjust domain.i18n.domainKeyFormat. Details: ${detail}`,
            })
        }
    }

    return reports
}
