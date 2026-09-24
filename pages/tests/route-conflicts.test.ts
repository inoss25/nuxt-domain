import { describe, it, expect } from 'vitest'
import type { NuxtPage } from '@nuxt/schema'
import { detectRouteConflicts, reportRouteConflicts } from '../runtime/route-conflicts'

describe('detectRouteConflicts', () => {
  it('détecte les chemins dupliqués', () => {
    const routeMap = new Map<string, NuxtPage>([
      [
        'a',
        {
          path: '/dup',
          name: 'a',
          file: '/app/domains/a/pages/index.vue',
        },
      ],
      [
        'b',
        {
          path: '/dup',
          name: 'b',
          file: '/app/domains/b/pages/index.vue',
        },
      ],
    ])

    const conflicts = detectRouteConflicts(routeMap)
    expect(conflicts.some((c) => c.kind === 'route-path')).toBe(true)
  })

  it('lève en mode strict', () => {
    const routeMap = new Map<string, NuxtPage>([
      ['a', { path: '/x', name: 'n1', file: '/a.vue' }],
      ['b', { path: '/x', name: 'n2', file: '/b.vue' }],
    ])
    expect(() =>
      reportRouteConflicts(detectRouteConflicts(routeMap), true)
    ).toThrow(/mode strict/)
  })
})
