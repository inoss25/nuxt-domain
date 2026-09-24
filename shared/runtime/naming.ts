/**
 * Conventions de nommage partagées (domaines, clés JSON, clés i18n dérivées).
 */

export const NAME_FORMATS = [
    'snake_case',
    'camelCase',
    'PascalCase',
    'kebab-case',
    'preserve',
] as const

export type NameFormat = (typeof NAME_FORMATS)[number]

const FORMAT_LABEL = NAME_FORMATS.join(' | ')

export class NameFormatError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'NameFormatError'
    }
}

export function isNameFormat(value: unknown): value is NameFormat {
    return (
        typeof value === 'string' &&
        (NAME_FORMATS as readonly string[]).includes(value)
    )
}

/** Résout une option ; lève si valeur non reconnue. */
export function resolveNameFormat(
    value: unknown,
    fallback: NameFormat,
    optionLabel: string
): NameFormat {
    if (value === undefined || value === null) return fallback
    if (isNameFormat(value)) return value
    throw new NameFormatError(
        `[nuxt-domain] Option "${optionLabel}" invalide: "${String(value)}". Valeurs acceptées: ${FORMAT_LABEL}.`
    )
}

/** Optionnel : undefined si absent, sinon résout ou lève. */
export function optionalNameFormat(
    value: unknown,
    optionLabel: string
): NameFormat | undefined {
    if (value === undefined || value === null) return undefined
    return resolveNameFormat(value, 'snake_case', optionLabel)
}

/**
 * Découpe un identifiant en tokens (espaces, tirets, underscores, camelCase).
 * Les lettres non ASCII sont conservées dans le token (pas de translittération).
 */
export function tokenizeName(input: string): string[] {
    const trimmed = input.trim()
    if (!trimmed) return []

    const spaced = trimmed
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[\s_-]+/g, ' ')

    return spaced
        .split(' ')
        .map((t) => t.trim())
        .filter(Boolean)
}

function lowerAscii(s: string): string {
    return s.replace(/[A-Z]/g, (c) => c.toLowerCase())
}

function capitalize(s: string): string {
    if (!s) return s
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function tokensToSnake(tokens: string[]): string {
    return tokens.map((t) => lowerAscii(t)).join('_')
}

function tokensToKebab(tokens: string[]): string {
    return tokens.map((t) => lowerAscii(t)).join('-')
}

function tokensToCamel(tokens: string[]): string {
    if (tokens.length === 0) return ''
    const [first, ...rest] = tokens
    return (
        lowerAscii(first!) +
        rest.map((t) => capitalize(lowerAscii(t))).join('')
    )
}

function tokensToPascal(tokens: string[]): string {
    return tokens.map((t) => capitalize(lowerAscii(t))).join('')
}

/** Convertit un nom vers le format cible (ne valide pas le dossier source). */
export function formatName(input: string, format: NameFormat): string {
    if (format === 'preserve') return input
    const tokens = tokenizeName(input)
    if (tokens.length === 0) return ''
    switch (format) {
        case 'snake_case':
            return tokensToSnake(tokens)
        case 'kebab-case':
            return tokensToKebab(tokens)
        case 'camelCase':
            return tokensToCamel(tokens)
        case 'PascalCase':
            return tokensToPascal(tokens)
        default:
            return input
    }
}

const SEGMENT_PATTERNS: Record<Exclude<NameFormat, 'preserve'>, RegExp> = {
    snake_case: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
    'kebab-case': /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    camelCase: /^[a-z][a-zA-Z0-9]*$/,
    PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
}

/**
 * Vérifie qu'un segment respecte la convention.
 * `preserve` : non vide, pas de `/`, pas de segments `_` réservés gérés ailleurs.
 */
export function conformsToNameFormat(
    segment: string,
    format: NameFormat
): boolean {
    if (!segment || segment.includes('/')) return false
    if (format === 'preserve') return segment.length > 0
    if (/^\d/.test(segment)) return false
    return SEGMENT_PATTERNS[format].test(segment)
}

export function suggestNameFormatFix(
    segment: string,
    format: NameFormat
): string {
    const formatted = formatName(segment, format)
    return formatted || segment
}

/** Clé i18n pour un segment de dossier domaine. */
export function formatDomainSegmentKey(
    segment: string,
    format: NameFormat
): string {
    return formatName(segment, format)
}

/**
 * Rétrocompat : `domainSegmentKeyFormat` historique.
 */
export function resolveDomainKeyFormat(options: {
    domainKeyFormat?: NameFormat
    domainSegmentKeyFormat?: 'snake_case' | 'preserve'
}): NameFormat {
    if (options.domainKeyFormat !== undefined) {
        return options.domainKeyFormat
    }
    const legacy = options.domainSegmentKeyFormat ?? 'snake_case'
    if (legacy === 'preserve') return 'preserve'
    return 'snake_case'
}
