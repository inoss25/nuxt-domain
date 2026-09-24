import type { DomainDiagnostic } from '../../shared/runtime/diagnostics'
import {
    conformsToNameFormat,
    suggestNameFormatFix,
    type NameFormat,
} from '../../shared/runtime/naming'
import { isPlainObject } from './merge'

/** Variables nommées Vue I18n / @intlify : `{name}` (hors `\{` échappé). */
const NAMED_INTERPOLATION_RE = /(?<!\\)\{([a-zA-Z_]\w*)\}/g

export function extractInterpolationVariables(value: string): string[] {
    const vars = new Set<string>()
    let m: RegExpExecArray | null
    const re = new RegExp(NAMED_INTERPOLATION_RE.source, 'g')
    while ((m = re.exec(value)) !== null) {
        vars.add(m[1]!)
    }
    return [...vars].sort()
}

export function validateJsonKeyFormat(
    obj: Record<string, unknown>,
    keyFormat: NameFormat,
    file: string,
    keyPrefix = ''
): DomainDiagnostic[] {
    const reports: DomainDiagnostic[] = []
    for (const [key, value] of Object.entries(obj)) {
        const path = keyPrefix ? `${keyPrefix}.${key}` : key
        if (!conformsToNameFormat(key, keyFormat)) {
            reports.push({
                kind: 'i18n-key-format',
                level: 'error',
                message: `La clé "${path}" ne respecte pas keyFormat (${keyFormat}).`,
                file,
                value: key,
                suggestion: `Utilisez "${suggestNameFormatFix(key, keyFormat)}" ou désactivez domain.i18n.keyFormat.`,
            })
        }
        if (isPlainObject(value)) {
            reports.push(
                ...validateJsonKeyFormat(value, keyFormat, file, path)
            )
        }
    }
    return reports
}

export function collectLeafPaths(
    obj: Record<string, unknown>,
    prefix = ''
): Map<string, unknown> {
    const leaves = new Map<string, unknown>()
    const walk = (o: Record<string, unknown>, p: string) => {
        for (const [k, v] of Object.entries(o)) {
            const next = p ? `${p}.${k}` : k
            if (isPlainObject(v)) walk(v, next)
            else leaves.set(next, v)
        }
    }
    walk(obj, prefix)
    return leaves
}

export type LocaleStructureMode = false | 'missing' | 'all'

export function validateLocaleStructures(
    byLocale: Map<string, Record<string, unknown>>,
    mode: LocaleStructureMode,
    referenceLocale?: string
): DomainDiagnostic[] {
    if (!mode) return []
    const reports: DomainDiagnostic[] = []
    const codes = [...byLocale.keys()].sort()
    if (codes.length < 2) return reports

    const ref =
        referenceLocale && byLocale.has(referenceLocale)
            ? referenceLocale
            : codes[0]!
    const refLeaves = collectLeafPaths(byLocale.get(ref) ?? {})

    for (const code of codes) {
        if (code === ref) continue
        const leaves = collectLeafPaths(byLocale.get(code) ?? {})

        for (const key of refLeaves.keys()) {
            if (!leaves.has(key)) {
                reports.push({
                    kind: 'i18n-structure',
                    level: 'error',
                    message: `Clé "${key}" présente en "${ref}" mais absente en "${code}".`,
                    suggestion: `Ajoutez "${key}" dans les fichiers JSON de la locale "${code}".`,
                })
            }
        }

        if (mode === 'all') {
            for (const key of leaves.keys()) {
                if (!refLeaves.has(key)) {
                    reports.push({
                        kind: 'i18n-structure',
                        level: 'warning',
                        message: `Clé "${key}" présente en "${code}" mais absente en "${ref}".`,
                        suggestion: `Ajoutez la clé dans "${ref}" ou supprimez-la de "${code}" si elle est obsolète.`,
                    })
                }
            }
        }
    }

    return reports
}

export function validateInterpolationAcrossLocales(
    byLocale: Map<string, Record<string, unknown>>,
    referenceLocale?: string
): DomainDiagnostic[] {
    const reports: DomainDiagnostic[] = []
    const codes = [...byLocale.keys()].sort()
    if (codes.length < 2) return reports

    const ref =
        referenceLocale && byLocale.has(referenceLocale)
            ? referenceLocale
            : codes[0]!
    const refLeaves = collectLeafPaths(byLocale.get(ref) ?? {})

    for (const key of refLeaves.keys()) {
        const refVal = refLeaves.get(key)
        if (typeof refVal !== 'string') continue
        const refVars = extractInterpolationVariables(refVal)

        for (const code of codes) {
            if (code === ref) continue
            const leaves = collectLeafPaths(byLocale.get(code) ?? {})
            const val = leaves.get(key)
            if (typeof val !== 'string') continue
            const vars = extractInterpolationVariables(val)
            const refSet = refVars.join(',')
            const set = vars.join(',')
            if (refSet !== set) {
                reports.push({
                    kind: 'i18n-interpolation',
                    level: 'error',
                    message: `Variables d'interpolation différentes pour "${key}" : "${ref}" {${refVars.join(', ')}} vs "${code}" {${vars.join(', ')}}.`,
                    suggestion: `Alignez les placeholders nommés (syntaxe {name}) entre les locales.`,
                })
            }
        }
    }

    return reports
}

export function detectMergeTypeConflict(
    existing: unknown,
    incoming: unknown,
    keyPath: string,
    prevSource: string,
    nextSource: string
): DomainDiagnostic | null {
    if (existing === undefined) return null
    const exObj = isPlainObject(existing)
    const inObj = isPlainObject(incoming)
    if (exObj && inObj) return null
    if (exObj !== inObj) {
        return {
            kind: 'i18n-merge-type',
            level: 'error',
            message: `Conflit de type sur "${keyPath}" : objet vs valeur scalaire lors de la fusion.`,
            value: keyPath,
            suggestion: `Harmonisez la structure entre "${prevSource}" et "${nextSource}" (même nesting JSON).`,
        }
    }
    return null
}
