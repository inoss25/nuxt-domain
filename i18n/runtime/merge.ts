export function isPlainObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Fusion profonde : objets imbriqués fusionnés ; scalaires / tableaux : la valeur de droite gagne. */
export function deepMerge(
    base: Record<string, unknown>,
    overlay: Record<string, unknown>
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base }
    for (const key of Object.keys(overlay)) {
        const b = base[key]
        const o = overlay[key]
        if (isPlainObject(b) && isPlainObject(o)) {
            out[key] = deepMerge(b, o)
        } else {
            out[key] = o
        }
    }
    return out
}

export interface MergeAtDomainPathContext {
    source: string
    onTypeConflict?: (keyPath: string, prev: unknown, next: unknown) => void
}

/** Place `value` sous target[p0][p1]… (fusion avec l’existant). */
export function mergeAtDomainPath(
    target: Record<string, unknown>,
    domainSegments: string[],
    value: Record<string, unknown>,
    ctx?: MergeAtDomainPathContext
) {
    if (domainSegments.length === 0) {
        const m = deepMerge(target, value)
        for (const k of Object.keys(m)) target[k] = m[k]
        return
    }
    let cur: Record<string, unknown> = target
    for (let i = 0; i < domainSegments.length; i++) {
        const seg = domainSegments[i]!
        const keyPath = [...domainSegments.slice(0, i + 1)].join('.')
        if (i === domainSegments.length - 1) {
            const prev = cur[seg]
            if (prev !== undefined) {
                const exObj = isPlainObject(prev)
                const inObj = isPlainObject(value)
                if (exObj !== inObj) {
                    ctx?.onTypeConflict?.(keyPath, prev, value)
                    return
                }
            }
            const merged =
                isPlainObject(prev) && isPlainObject(value)
                    ? deepMerge(prev, value)
                    : value
            cur[seg] = merged
        } else {
            const next = cur[seg]
            if (next !== undefined && !isPlainObject(next)) {
                ctx?.onTypeConflict?.(keyPath, next, value)
                return
            }
            if (!isPlainObject(next)) {
                cur[seg] = {}
            }
            cur = cur[seg] as Record<string, unknown>
        }
    }
}
