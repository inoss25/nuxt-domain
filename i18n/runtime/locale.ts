import {
    formatDomainSegmentKey,
    type NameFormat,
} from '../../shared/runtime/naming'

/**
 * Clé message pour un segment de chemin domaine (dossier).
 * Délègue à l'utilitaire central `formatDomainSegmentKey`.
 */
export function formatDomainSegmentForI18nKey(
    segment: string,
    format: NameFormat
): string {
    return formatDomainSegmentKey(segment, format)
}

export function localeCodeFromFilename(name: string): string | null {
    if (!name.endsWith('.json')) return null
    return name.slice(0, -'.json'.length) || null
}

const LOCALE_CODE_RE = /^[a-zA-Z0-9_-]+$/

/**
 * Déduit le code de locale à partir des segments relatifs d’un fichier JSON
 * (`en.json` ou `en/partials.json`).
 */
export function resolveLocaleCodeFromPathSegments(
    segments: string[]
): string | null {
    if (segments.length === 1) {
        return localeCodeFromFilename(segments[0]!)
    }
    if (segments.length >= 2) {
        const code = segments[0]!
        return LOCALE_CODE_RE.test(code) ? code : null
    }
    return null
}
