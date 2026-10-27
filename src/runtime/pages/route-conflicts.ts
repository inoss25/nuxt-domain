import type { NuxtPage } from '@nuxt/schema'
import type { ConflictReport } from '../shared/conflicts'
import { logger } from '../shared/logger'
import { flattenRouteMap, type RouteEntry } from './utils'

export function detectRouteConflicts(
  routeMap: Map<string, NuxtPage>,
  /** Routes déjà aplaties (évite un second parcours de l'arbre). */
  entries: RouteEntry[] = flattenRouteMap(routeMap)
): ConflictReport[] {
  const reports: ConflictReport[] = []
  const byPath = new Map<string, string>()
  const byName = new Map<string, string>()

  for (const entry of entries) {
    if (!entry.path) continue

    const prevPath = byPath.get(entry.path)
    if (prevPath && prevPath !== entry.file) {
      reports.push({
        kind: 'route-path',
        message: `Path "${entry.path}" used by "${prevPath}" and "${entry.file ?? '?'}"`,
      })
    } else if (!prevPath) {
      byPath.set(entry.path, entry.file ?? '?')
    }

    if (entry.name) {
      const prevName = byName.get(entry.name)
      if (prevName && prevName !== entry.file) {
        reports.push({
          kind: 'route-name',
          message: `Name "${entry.name}" used by "${prevName}" and "${entry.file ?? '?'}"`,
        })
      } else if (!prevName) {
        byName.set(entry.name, entry.file ?? '?')
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
    logger.warn(`[domain-pages] [${r.kind}] ${r.message}`)
  }
  if (strict) {
    throw new Error(
      `[domain-pages] ${reports.length} conflict(s) in strict mode — fix the routes or disable strict.`
    )
  }
}
