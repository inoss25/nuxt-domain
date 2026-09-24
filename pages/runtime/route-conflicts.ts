import type { NuxtPage } from '@nuxt/schema'
import type { ConflictReport } from '../../shared/runtime/conflicts'

function flattenRouteEntries(
  page: NuxtPage,
  parentPath: string
): Array<{ path: string; name: string; file?: string }> {
  const seg = page.path ?? ''
  let fullPath: string
  if (parentPath === '') {
    if (seg === '') fullPath = '/'
    else fullPath = seg.startsWith('/') ? seg : `/${seg}`
  } else {
    const base = parentPath === '/' ? '' : parentPath.replace(/\/$/, '')
    fullPath = seg === '' ? parentPath : `${base}/${seg}`.replace(/\/+/g, '/')
  }
  if (fullPath !== '/' && !fullPath.startsWith('/')) fullPath = `/${fullPath}`

  const rows: Array<{ path: string; name: string; file?: string }> = [
    { path: fullPath, name: (page.name as string) || '', file: page.file },
  ]
  for (const child of page.children || []) {
    rows.push(...flattenRouteEntries(child, fullPath))
  }
  return rows
}

export function detectRouteConflicts(
  routeMap: Map<string, NuxtPage>
): ConflictReport[] {
  const reports: ConflictReport[] = []
  const byPath = new Map<string, string>()
  const byName = new Map<string, string>()

  for (const route of routeMap.values()) {
    for (const entry of flattenRouteEntries(route, '')) {
      if (!entry.path) continue

      const prevPath = byPath.get(entry.path)
      if (prevPath && prevPath !== entry.file) {
        reports.push({
          kind: 'route-path',
          message: `Chemin "${entry.path}" utilisé par "${prevPath}" et "${entry.file ?? '?'}"`,
        })
      } else if (!prevPath) {
        byPath.set(entry.path, entry.file ?? '?')
      }

      if (entry.name) {
        const prevName = byName.get(entry.name)
        if (prevName && prevName !== entry.file) {
          reports.push({
            kind: 'route-name',
            message: `Nom "${entry.name}" utilisé par "${prevName}" et "${entry.file ?? '?'}"`,
          })
        } else if (!prevName) {
          byName.set(entry.name, entry.file ?? '?')
        }
      }
    }
  }

  return reports
}

export function reportRouteConflicts(
  reports: ConflictReport[],
  strict: boolean
): void {
  if (reports.length === 0) return
  for (const r of reports) {
    console.warn(`⚠️  [domain-pages] [${r.kind}] ${r.message}`)
  }
  if (strict) {
    throw new Error(
      `[domain-pages] ${reports.length} conflit(s) en mode strict — corrigez les routes ou désactivez strict.`
    )
  }
}
