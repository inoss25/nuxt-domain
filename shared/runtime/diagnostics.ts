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
    if (r.file) parts.push(`  fichier: ${r.file}`)
    if (r.domainPath) parts.push(`  domaine: ${r.domainPath}`)
    if (r.value) parts.push(`  valeur: ${r.value}`)
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
        const icon = r.level === 'warning' ? '⚠️' : '❌'
        console.warn(`${icon}  [${moduleLabel}] ${formatDiagnostic(r)}`)
    }
    if (strict && errors.length > 0) {
        throw new Error(
            `[${moduleLabel}] ${errors.length} erreur(s) en mode strict — corrigez les problèmes ou désactivez strict.`
        )
    }
}
