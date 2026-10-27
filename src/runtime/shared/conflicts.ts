export interface ConflictReport {
  kind:
    | 'route-path'
    | 'route-name'
    | 'i18n-key'
    | 'home'
    | 'domain-name'
    | 'i18n-key-format'
    | 'i18n-structure'
    | 'i18n-interpolation'
    | 'i18n-merge-type'
  message: string
}

export function formatConflictError(reports: ConflictReport[]): string {
  const lines = reports.map((r) => `  • [${r.kind}] ${r.message}`)
  return `[domain] ${reports.length} conflict(s) detected (strict mode):\n${lines.join('\n')}`
}
