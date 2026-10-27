import { logger } from './logger'
import type { ConflictReport } from './conflicts'

export type DiagnosticLevel = 'error' | 'warning'

export interface DomainDiagnostic extends ConflictReport {
    level?: DiagnosticLevel
    file?: string
    domainPath?: string
    value?: string
    suggestion?: string
}

export function formatDiagnostic(r: DomainDiagnostic): string {
    const parts = [`[${r.kind}] ${r.message}`]
    if (r.file) parts.push(`  file: ${r.file}`)
    if (r.domainPath) parts.push(`  domain: ${r.domainPath}`)
    if (r.value) parts.push(`  value: ${r.value}`)
    if (r.suggestion) parts.push(`  suggestion: ${r.suggestion}`)
    return parts.join('\n')
}

export function reportDiagnostics(
    moduleLabel: string,
    reports: DomainDiagnostic[],
    strict: boolean
): void {
    if (reports.length === 0) return
    const errors = reports.filter((r) => r.level === 'error' || !r.level)
    for (const r of reports) {
        const log = r.level === 'warning' ? logger.warn : logger.error
        log(`[${moduleLabel}] ${formatDiagnostic(r)}`)
    }
    if (strict && errors.length > 0) {
        throw new Error(
            `[${moduleLabel}] ${errors.length} error(s) in strict mode — fix the issues or disable strict.`
        )
    }
}
