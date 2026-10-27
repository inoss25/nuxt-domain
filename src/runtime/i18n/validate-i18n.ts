import type { DomainDiagnostic } from '../shared/diagnostics'
import {
    conformsToNameFormat,
    suggestNameFormatFix,
    type NameFormat,
} from '../shared/naming'
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
    keyPrefix = '',
    reports: DomainDiagnostic[] = []
): DomainDiagnostic[] {
    for (const [key, value] of Object.entries(obj)) {
        const path = keyPrefix ? `${keyPrefix}.${key}` : key
        if (!conformsToNameFormat(key, keyFormat)) {
            reports.push({
                kind: 'i18n-key-format',
                level: 'error',
                message: `Key "${path}" does not match keyFormat (${keyFormat}).`,
                file,
                value: key,
                suggestion: `Use "${suggestNameFormatFix(key, keyFormat)}" or disable domain.i18n.keyFormat.`,
            })
        }
        if (isPlainObject(value)) {
            validateJsonKeyFormat(value, keyFormat, file, path, reports)
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

/** Feuilles de chaque locale, à calculer une fois et partager entre validations. */
export type LeavesByLocale = Map<string, Map<string, unknown>>

export function collectLeavesByLocale(
    byLocale: Map<string, Record<string, unknown>>
): LeavesByLocale {
    const out: LeavesByLocale = new Map()
    for (const [code, data] of byLocale) out.set(code, collectLeafPaths(data))
    return out
}

function leavesOf(
    byLocale: Map<string, Record<string, unknown>>,
    leavesByLocale: LeavesByLocale | undefined,
    code: string
): Map<string, unknown> {
    return (
        leavesByLocale?.get(code) ?? collectLeafPaths(byLocale.get(code) ?? {})
    )
}

export function validateLocaleStructures(
    byLocale: Map<string, Record<string, unknown>>,
    mode: LocaleStructureMode,
    referenceLocale?: string,
    leavesByLocale?: LeavesByLocale
): DomainDiagnostic[] {
    if (!mode) return []
    const reports: DomainDiagnostic[] = []
    const codes = [...byLocale.keys()].sort()
    if (codes.length < 2) return reports

    const ref =
        referenceLocale && byLocale.has(referenceLocale)
            ? referenceLocale
            : codes[0]!
    const refLeaves = leavesOf(byLocale, leavesByLocale, ref)

    for (const code of codes) {
        if (code === ref) continue
        const leaves = leavesOf(byLocale, leavesByLocale, code)

        for (const key of refLeaves.keys()) {
            if (!leaves.has(key)) {
                reports.push({
                    kind: 'i18n-structure',
                    level: 'error',
                    message: `Key "${key}" exists in "${ref}" but is missing in "${code}".`,
                    suggestion: `Add "${key}" to the JSON files of locale "${code}".`,
                })
            }
        }

        if (mode === 'all') {
            for (const key of leaves.keys()) {
                if (!refLeaves.has(key)) {
                    reports.push({
                        kind: 'i18n-structure',
                        level: 'warning',
                        message: `Key "${key}" exists in "${code}" but is missing in "${ref}".`,
                        suggestion: `Add the key to "${ref}" or remove it from "${code}" if it is obsolete.`,
                    })
                }
            }
        }
    }

    return reports
}

export function validateInterpolationAcrossLocales(
    byLocale: Map<string, Record<string, unknown>>,
    referenceLocale?: string,
    leavesByLocale?: LeavesByLocale
): DomainDiagnostic[] {
    const reports: DomainDiagnostic[] = []
    const codes = [...byLocale.keys()].sort()
    if (codes.length < 2) return reports

    const ref =
        referenceLocale && byLocale.has(referenceLocale)
            ? referenceLocale
            : codes[0]!
    const refLeaves = leavesOf(byLocale, leavesByLocale, ref)
    // Calculées une fois par locale (et non une fois par clé de référence).
    const otherLocales = codes
        .filter((code) => code !== ref)
        .map((code) => ({ code, leaves: leavesOf(byLocale, leavesByLocale, code) }))

    for (const [key, refVal] of refLeaves) {
        if (typeof refVal !== 'string') continue
        const refVars = extractInterpolationVariables(refVal)
        const refSet = refVars.join(',')

        for (const { code, leaves } of otherLocales) {
            const val = leaves.get(key)
            if (typeof val !== 'string') continue
            const vars = extractInterpolationVariables(val)
            const set = vars.join(',')
            if (refSet !== set) {
                reports.push({
                    kind: 'i18n-interpolation',
                    level: 'error',
                    message: `Interpolation variables differ for "${key}": "${ref}" {${refVars.join(', ')}} vs "${code}" {${vars.join(', ')}}.`,
                    suggestion: `Align named placeholders ({name} syntax) across locales.`,
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
            message: `Type conflict on "${keyPath}": object vs scalar value while merging.`,
            value: keyPath,
            suggestion: `Use the same structure in "${prevSource}" and "${nextSource}" (same JSON nesting).`,
        }
    }
    return null
}
